#!/usr/bin/env node
/**
 * new-test.js — Scaffold a new test directory under `tests/`.
 *
 * Usage:
 *   npm run new-test -- <label>
 *
 * Creates:
 *   tests/<label>/
 *     config.js     — test config stub with the label filled in
 *     system.md     — system-prompt template stub
 *     user.md       — user-prompt template stub
 *
 * The label becomes both the directory name and `config.js`'s `label`
 * field. Refuses to overwrite an existing directory.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const TESTS_DIR = resolve(PROJECT_ROOT, "tests");

function usage(exitCode = 0) {
  const out = exitCode === 0 ? console.log : console.error;
  out(`
new-test — Scaffold a new test directory under tests/.

Usage:
  npm run new-test -- <label>

The label must be a valid directory name (letters, numbers, dashes,
underscores). It will be used as:

  - the directory name:   tests/<label>/
  - the test identifier:  config.js's \`label\` field
  - the on-disk output:   output/<date>/<time>/<label>/

Example:
  npm run new-test -- shad-cn-v2
`);
  process.exit(exitCode);
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  usage(args.length === 0 ? 1 : 0);
}

if (args.length > 1) {
  console.error(`Error: expected exactly one label argument, got ${args.length}: ${args.join(", ")}`);
  usage(1);
}

const label = args[0].trim();

// ─── Validate the label ──────────────────────────────────────────────

if (!label) {
  console.error("Error: label cannot be empty.");
  process.exit(1);
}

if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(label)) {
  console.error(
    `Error: invalid label "${label}". Use only letters, numbers, dashes, and underscores. ` +
      `It must start with a letter or number.`,
  );
  process.exit(1);
}

if (label.startsWith("_") || label.endsWith(".disabled")) {
  console.error(
    `Error: label "${label}" would be auto-skipped by the test loader. ` +
      `Don't prefix with "_" or end with ".disabled".`,
  );
  process.exit(1);
}

const testDir = resolve(TESTS_DIR, label);

if (existsSync(testDir)) {
  console.error(`Error: tests/${label}/ already exists. Pick a different label or delete the existing directory.`);
  process.exit(1);
}

// ─── Scaffold ────────────────────────────────────────────────────────

const configJs = `export default {
  label: "${label}",
  packages: {
    // Each entry's \`name\` field is scanned for component imports.
    // The whole object is exposed as {{packages.…}} in templates.
    ui: { name: "@your-org/ui", version: "latest" },
  },
  // Optional fields — uncomment and edit as needed:
  // reactVersion: "^19.2",
  // docsPath: "docs.md",
  //
  // MCP server config — presence of this block turns MCP on for the test.
  // (\`args\` gets the server directory; add
  // \`import { resolve } from "node:path";\` at the top if you use it.)
  // mcp: {
  //   command: "node",
  //   args: (directory) => [resolve(directory, "src/index.js")],
  //   defaultDirectory: "/absolute/path/to/your-mcp-server",
  //   env: {},
  //   toolPrefix: "mcp__yourserver",
  // },
  prompts: {
    system: "system.md",
    user: "user.md",
    // fixSystem: "fix-system.md",
  },
  // \`derive(ctx)\` returns extra fields merged into the template context.
  // Useful for joined lists or markdown tables that templates can't build.
  // derive: ({ packages }) => ({
  //   componentsQuoted: packages.ui.components.map((c) => \`\\\`\${c}\\\`\`).join(", "),
  // }),
};
`;

const systemMd = `You are an expert frontend developer. You will be given instructions to build a web application.

<!--
  Describe what the agent should know for this test:
  - Required package imports and version pins
  - Architectural or technology choices
  - Any rules the agent must follow

  The engine appends OUTPUT_FORMAT / FEEDBACK_FORMAT / BASE_RULES
  automatically — don't paste those here.

  Use {{packages.ui.name}} placeholders to reference test config values.
-->

CRITICAL — Package imports:
- All UI components come from \`{{packages.ui.name}}@{{packages.ui.version}}\`.
`;

const userMd = `{{brief}}

# Instructions
<!--
  The brief above is auto-injected. Below, describe what makes this
  test different from the others (the specific instructions, install
  commands, do-this-not-that rules).

  Available placeholders:
    {{brief}}                 the interface brief (above)
    {{packages.<key>.name}}   any package name from config.js
    {{requiresMcp}}           runtime MCP state (use with {{#if}}/{{#unless}})
    {{docs}}                  contents of docsPath, if set

  Conditional blocks:
    {{#if requiresMcp}}…{{/if}}
    {{#unless requiresMcp}}…{{/unless}}
-->

* Install the latest version: \`npm i {{packages.ui.name}}@{{packages.ui.version}}\`.
* The project should be built on top of Vite.
* Do not add unit tests of any kind.
* Provide feedback on areas of friction when using the design system. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.
`;

await mkdir(testDir, { recursive: true });
await writeFile(resolve(testDir, "config.js"), configJs, "utf-8");
await writeFile(resolve(testDir, "system.md"), systemMd, "utf-8");
await writeFile(resolve(testDir, "user.md"), userMd, "utf-8");

console.log(`✓ Scaffolded tests/${label}/`);
console.log(`  ├── config.js`);
console.log(`  ├── system.md`);
console.log(`  └── user.md`);
console.log("");
console.log("Next steps:");
console.log(`  1. Edit tests/${label}/config.js — set packages and optional flags.`);
console.log(`  2. Edit tests/${label}/system.md and user.md — write the prompts.`);
console.log(`  3. Run the test:`);
console.log(`     npm start -- --test ${label}`);
