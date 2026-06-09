export default {
  label: "carbon",
  packages: {
    ui: { name: "@carbon/react", version: "latest" },
    styles: { name: "@carbon/styles", version: "latest" },
  },
  prompts: {
    system: "system.md",
    user: "user.md",
  },
};
