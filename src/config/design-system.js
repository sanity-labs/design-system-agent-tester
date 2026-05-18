/**
 * Design system configuration.
 *
 * This file defines all design-system-specific values used throughout the
 * pipeline. To test a different design system, swap this configuration —
 * no other source files need to change.
 */

const config = {
  /** Human-readable name used in report headings and log messages. */
  name: "Sanity Design System",

  packages: {
    /** The new design system package that replaces layout primitives. */
    designSystem: {
      name: "@sanity-labs/design-system",
      /** Components that must be imported from the DS package, not the legacy package. */
      components: ["Box", "Flex", "Grid", "Text", "Heading", "Card", "Divider"],
      /** CSS file that must be imported for DS components to render correctly. */
      cssImport: "@sanity-labs/design-system/styles.css",
    },

    /** The legacy UI package that still provides interactive components. */
    legacy: {
      name: "@sanity/ui",
    },

    /** The icon package. */
    icons: {
      name: "@sanity/icons",
    },
  },

  /**
   * Dependencies to inject when enforcing the design system.
   * Keys are npm package names, values are version specifiers.
   */
  enforcedDeps: {
    "@sanity-labs/design-system": "latest",
    classnames: "latest",
  },

  /**
   * React version required by the design system.
   * Set to null to skip React version enforcement.
   */
  reactVersion: "^19.2",

  /** MCP server configuration for tool-augmented generation. */
  mcp: {
    /** Shell command to start the MCP server. */
    command: "uv",
    /** Arguments for the MCP server command. */
    args: (directory) => [
      "run",
      "--directory",
      directory,
      "mcp",
      "run",
      "main.py",
    ],
    /** Default path to the MCP server project. */
    defaultDirectory: "/Users/pj/Documents/Projects/sanity-ui-mcp",
    /** MCP tool prefix filter (e.g., "mcp__sanity-ui"). */
    toolPrefix: "mcp__sanity-ui",
  },

  /** CSS selectors used to detect whether the app rendered in the browser. */
  appRootSelectors: [
    "#root",
    "#app",
    "#__next",
    "[data-sanity]",
    "[data-reactroot]",
  ],

  /**
   * The string checked in the prompt content to decide whether to run
   * design-system-specific post-processing (import enforcement, etc.).
   * If the prompt doesn't contain this string, enforcement is skipped
   * (e.g., for control runs that don't use the DS).
   */
  promptTrigger: "@sanity-labs/design-system",
};

export default config;
