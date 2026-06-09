export default {
  label: "zendesk-garden",
  packages: {
    ui: { name: "@zendeskgarden/react-components", version: "latest" },
    theming: { name: "@zendeskgarden/react-theming", version: "latest" },
  },
  prompts: {
    system: "system.md",
    user: "user.md",
  },
};
