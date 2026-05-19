// Helpers used by the `derive()` function below. Local to this test —
// other tests don't need them.
const quoted = (list) => list.map((c) => `\`${c}\``).join(", ");

const importTable = (components, primaryPkg, fallbackPkg) => {
  const rows = components.map((c) => `| \`${c}\` | \`${primaryPkg}\` |`);
  return [
    "| Component | Import from |",
    "|-----------|-------------|",
    ...rows,
    `| Everything else | \`${fallbackPkg}\` |`,
  ].join("\n");
};

export default {
  label: "variant",
  packages: {
    ds: {
      name: "@sanity-labs/ui-poc",
      /**
       * Version string the agent writes into `package.json`. Use `"latest"`
       * or a concrete version like `"0.0.1-alpha.11"`. Avoid caret ranges
       * for pre-release versions — `^0.0.1` will not match `0.0.1-alpha.X`
       * per semver.
       */
      version: "0.0.1-alpha.11",
      components: [
        "Box", "Flex", "Grid", "Text", "Heading",
        "Card", "Divider", "Icon", "Container",
      ],
      cssImport: "@sanity-labs/ui-poc/styles.css",
    },
    ui: { name: "@sanity/ui", version: "latest" },
    icons: { name: "@sanity/icons", version: "latest" },
  },
  reactVersion: "^19.2",
  requiresMcp: true,
  docsPath: "docs.md",
  prompts: {
    system: "system.md",
    fixSystem: "fix-system.md",
    user: "user.md",
  },
  /**
   * Derived values referenced from the markdown templates. Anything a
   * template needs that isn't a simple field lives here.
   */
  derive: ({ packages }) => ({
    componentsQuoted: quoted(packages.ds.components),
    importTable: importTable(
      packages.ds.components,
      packages.ds.name,
      packages.ui.name,
    ),
  }),
};
