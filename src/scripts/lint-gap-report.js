/**
 * @module scripts/lint-gap-report
 *
 * Mine finished runs for recurring failures, and say which ones a lint rule
 * already covers.
 *
 * The question this answers is "what should the next lint rule be?", and the
 * honest version of it is "what keeps reaching the compiler, the browser, or
 * axe *after* the lint gate has run?". A failure that lint already catches is
 * not a rule candidate — it is a rule that fired. So every pattern here is
 * cross-referenced against the installed plugin before it is ranked.
 *
 * Signals read per iteration:
 *   _tsc_check.txt   TypeScript errors, the largest and best-shaped source —
 *                    a TS code plus a message that usually names the
 *                    component and prop involved.
 *   _meta.json       axe violations that survived the accessibility pass, and
 *                    `residualLintRules` — rules that fired and were NOT
 *                    auto-fixed, which is a different signal: the rule exists
 *                    and the agent ignored or could not apply it.
 *
 * Coverage is decided by searching each rule's source for the prop and
 * component a pattern names. That is a heuristic, deliberately: it over-reports
 * coverage rather than under-reports it, so a pattern marked UNCOVERED is
 * worth a look, and one marked covered may still deserve a second glance if it
 * recurs heavily (a covered-but-recurring pattern usually means the rule is
 * gated wrong — exactly how 35 rules sat dark behind a retired package name).
 *
 * Usage:
 *   node src/scripts/lint-gap-report.js [output/2026-09-09] [--arm ui5-frontload]
 *   node src/scripts/lint-gap-report.js --all --json
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const PLUGIN_DIR =
  process.env.LINT_PLUGIN_DIR ?? '/Users/pj/Documents/Projects/eslint-plugin-sanity-ui';

// The extracted v5 API, used to name which prop in a rejected object literal
// the component does not actually accept. Without it, `Type '{ children,
// padding }' is not assignable to CardProps` is just noise; with it, it is
// "Card.padding", which is a rule candidate you can act on.
const PROPS_CACHE =
  process.env.DSDS_PROPS_CACHE ??
  '/Users/pj/Documents/Projects/Tools/sanity-ui-props-extractor/out/props-0.20.0.cache.json';

function loadV5Api() {
  if (!existsSync(PROPS_CACHE)) return null;
  try {
    const raw = JSON.parse(readFileSync(PROPS_CACHE, 'utf-8'));
    const byComponent = new Map();
    for (const [id, entry] of Object.entries(raw)) {
      const props = entry?.props?.props ?? [];
      byComponent.set(id.replace(/-/g, ''), new Set(props.map((x) => x.name)));
    }
    return byComponent;
  } catch {
    return null;
  }
}
const V5_API = loadV5Api();

/**
 * Enum value-set -> the prop that owns it, e.g. {"regular","loose"} ->
 * Button.density.
 *
 * A value-assignability error names neither the component nor the prop —
 * `Type '"compact"' is not assignable to type '"regular" | "loose"'` — so
 * without this the single largest uncovered pattern (94 errors) reads as
 * unattributable when `no-button-density-compact` covers it exactly.
 */
function loadEnumIndex() {
  if (!existsSync(PROPS_CACHE)) return null;
  const index = new Map();
  try {
    const raw = JSON.parse(readFileSync(PROPS_CACHE, 'utf-8'));
    for (const [id, entry] of Object.entries(raw)) {
      for (const prop of entry?.props?.props ?? []) {
        if (!Array.isArray(prop.values) || prop.values.length < 2) continue;
        index.set([...prop.values].sort().join('|'), {
          component: id.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase()),
          prop: prop.name,
        });
      }
    }
  } catch {
    return null;
  }
  return index;
}
const ENUM_INDEX = loadEnumIndex();

// Props every component forwards to its native element — never the offender.
const NATIVE_OK = /^(children|key|ref|className|style|id|role|on[A-Z]|aria-|data-)/;

// ── failure extraction ──────────────────────────────────────────────────────

