#!/usr/bin/env node
/**
 * summarize.js — Generate an aggregate summary report across multiple test runs.
 *
 * Usage:
 *   node src/summarize.js [options]
 *
 * Options:
 *   --output,  -o  Directory containing run folders to scan  (default: ./output)
 *   --count,   -n  Number of most-recent runs to include     (default: all)
 *   --from,    -f  Include runs at-or-after this folder name (e.g. 2026-04-14/13.00)
 *   --prompt,  -p  Prompt filter: control | training | both  (default: both)
 *   --save,    -s  Write output to a file instead of stdout
 *   --help,    -h  Print this help message
 *
 * Examples:
 *   # Last 5 runs, both prompts, print to stdout
 *   node src/summarize.js --count 5
 *
 *   # All runs since a specific date, save to file
 *   node src/summarize.js --from 2026-04-14/14.20 --save
 *
 *   # Training prompt only, last 8 runs
 *   node src/summarize.js --prompt training --count 8
 *
 *   # Scan a different output directory
 *   node src/summarize.js --output /path/to/other/output --count 10
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── CLI ─────────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    output: { type: 'string',  short: 'o', default: resolve(ROOT, 'output') },
    count:  { type: 'string',  short: 'n', default: '0' },   // 0 = all
    from:   { type: 'string',  short: 'f', default: '' },
    prompt: { type: 'string',  short: 'p', default: 'both' },
    save:   { type: 'boolean', short: 's', default: false },
    help:   { type: 'boolean', short: 'h', default: false },
  },
  allowPositionals: false,
});

if (values.help) {
  // Re-print the header comment as usage text
  console.log(`
summarize.js — Generate an aggregate summary report across multiple test runs.

Usage:
  node src/summarize.js [options]

Options:
  --output,  -o  Directory containing run folders to scan  (default: ./output)
  --count,   -n  Number of most-recent runs to include     (default: all)
  --from,    -f  Include runs at-or-after this folder name (e.g. 2026-04-14/13.00)
  --prompt,  -p  Prompt filter: control | training | both  (default: both)
  --save,    -s  Write output to a file instead of stdout
  --help,    -h  Print this help message

Examples:
  node src/summarize.js --count 5
  node src/summarize.js --from 2026-04-14/14.20 --save
  node src/summarize.js --prompt training --count 8
  node src/summarize.js --output /path/to/other/output --count 10
`);
  process.exit(0);
}

const outputDir   = resolve(values.output);
const maxCount    = parseInt(values.count, 10) || 0;
const fromFilter  = values.from.trim();
const promptFilter = values.prompt;
const saveToFile  = values.save;

const VALID_PROMPTS = ['control', 'training', 'both'];
if (!VALID_PROMPTS.includes(promptFilter)) {
  console.error(`Error: --prompt must be one of: ${VALID_PROMPTS.join(', ')}`);
  process.exit(1);
}

const promptKeys = promptFilter === 'both' ? ['control', 'training'] : [promptFilter];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Enumerate timestamped run directories
  let entries;
  try {
    entries = await readdir(outputDir, { withFileTypes: true });
  } catch {
    console.error(`Cannot read output directory: ${outputDir}`);
    process.exit(1);
  }

  // Keep only directories matching the YYYY-MM-DD-HH.MM pattern, sorted chronologically
  // Collect run directories from both new (YYYY-MM-DD/HH.MM) and legacy (YYYY-MM-DD-HH.MM) formats
  const LEGACY_RE = /^\d{4}-\d{2}-\d{2}-\d{2}\.\d{2}$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{2}\.\d{2}$/;

  let runDirNames = [];

  for (const e of entries) {
    if (!e.isDirectory()) continue;

    // New format: date dirs containing time subdirs
    if (DATE_RE.test(e.name)) {
      const dateDir = resolve(outputDir, e.name);
      let subs;
      try { subs = await readdir(dateDir, { withFileTypes: true }); } catch { continue; }
      for (const sub of subs) {
        if (sub.isDirectory() && TIME_RE.test(sub.name)) {
          runDirNames.push(`${e.name}/${sub.name}`);
        }
      }
    }

    // Legacy format
    if (LEGACY_RE.test(e.name)) {
      runDirNames.push(e.name);
    }
  }

  runDirNames.sort(); // lexicographic == chronological for both formats

  if (runDirNames.length === 0) {
    console.error(`No test-run directories found in: ${outputDir}`);
    process.exit(1);
  }

  // 2. Apply --from filter (keep runs whose name >= fromFilter)
  if (fromFilter) {
    const idx = runDirNames.findIndex(d => d >= fromFilter);
    if (idx === -1) {
      console.error(`No runs found at or after "${fromFilter}".`);
      console.error(`Available runs: ${runDirNames.join(', ')}`);
      process.exit(1);
    }
    runDirNames = runDirNames.slice(idx);
  }

  // 3. Apply --count (take the N most recent)
  if (maxCount > 0 && runDirNames.length > maxCount) {
    runDirNames = runDirNames.slice(-maxCount);
  }

  // 4. Load report.json for each selected directory
  const runs = [];
  for (const name of runDirNames) {
    const reportPath = join(outputDir, name, 'report.json');
    if (!existsSync(reportPath)) {
      console.warn(`[skip] ${name}: no report.json`);
      continue;
    }
    try {
      const raw  = await readFile(reportPath, 'utf-8');
      const json = JSON.parse(raw);
      // Only include runs that have at least one of the requested prompts
      const hasRequestedPrompt = promptKeys.some(pk => json.prompts?.[pk]);
      if (!hasRequestedPrompt) {
        console.warn(`[skip] ${name}: none of the requested prompt(s) found`);
        continue;
      }
      runs.push({ name, report: json });
    } catch (err) {
      console.warn(`[skip] ${name}: failed to parse report.json — ${err.message}`);
    }
  }

  if (runs.length === 0) {
    console.error('No valid runs to summarise.');
    process.exit(1);
  }

  // 5. Build and emit the summary
  const md = renderSummary(runs, promptKeys, outputDir);

  if (saveToFile) {
    const ts = buildTimestamp();
    const outPath = join(outputDir, `summary-${ts}.md`);
    await writeFile(outPath, md, 'utf-8');
    console.error(`Summary written to: ${outPath}`);
  } else {
    process.stdout.write(md);
  }
}

// ─── Metrics extraction ───────────────────────────────────────────────────────

/**
 * Pull the key scalar metrics out of a single prompt's data block.
 */
