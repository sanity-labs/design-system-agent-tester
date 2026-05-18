# Refactoring Plan: agent-tester → design-system-tester

## Goals
1. Make the tool design-system-agnostic (remove Sanity-specific hardcoding from core logic)
2. Reorganize files into logical directories
3. Remove dead code
4. Eliminate duplication between runner.js and runner-cli.js
5. Add comprehensive unit tests with vitest

---

## Phase 1: Directory Reorganization

### Current flat structure (31 files in src/)
```
src/
├── a11y.js (1719 lines)
├── analyze.js (329 lines)
├── eslint-plugin/ (13 rule files)
├── index.js (394 lines)
├── lint.js (526 lines)
├── mcp-client.js (291 lines)
├── perf.js (322 lines)
├── prompt-generator.js (90 lines)
├── rebuild.js (376 lines)
├── rediff-all.js (325 lines)
├── refilter.js (140 lines)
├── reperf.js (381 lines)
├── report.js (1366 lines)
├── rescreenshot.js (260 lines)
├── runner-cli.js (1210 lines)
├── runner.js (1495 lines)
├── screenshot.js (527 lines)
├── summarize.js (673 lines)
└── visual-diff.js (208 lines)
```

### Proposed structure
```
src/
├── index.js                           # Main entry point
│
├── pipeline/                          # Core test pipeline
│   ├── runner-api.js                  # API-based agent runner
│   ├── runner-cli.js                  # CLI-based agent runner
│   ├── shared.js                      # Shared runner logic (was duplicated)
│   │   - enforceDesignSystemImports()
│   │   - generateContributions()
│   │   - parseChallenges()
│   │   - buildResult()
│   │   - writeProjectFiles()
│   │   - readProjectFiles()
│   │   - buildFixPrompt()
│   │   - buildCurrentFilesText()
│   └── mcp-client.js                  # MCP JSON-RPC transport
│
├── evaluation/                        # Measurement & analysis
│   ├── screenshot.js                  # Dev server + Puppeteer
│   ├── accessibility.js               # axe-core WCAG tests (was a11y.js)
│   ├── performance.js                 # Lighthouse + React profiling (was perf.js)
│   ├── lint.js                        # ESLint wrapper
│   ├── analyze.js                     # File parsing, component/style extraction
│   └── visual-diff.js                 # Pixel-level image comparison
│
├── reporting/                         # Output generation
│   ├── report.js                      # Per-run report (JSON + Markdown)
│   └── summarize.js                   # Cross-run aggregation
│
├── config/                            # Design-system-specific configuration
│   ├── prompt-generator.js            # Brief generation
│   ├── design-system.js               # DS adapter (package names, import rules, etc.)
│   └── eslint-plugin/                 # Custom lint rules
│       ├── index.js
│       └── rules/
│
├── scripts/                           # Standalone re-run utilities
│   ├── rebuild.js
│   ├── rescreenshot.js
│   ├── rediff-all.js
│   ├── refilter.js
│   └── reperf.js
│
└── __tests__/                         # Unit tests (vitest)
    ├── analyze.test.js
    ├── screenshot.test.js
    ├── report.test.js
    └── ...
```

---

## Phase 2: Extract Shared Runner Logic

### Problem
`runner.js` (1495 lines) and `runner-cli.js` (1210 lines) share ~600 lines of identical code:
- `enforceUiPocImports()` — ~140 lines, duplicated verbatim
- `generateContributions()` — ~120 lines, duplicated
- `parseChallenges()` — ~15 lines, duplicated
- `buildResult()` — ~70 lines, duplicated
- `writeProjectFiles()` — ~25 lines, duplicated
- `readProjectFiles()` — ~15 lines, duplicated
- `buildFixPrompt()` — ~20 lines, duplicated
- `buildCurrentFilesText()` — ~20 lines, duplicated

### Solution
Extract all shared logic into `pipeline/shared.js`. Each runner becomes a thin orchestration layer:
- `runner-api.js` (~400 lines) — Anthropic SDK calls + MCP integration
- `runner-cli.js` (~300 lines) — Claude CLI invocation
- `pipeline/shared.js` (~600 lines) — everything else

