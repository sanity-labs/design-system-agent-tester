export default {
  label: "atlaskit",
  packages: {
    // Atlassian's design system ships as many independent `@atlaskit/*`
    // packages (one per component, plus `@atlaskit/primitives` for
    // layout). There is no single umbrella package — the agent must
    // install each component package as needed. We anchor the test on
    // `@atlaskit/primitives` since every layout uses it.
    ui: { name: "@atlaskit/primitives", version: "latest" },
  },
  prompts: {
    system: "system.md",
    user: "user.md",
  },
};