function extractMetrics(data) {
  return {
    totalIterations:  data.totalIterations  ?? null,
    loc:              data.linesOfCode?.average ?? null,
    fixesAvg:         data.fixAttempts?.average ?? null,
    fixesTotal:       data.fixAttempts?.total   ?? null,
    cleanOnFirstTry:  data.fixAttempts?.iterationsCleanOnFirstTry ?? null,
    inlineTotal:      data.inlineStyles?.totalAcrossIterations  ?? null,
    inlineAvg:        data.inlineStyles?.averagePerIteration    ?? null,
    boxInline:        data.inlineStyles?.byComponent?.Box       ?? 0,
    axeTotal:         data.accessibility?.totalAxeViolations   ?? null,
    axeAvg:           data.accessibility?.averageAxeViolations  ?? null,
    fcpMs:            data.performance?.avgFcpMs             ?? null,
    tbtMs:            data.performance?.avgTbtMs             ?? null,
    ttiMs:            data.performance?.avgTtiMs             ?? null,
    performanceScore: data.performance?.avgPerformanceScore  ?? null,
    reactMountMs:     data.performance?.reactMountMs         ?? null,
    // DOM elements
    domAvg:           data.domElements?.average              ?? null,
    // Semantic HTML
    semanticRatio:    data.semanticHtml?.avgSemanticRatio     ?? null,
    semanticCount:    data.semanticHtml?.avgSemanticCount     ?? null,
    genericCount:     data.semanticHtml?.avgGenericCount      ?? null,
    roleCount:        data.semanticHtml?.avgRoleCount         ?? null,
    // Lint
    lintErrors:       data.lint?.totalErrors                  ?? null,
    lintWarnings:     data.lint?.totalWarnings                ?? null,
    // Component usage
    componentTotal:   data.componentUsageCounts?.totalAcrossIterations ?? null,
    componentAvg:     data.componentUsageCounts?.averagePerIteration   ?? null,
    // Visual diff
    visualDiffAvg:    data.visualDiff?.averageDiffPercent     ?? null,
  };
}

// ─── Statistics helpers ───────────────────────────────────────────────────────

