export default {
  label: "control",
  packages: {
    ui: { name: "@sanity/ui", version: "latest" },
    icons: { name: "@sanity/icons", version: "latest" },
  },
  prompts: {
    system: "system.md",
    user: "user.md",
  },
};
