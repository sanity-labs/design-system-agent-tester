{{brief}}

# Instructions
* DO NOT USE OLDER VERSIONS OF `{{packages.icons.name}}`, `{{packages.ui.name}}`, OR `{{packages.ds.name}}`.
* Install the design system, the legacy UI library, and icons:
  * `npm i {{packages.icons.name}}@{{packages.icons.version}}` – Confirm that the correct version is installed.
  * `npm i {{packages.ui.name}}@{{packages.ui.version}}` – Confirm that the correct version is installed.
  * `npm i {{packages.ds.name}}@{{packages.ds.version}}` – Confirm that the correct version is installed.
* In `package.json`, write the design-system dependency as exactly:
    `"{{packages.ds.name}}": "{{packages.ds.version}}"`
  Do NOT use a caret range (e.g. `^0.0.1`) for `{{packages.ds.name}}` — the published versions are pre-releases and caret ranges exclude pre-releases per semver.
* DO NOT import {{componentsQuoted}} from `{{packages.ui.name}}`. **NEVER USE THE EQUIVALENT LEGACY COMPONENTS FROM THE @sanity/ui PACKAGE.** These components are **superseded** by `{{packages.ds.name}}`.
* **Do NOT write your own versions of {{componentsQuoted}}.** They already exist in `{{packages.ds.name}}`. Use them directly.
* All other `{{packages.ui.name}}` components — `Avatar`, `Stack`, `Button`, `Badge`, `TextInput`, `Label`, `Tooltip`, `Menu`, `MenuItem`, `MenuButton`, `Toast`, `Popover`, etc. — continue to be imported from `{{packages.ui.name}}` as normal.

**Quick import reference:**

{{importTable}}

* Work within the constraints of `{{packages.ui.name}}` and `{{packages.ds.name}}`. **Do not make custom components if one exists in either library.**
* Use as few NPM packages as possible.
* Do not add unit tests of any kind.
* Provide feedback on areas of friction when using the design system, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.
{{#if requiresMcp}}

Use the design system MCP server to gain context on how to use `{{packages.ds.name}}`. Once connected, you can ask things like:
- *"List all {{packages.ds.name}} components"*
- *"When should I use Flex vs Box?"*
- *"Show me the best practices for using Text"*
{{/if}}
{{#unless requiresMcp}}

**Design system guidelines below**

---

{{docs}}
{{/unless}}