---

## Phase 3: Design-System Adapter

### Problem
These are hardcoded throughout the pipeline:
- Package names (`@sanity-labs/ui-poc`, `@sanity-labs/design-system`, `@sanity/ui`)
- Component lists (`Box`, `Flex`, `Grid`, `Text`, `Heading`, `Card`, `Divider`)
- Import rewriting rules
- React version requirements
- CSS import paths
- Report headings ("Sanity UI Components", "Sanity UI Feedback")
- MCP server path

### Solution
Create `config/design-system.js` that exports a configuration object:

```js
export default {
  name: "Sanity Design System",
  packages: {
    designSystem: "@sanity-labs/design-system",
    legacy: "@sanity/ui",
    icons: "@sanity/icons",
  },
  componentsToEnforce: ["Box", "Flex", "Grid", "Text", "Heading", "Card", "Divider"],
  requiredStylesImport: "@sanity-labs/design-system/styles.css",
  reactVersion: "^19.2",
  additionalDeps: { classnames: "latest" },
  mcpServer: {
    command: "uv",
    args: ["run", "--directory", "/path/to/mcp-server", "mcp", "run", "main.py"],
  },
}
```

All pipeline code reads from this config instead of hardcoding package names.

---

## Phase 4: Dead Code Removal

| Item | Action |
|------|--------|
| `eslint-plugin/index.js` exports `configs` and `ruleDocs` | Remove unused exports |
| `mcp-client.js` exports `McpClient` class | Remove export keyword (keep class, it's used internally) |
| `extractSemanticHtml` in analyze.js | Already removed — was replaced by DOM-based analysis |

---

## Phase 5: Report Label Generalization

Replace hardcoded "Sanity UI" strings in report headings with the config name:

| Current | Generic |
|---------|---------|
| "Sanity UI Components" | "{name} Components" |
| "Sanity UI Feedback" | "{name} Feedback" |
| "Lint (Sanity UI Rules)" | "Lint ({name} Rules)" |
| "sanityUIComponents" field name | "designSystemComponents" |

---

## Phase 6: Unit Tests (vitest)

### Test targets (by priority)

| File | Lines | Testable functions | Priority |
|------|-------|--------------------|----------|
| `analyze.js` | 329 | `parseFiles`, `extractSanityUIComponents`, `extractComponentUsageCounts`, `extractInlineStyles`, `isSourceFile`, `parseFeedback` | **P0** — pure functions, easy to test |
| `report.js` | 1366 | `analyzeAccessibility`, `analyzePerformance`, `analyzeInlineStyles`, `analyzeSemanticHtml`, `analyzeFeedback`, `computeCodeVariance`, `renderMarkdown` | **P0** — complex aggregation logic |
| `shared.js` (new) | ~600 | `enforceDesignSystemImports`, `parseChallenges`, `buildResult`, `writeProjectFiles` | **P0** — post-processing that modifies files |
| `visual-diff.js` | 208 | `computeVisualDiff` | **P1** — needs mock images |
| `screenshot.js` | 527 | `waitForServerUrl`, `waitForRenderedContent` (internal) | **P1** — needs Puppeteer mocks |
| `prompt-generator.js` | 90 | `generateAppPrompt`, `pickDomain` | **P2** — needs API mock |
| `mcp-client.js` | 291 | `McpClient` protocol handling | **P2** — needs process mocks |
| `summarize.js` | 673 | `extractMetrics`, `aggregateMetrics`, `renderSummary` | **P1** — pure functions |

### Setup
```json
// package.json
{
  "devDependencies": {
    "vitest": "^3.2.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## Execution Order

1. **Phase 4** — Dead code removal (small, safe, no structural changes)
2. **Phase 2** — Extract shared runner logic (biggest dedup win)
3. **Phase 1** — Directory reorganization (move files, update imports)
4. **Phase 5** — Report label generalization (string replacements)
5. **Phase 3** — Design-system adapter (config extraction)
6. **Phase 6** — Unit tests (after structure is stable)
