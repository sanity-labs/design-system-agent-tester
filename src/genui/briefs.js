/**
 * Short UI briefs for the generative-UI run. Each asks for a self-contained
 * surface that the catalog's stable/beta components can express (no modals,
 * dropdowns, or data tables — those components are draft and absent from the
 * catalog, so a brief that requires them would test the gap, not the path).
 */
export default [
  {
    id: "recipe-detail",
    brief:
      "A recipe detail panel: a heading with the recipe name, a status pill, a short description, and a labelled list of metadata (cuisine, prep time, servings). Use cards and stacks for grouping.",
  },
  {
    id: "settings-section",
    brief:
      "A settings section: a section heading, three labelled rows each pairing a label with a short description, separated by dividers, grouped in a card.",
  },
  {
    id: "dashboard-stats",
    brief:
      "A dashboard header: a page heading and a row of three stat cards, each showing a metric label and a large value, laid out with a responsive grid or flex.",
  },
];
