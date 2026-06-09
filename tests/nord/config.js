export default {
  label: "nord",
  packages: {
    ui: { name: "@nordhealth/react", version: "latest" },
    styles: { name: "@nordhealth/css", version: "latest" },
  },
  prompts: {
    system: "system.md",
    user: "user.md",
  },
};