function mean(arr) {
  const valid = arr.filter(x => x !== null && x !== undefined && !isNaN(x));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function stdDev(arr) {
  const valid = arr.filter(x => x !== null && x !== undefined && !isNaN(x));
  if (valid.length < 2) return null;
  const m = mean(valid);
  const variance = valid.reduce((sum, x) => sum + (x - m) ** 2, 0) / valid.length;
  return Math.sqrt(variance);
}

function minVal(arr) {
  const valid = arr.filter(x => x !== null && x !== undefined && !isNaN(x));
  return valid.length ? Math.min(...valid) : null;
}

function maxVal(arr) {
  const valid = arr.filter(x => x !== null && x !== undefined && !isNaN(x));
  return valid.length ? Math.max(...valid) : null;
}

function aggregateMetrics(metricSets) {
  const keys = [
    'loc', 'fixesAvg', 'fixesTotal', 'cleanOnFirstTry',
    'inlineTotal', 'inlineAvg', 'boxInline',
    'axeTotal', 'axeAvg',
    'fcpMs', 'tbtMs', 'ttiMs', 'performanceScore', 'reactMountMs',
    'domAvg', 'semanticRatio', 'semanticCount', 'genericCount', 'roleCount',
    'lintErrors', 'lintWarnings', 'componentTotal', 'componentAvg', 'visualDiffAvg',
  ];
  const result = { count: metricSets.length };
  for (const k of keys) {
    const vals = metricSets.map(m => m[k]);
    result[k]          = mean(vals);
    result[`${k}_sd`]  = stdDev(vals);
    result[`${k}_min`] = minVal(vals);
    result[`${k}_max`] = maxVal(vals);
  }
  result.totalIterations = metricSets[0]?.totalIterations ?? null;
  return result;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n, decimals = 1) {
  if (n === null || n === undefined) return '—';
  return Number(n).toFixed(decimals);
}

function fmtInt(n) {
  if (n === null || n === undefined) return '—';
  return String(Math.round(n));
}

/**
 * Render a Δ column comparing training to control.
 * lowerIsBetter controls which direction is marked ✅.
 */
function delta(ctrl, train, lowerIsBetter = true) {
  if (ctrl === null || train === null || ctrl === 0) return '';
  const pct = ((train - ctrl) / Math.abs(ctrl)) * 100;
  const improved = lowerIsBetter ? pct < 0 : pct > 0;
  const sign = pct >= 0 ? '+' : '';
  return `${improved ? '✅' : '❌'} ${sign}${pct.toFixed(0)}%`;
}

function buildTimestamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}.${pad(now.getMinutes())}`;
  return `${date}-${time}`;
}

// ─── Markdown rendering ───────────────────────────────────────────────────────

function mdTable(headers, rows) {
  const sep = headers.map(() => '---');
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map(r => `| ${r.join(' | ')} |`),
  ];
  return lines.join('\n') + '\n';
}

function renderSummary(runs, promptKeys, scannedDir) {
  const hasControl  = promptKeys.includes('control');
  const hasTraining = promptKeys.includes('training');
  const showDelta   = hasControl && hasTraining;

  // Resolve per-run metrics for each requested prompt
  const perRun = runs.map(({ name, report }) => {
    const row = { name };
    for (const pk of promptKeys) {
      const data = report.prompts?.[pk];
      row[pk] = data ? extractMetrics(data) : null;
    }
    return row;
  });

  // Aggregate across all runs, per prompt
  const agg = {};
  for (const pk of promptKeys) {
    const sets = perRun.map(r => r[pk]).filter(Boolean);
    agg[pk] = aggregateMetrics(sets);
  }

  const iters = agg[promptKeys[0]]?.totalIterations ?? 3;

  // ── Header ─────────────────────────────────────────────────────────────────
  let md = `# Agent Test Summary\n\n`;
  md += `_Generated: ${new Date().toLocaleString()}_\n\n`;
  md += `**Output directory:** \`${scannedDir}\`  \n`;
  md += `**Runs included (${runs.length}):** ${runs.map(r => r.name).join(', ')}  \n`;
  md += `**Prompts:** ${promptKeys.join(', ')}  \n`;
  md += `**Iterations per run:** ${iters}  \n\n`;

  // ── Aggregate averages ──────────────────────────────────────────────────────
  md += `## Aggregate Averages (${runs.length} runs)\n\n`;

  const deltaHeader = showDelta ? ['**Δ (train vs ctrl)**'] : [];
  const aggHeaders  = ['Metric', ...promptKeys.map(k => `**${k}**`), ...deltaHeader];

  const METRIC_ROWS = [
    // [label,                    key,             lowerBetter, decimals]
    ['Lines of code (avg)',        'loc',           false,       0],
    ['Fix attempts / iter',        'fixesAvg',      true,        2],
    ['Total fixes (avg per run)',  'fixesTotal',    true,        1],
    ['Inline styles total',        'inlineTotal',   true,        1],
    ['Inline styles / iter',       'inlineAvg',     true,        1],
    ['Box inline styles',          'boxInline',     true,        1],
    ['Axe violations total',       'axeTotal',      true,        1],
    ['Axe violations / iter',      'axeAvg',        true,        2],
    ['FCP (ms)',                   'fcpMs',            true,  0],
    ['TBT (ms)',                   'tbtMs',            true,  1],
    ['TTI (ms)',                   'ttiMs',            true,  0],
    ['Lighthouse score',           'performanceScore', false, 0],
    ['React mount (ms)',           'reactMountMs',     true,  1],
    // DOM & Semantic HTML
    ['DOM elements (avg)',         'domAvg',          false, 0],
    ['Semantic ratio',             'semanticRatio',   false, 1],
    ['Semantic elements (avg)',    'semanticCount',   false, 0],
    ['Generic elements (avg)',     'genericCount',    true,  0],
    ['ARIA roles (avg)',           'roleCount',       false, 0],
    // Lint
    ['Lint errors total',          'lintErrors',      true,  0],
    ['Lint warnings total',        'lintWarnings',    true,  0],
    // Components
    ['Component instances total',  'componentTotal',  false, 0],
    ['Components / iter',          'componentAvg',    false, 0],
    // Visual diff
    ['Visual diff (avg %)',        'visualDiffAvg',   true,  2],
  ];

  const aggRows = METRIC_ROWS.map(([label, key, lowerBetter, decimals]) => {
    const vals = promptKeys.map(pk => {
      const v = agg[pk]?.[key];
      return decimals === 0 ? fmtInt(v) : fmt(v, decimals);
    });
    const d = showDelta
      ? [delta(agg.control?.[key], agg.training?.[key], lowerBetter)]
      : [];
    return [label, ...vals, ...d];
  });

  // Clean-on-first-try row
  const cleanRow = (() => {
    const vals = promptKeys.map(pk => {
      const a = agg[pk];
      if (!a || a.cleanOnFirstTry === null) return '—';
      const pct = ((a.cleanOnFirstTry / iters) * 100).toFixed(0);
      return `${fmt(a.cleanOnFirstTry, 1)} / ${iters} (${pct}%)`;
    });
    const d = showDelta
      // higher clean rate is better, so invert lowerIsBetter
      ? [delta(agg.control?.cleanOnFirstTry, agg.training?.cleanOnFirstTry, false)]
      : [];
    return ['Clean on 1st try (avg)', ...vals, ...d];
  })();

  aggRows.splice(2, 0, cleanRow); // insert after "total fixes"

  md += mdTable(aggHeaders, aggRows);
  md += '\n';

  // ── Per-run breakdown sections ─────────────────────────────────────────────
  md += `## Per-Run Breakdown\n\n`;

  // ── Inline styles ──────────────────────────────────────────────────────────
  md += `### 🎨 Inline Styles\n\n`;
  {
    const headers = [
      'Run',
      ...promptKeys.flatMap(pk => [`${pk} total`, `${pk} / iter`, `${pk} Box`]),
    ];
    const rows = perRun.map(row => {
      const cells = [row.name];
      for (const pk of promptKeys) {
        const m = row[pk];
        cells.push(m ? fmtInt(m.inlineTotal) : '—');
        cells.push(m ? fmt(m.inlineAvg, 1)   : '—');
        cells.push(m ? fmtInt(m.boxInline)    : '—');
      }
      return cells;
    });

    // Averages row
    const avgRow = ['**avg**'];
    for (const pk of promptKeys) {
      avgRow.push(`**${fmtInt(agg[pk]?.inlineTotal)}**`);
      avgRow.push(`**${fmt(agg[pk]?.inlineAvg, 1)}**`);
      avgRow.push(`**${fmtInt(agg[pk]?.boxInline)}**`);
    }
    rows.push(avgRow);

    md += mdTable(headers, rows);
    md += '\n';
  }

  // ── Accessibility ──────────────────────────────────────────────────────────
  md += `### ♿ Accessibility (axe violations)\n\n`;
  {
    const headers = [
      'Run',
      ...promptKeys.flatMap(pk => [`${pk} total`, `${pk} / iter`]),
    ];
    const rows = perRun.map(row => {
      const cells = [row.name];
      for (const pk of promptKeys) {
        const m = row[pk];
        cells.push(m ? fmtInt(m.axeTotal) : '—');
        cells.push(m ? fmt(m.axeAvg, 2)   : '—');
      }
      return cells;
    });

    const avgRow = ['**avg**'];
    for (const pk of promptKeys) {
      avgRow.push(`**${fmtInt(agg[pk]?.axeTotal)}**`);
      avgRow.push(`**${fmt(agg[pk]?.axeAvg, 2)}**`);
    }
    rows.push(avgRow);

    md += mdTable(headers, rows);
    md += '\n';
  }

  // ── Performance ────────────────────────────────────────────────────────────
  md += `### ⚡ Performance\n\n`;
  {
    const headers = [
      'Run',
      ...promptKeys.flatMap(pk => [`${pk} FCP (ms)`, `${pk} TBT (ms)`, `${pk} TTI (ms)`, `${pk} score`, `${pk} React mount (ms)`]),
    ];
    const rows = perRun.map(row => {
      const cells = [row.name];
      for (const pk of promptKeys) {
        const m = row[pk];
        cells.push(m ? fmtInt(m.fcpMs)           : '—');
        cells.push(m ? fmt(m.tbtMs, 1)           : '—');
        cells.push(m ? fmtInt(m.ttiMs)           : '—');
        cells.push(m ? fmtInt(m.performanceScore) : '—');
        cells.push(m ? fmt(m.reactMountMs, 1)    : '—');
      }
      return cells;
    });

    const avgRow = ['**avg**'];
    for (const pk of promptKeys) {
      avgRow.push(`**${fmtInt(agg[pk]?.fcpMs)}**`);
      avgRow.push(`**${fmt(agg[pk]?.tbtMs, 1)}**`);
      avgRow.push(`**${fmtInt(agg[pk]?.ttiMs)}**`);
      avgRow.push(`**${fmtInt(agg[pk]?.performanceScore)}**`);
      avgRow.push(`**${fmt(agg[pk]?.reactMountMs, 1)}**`);
    }
    rows.push(avgRow);

    md += mdTable(headers, rows);
    md += '\n';
  }

  // ── Lines of Code & Fixes ──────────────────────────────────────────────────
  md += `### 📝 Lines of Code & Fixes\n\n`;
  {
    const headers = [
      'Run',
      ...promptKeys.flatMap(pk => [`${pk} LoC`, `${pk} fixes / iter`, `${pk} clean`]),
    ];
    const rows = perRun.map(row => {
      const cells = [row.name];
      for (const pk of promptKeys) {
        const m   = row[pk];
        const tot = m?.totalIterations ?? iters;
        cells.push(m ? fmtInt(m.loc)            : '—');
        cells.push(m ? fmt(m.fixesAvg, 2)        : '—');
        cells.push(m ? `${m.cleanOnFirstTry}/${tot}` : '—');
      }
      return cells;
    });

    const avgRow = ['**avg**'];
    for (const pk of promptKeys) {
      const a = agg[pk];
      const cleanPct = a && a.cleanOnFirstTry !== null
        ? ` (${((a.cleanOnFirstTry / iters) * 100).toFixed(0)}%)`
        : '';
      avgRow.push(`**${fmtInt(a?.loc)}**`);
      avgRow.push(`**${fmt(a?.fixesAvg, 2)}**`);
      avgRow.push(`**${fmt(a?.cleanOnFirstTry, 1)}/${iters}${cleanPct}**`);
    }
    rows.push(avgRow);

    md += mdTable(headers, rows);
    md += '\n';
  }

  // ── DOM & Semantic HTML ────────────────────────────────────────────────────
  md += `### 🏗️ DOM & Semantic HTML\n\n`;
  {
    const headers = [
      'Run',
      ...promptKeys.flatMap(pk => [`${pk} DOM avg`, `${pk} semantic ratio`, `${pk} roles`]),
    ];
    const rows = perRun.map(row => {
      const cells = [row.name];
      for (const pk of promptKeys) {
        const m = row[pk];
        cells.push(m ? fmtInt(m.domAvg) : '—');
        cells.push(m && m.semanticRatio !== null ? `${fmt(m.semanticRatio, 1)}%` : '—');
        cells.push(m ? fmtInt(m.roleCount) : '—');
      }
      return cells;
    });
    const avgRow = ['**avg**'];
    for (const pk of promptKeys) {
      avgRow.push(`**${fmtInt(agg[pk]?.domAvg)}**`);
      avgRow.push(`**${agg[pk]?.semanticRatio !== null ? fmt(agg[pk]?.semanticRatio, 1) + '%' : '—'}**`);
      avgRow.push(`**${fmtInt(agg[pk]?.roleCount)}**`);
    }
    rows.push(avgRow);
    md += mdTable(headers, rows);
    md += '\n';
  }

  // ── Lint ────────────────────────────────────────────────────────────────────
  md += `### 🔍 Lint\n\n`;
  {
    const headers = [
      'Run',
      ...promptKeys.flatMap(pk => [`${pk} errors`, `${pk} warnings`]),
    ];
    const rows = perRun.map(row => {
      const cells = [row.name];
      for (const pk of promptKeys) {
        const m = row[pk];
        cells.push(m ? fmtInt(m.lintErrors) : '—');
        cells.push(m ? fmtInt(m.lintWarnings) : '—');
      }
      return cells;
    });
    const avgRow = ['**avg**'];
    for (const pk of promptKeys) {
      avgRow.push(`**${fmtInt(agg[pk]?.lintErrors)}**`);
      avgRow.push(`**${fmtInt(agg[pk]?.lintWarnings)}**`);
    }
    rows.push(avgRow);
    md += mdTable(headers, rows);
    md += '\n';
  }

  // ── Visual Consistency ─────────────────────────────────────────────────────
  md += `### 🖼️ Visual Consistency\n\n`;
  {
    const headers = [
      'Run',
      ...promptKeys.map(pk => `${pk} avg diff %`),
    ];
    const rows = perRun.map(row => {
      const cells = [row.name];
      for (const pk of promptKeys) {
        const m = row[pk];
        cells.push(m && m.visualDiffAvg !== null ? `${fmt(m.visualDiffAvg, 2)}%` : '—');
      }
      return cells;
    });
    const avgRow = ['**avg**'];
    for (const pk of promptKeys) {
      avgRow.push(`**${agg[pk]?.visualDiffAvg !== null ? fmt(agg[pk]?.visualDiffAvg, 2) + '%' : '—'}**`);
    }
    rows.push(avgRow);
    md += mdTable(headers, rows);
    md += '\n';
  }

  // ── Variance note ──────────────────────────────────────────────────────────
  if (runs.length > 1) {
    md += `### 📊 Metric Variance (std dev across runs)\n\n`;
    const headers = ['Metric', ...promptKeys.map(pk => `**${pk}**`)];
    const VARIANCE_ROWS = [
      ['Inline styles total',  'inlineTotal'],
      ['Box inline styles',    'boxInline'],
      ['Axe violations total', 'axeTotal'],
      ['FCP (ms)',              'fcpMs'],
      ['TBT (ms)',              'tbtMs'],
      ['TTI (ms)',              'ttiMs'],
      ['Lighthouse score',      'performanceScore'],
      ['React mount (ms)',      'reactMountMs'],
      ['Lines of code',         'loc'],
      ['DOM elements',     'domAvg'],
      ['Semantic ratio',   'semanticRatio'],
      ['Lint errors',      'lintErrors'],
      ['Component / iter', 'componentAvg'],
      ['Visual diff %',    'visualDiffAvg'],
    ];
    const rows = VARIANCE_ROWS.map(([label, key]) => {
      const vals = promptKeys.map(pk => fmt(agg[pk]?.[`${key}_sd`], 1));
      return [label, ...vals];
    });
    md += mdTable(headers, rows);
    md += '\n';
  }

  return md;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