/**
 * Collapse a TypeScript error into a pattern: the code, plus the message with
 * every quoted literal replaced. `Type 'number' is not assignable to
 * 'Responsive<string>'` and the same error about `Responsive<number>` are the
 * same authoring mistake and should rank as one.
 */
function tsPattern(code, message) {
  const shape = message.replace(/'[^']*'/g, "'X'").replace(/\s+/g, ' ').trim();
  return `${code} ${shape}`.slice(0, 120);
}

/**
 * Classify an error into the thing a lint rule would key on.
 *
 * A generic "every quoted token must appear in the rule source" match was the
 * first attempt and it was useless in both directions: it reported NO RULE for
 * icon-import errors that `no-unknown-icon-import` plainly covers (because the
 * icon's own name never appears in the rule), and it matched `Duplicate
 * identifier 'Box'` to layout rules that merely mention Box. Classifying the
 * few error shapes that actually recur is less clever and far more accurate.
 *
 * Returns { kind, signals } where signals are the tokens a covering rule must
 * contain, or kind:'unclassified' when the shape is not a design-system
 * mistake at all (ordinary app-code type errors, syntax errors).
 */
function classify(code, message) {
  let m;
  // TS2305 says `Module '"x"' has no exported member`; TS2724 drops the
  // `Module ` prefix and adds `named`. Both are the same authoring mistake.
  if ((m = message.match(/(?:Module )?'"([^"]+)"' has no exported member(?: named)? '(\w+)'/))) {
    return { kind: 'icon-import', signals: [m[1].split('/')[0] + (m[1].includes('/') ? '/' : '')], detail: m[2] };
  }
  if ((m = message.match(/Cannot find module '([^']+)'/))) {
    return { kind: 'icon-import', signals: [m[1].split('/').slice(0, 2).join('/')], detail: m[1] };
  }
  if ((m = message.match(/Property '(\w+)' does not exist on type '(\w+)Props/))) {
    return { kind: 'prop-on-component', signals: [m[1], m[2]], detail: `${m[2]}.${m[1]}` };
  }
  if ((m = message.match(/Property '(\w+)' is missing in type .* but required in type '(\w+)Props/))) {
    return { kind: 'missing-required-prop', signals: [m[1], m[2]], detail: `${m[2]}.${m[1]}` };
  }
  if ((m = message.match(/Type '\{([^}]*)\}' is not assignable to type 'IntrinsicAttributes & (\w+)Props/))) {
    const component = m[2];
    const passed = [...m[1].matchAll(/(\w[\w-]*)\s*:/g)].map((x) => x[1]);
    const known = V5_API?.get(component.toLowerCase());
    const offenders = passed.filter((p) => !NATIVE_OK.test(p) && (known ? !known.has(p) : true));
    const offender = offenders[0] ?? passed.find((p) => !NATIVE_OK.test(p));
    if (offender) {
      return { kind: 'prop-on-component', signals: [offender, component], detail: `${component}.${offender}` };
    }
  }
  if ((m = message.match(/Type '"[^"]*"' is not assignable to type '((?:"[^"]*"(?:\s*\|\s*)?)+)(?:\s*\|\s*undefined)?'/))) {
    const values = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]).sort().join('|');
    const owner = ENUM_INDEX?.get(values);
    if (owner) {
      return { kind: 'invalid-enum-value', signals: [owner.prop, owner.component], detail: `${owner.component}.${owner.prop}` };
    }
  }
  if ((m = message.match(/Type '(\w+)' is not assignable to type 'Responsive<(\w+)>/))) {
    return { kind: 'responsive-value-type', signals: ['Responsive'], detail: `${m[1]} -> Responsive<${m[2]}>` };
  }
  if (/is not assignable to type/.test(message) && /Responsive/.test(message)) {
    return { kind: 'responsive-value-type', signals: ['Responsive'], detail: 'Responsive<…> mismatch' };
  }
  return { kind: 'unclassified', signals: [], detail: null };
}

function readIterations(runDir, armFilter) {
  const rows = [];
  for (const arm of readdirSync(runDir, { withFileTypes: true })) {
    if (!arm.isDirectory()) continue;
    if (armFilter && arm.name !== armFilter) continue;
    const armDir = join(runDir, arm.name);
    for (const it of readdirSync(armDir, { withFileTypes: true })) {
      if (!it.isDirectory() || !it.name.startsWith('iteration-')) continue;
      rows.push({ arm: arm.name, dir: join(armDir, it.name), id: `${basename(runDir)}/${arm.name}/${it.name}` });
    }
  }
  return rows;
}

function collect(iterations) {
  const ts = new Map(); // pattern -> { count, iters:Set, sample, idents:Set }
  const axe = new Map();
  const residualLint = new Map();

  for (const it of iterations) {
    const tscPath = join(it.dir, '_tsc_check.txt');
    if (existsSync(tscPath)) {
      for (const line of readFileSync(tscPath, 'utf-8').split('\n')) {
        const m = line.match(/error (TS\d+): (.*)/);
        if (!m) continue;
        const cls = classify(m[1], m[2]);
        // Bucket by what a rule would key on, not by the raw wording. When a
        // shape is unclassified, fall back to the blunt pattern so it is still
        // counted rather than silently dropped.
        const key = cls.kind === 'unclassified' ? tsPattern(m[1], m[2]) : `${cls.kind}: ${cls.detail}`;
        const e = ts.get(key) ?? { count: 0, iters: new Set(), messages: new Map(), cls };
        e.count++;
        e.iters.add(it.id);
        e.messages.set(m[2].trim(), (e.messages.get(m[2].trim()) ?? 0) + 1);
        ts.set(key, e)
      }
    }

    const metaPath = join(it.dir, '_meta.json');
    if (!existsSync(metaPath)) continue;
    let meta;
    try {
      meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
    } catch {
      continue;
    }
    for (const v of (meta.a11yResults?.axeViolations ?? [])) {
      const id = typeof v === 'string' ? v : v?.id;
      if (!id) continue;
      const e = axe.get(id) ?? { count: 0, iters: new Set() };
      e.count++;
      e.iters.add(it.id);
      axe.set(id, e);
    }
    for (const [rule, n] of Object.entries(meta.residualLintRules ?? {})) {
      const e = residualLint.get(rule) ?? { count: 0, iters: new Set() };
      e.count += typeof n === 'number' ? n : 1;
      e.iters.add(it.id);
      residualLint.set(rule, e);
    }
  }
  return { ts, axe, residualLint };
}

// ── coverage lookup against the installed plugin ────────────────────────────

function loadRuleSources() {
  const dir = join(PLUGIN_DIR, 'rules');
  if (!existsSync(dir)) return null;
  const out = new Map();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    out.set(f.replace(/\.js$/, ''), readFileSync(join(dir, f), 'utf-8'));
  }
  const indexPath = join(PLUGIN_DIR, 'index.js');
  if (existsSync(indexPath)) out.set('(index.js inline rules)', readFileSync(indexPath, 'utf-8'));
  return out;
}

/**
 * Rules whose source mentions every identifier the pattern names. Requiring
 * all of them keeps `Property 'icon' does not exist on type 'ButtonProps'`
 * from matching any rule that merely says "icon" somewhere.
 */
// Some shapes cannot be matched by searching rule sources — an icon-import
// error never contains the icon name the rule would need to mention. For those,
// name the rule that owns the shape.
const COVERAGE_BY_KIND = {
  'icon-import': ['no-unknown-icon-import'],
};

function rulesCovering(cls, ruleSources) {
  if (!ruleSources) return [];
  const byKind = COVERAGE_BY_KIND[cls.kind];
  if (byKind) return byKind.filter((r) => ruleSources.has(r));
  if (!cls.signals.length) return [];
  const hits = [];
  for (const [name, src] of ruleSources) {
    if (cls.signals.every((sig) => src.includes(sig))) hits.push(name);
  }
  return hits;
}

// ── report ──────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const all = args.includes('--all');
  const armIdx = args.indexOf('--arm');
  const arm = armIdx !== -1 ? args[armIdx + 1] : null;
  const targets = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--arm');

  const outputRoot = join(ROOT, 'output');
  let runDirs = [];
  if (all) {
    for (const day of readdirSync(outputRoot)) {
      const dayDir = join(outputRoot, day);
      for (const run of readdirSync(dayDir)) runDirs.push(join(dayDir, run));
    }
  } else if (targets.length) {
    runDirs = targets.map((t) => (t.startsWith('/') ? t : join(ROOT, t)));
    runDirs = runDirs.flatMap((d) =>
      existsSync(join(d, 'report.json')) || readdirSync(d).some((x) => x.includes('.'))
        ? readdirSync(d, { withFileTypes: true }).some((e) => e.isDirectory() && /^\d/.test(e.name))
          ? readdirSync(d).map((x) => join(d, x))
          : [d]
        : [d],
    );
  } else {
    console.error('Usage: lint-gap-report.js <output/DATE[/TIME]>… | --all  [--arm <label>] [--json]');
    process.exit(1);
  }
  runDirs = runDirs.filter((d) => existsSync(d) && readdirSync(d, { withFileTypes: true }).some((e) => e.isDirectory()));

  const iterations = runDirs.flatMap((d) => readIterations(d, arm));
  const { ts, axe, residualLint } = collect(iterations);
  const ruleSources = loadRuleSources();

  const tsRows = [...ts.entries()]
    .map(([pattern, e]) => ({
      pattern,
      count: e.count,
      iterations: e.iters.size,
      sample: [...e.messages.entries()].sort((a, b) => b[1] - a[1])[0][0],
      kind: e.cls.kind,
      covering: rulesCovering(e.cls, ruleSources),
    }))
    .sort((a, b) => b.count - a.count);

  if (json) {
    console.log(JSON.stringify({ iterations: iterations.length, ts: tsRows, axe: [...axe], residualLint: [...residualLint] }, null, 1));
    return;
  }

  console.log(`\nScanned ${iterations.length} iterations across ${runDirs.length} run(s)`);
  console.log(ruleSources ? `Plugin: ${PLUGIN_DIR} (${ruleSources.size} rule sources)\n` : 'Plugin not found — coverage unknown\n');

  console.log('TYPE ERRORS — ranked, with lint coverage');
  console.log(`  ${'n'.padStart(5)}  ${'iters'.padStart(5)}  ${'covered by'.padEnd(30)} pattern`);
  for (const r of tsRows.slice(0, 20)) {
    const cov = r.covering.length ? r.covering.slice(0, 2).join(', ') : '— NO RULE';
    console.log(`  ${String(r.count).padStart(5)}  ${String(r.iterations).padStart(5)}  ${cov.slice(0, 30).padEnd(30)} ${r.sample.slice(0, 78)}`);
  }

  const uncovered = tsRows.filter((r) => !r.covering.length);
  console.log(`\n  ${uncovered.length} of ${tsRows.length} patterns have no matching rule` +
    `, accounting for ${uncovered.reduce((s, r) => s + r.count, 0)} of ${tsRows.reduce((s, r) => s + r.count, 0)} errors`);

  if (axe.size) {
    console.log('\nAXE VIOLATIONS surviving the accessibility pass');
    for (const [id, e] of [...axe].sort((a, b) => b[1].count - a[1].count).slice(0, 10)) {
      console.log(`  ${String(e.count).padStart(5)}  ${String(e.iters.size).padStart(5)}  ${id}`);
    }
  }
  if (residualLint.size) {
    console.log('\nLINT RULES that fired and were NOT auto-fixed (rule exists, agent did not act)');
    for (const [id, e] of [...residualLint].sort((a, b) => b[1].count - a[1].count).slice(0, 10)) {
      console.log(`  ${String(e.count).padStart(5)}  ${String(e.iters.size).padStart(5)}  ${id}`);
    }
  }
  console.log('');
}

main();
