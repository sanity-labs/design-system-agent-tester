{{brief}}

# Instructions
* DO NOT USE OLDER VERSIONS OF `{{packages.ui.name}}` OR `{{packages.styles.name}}`.
* DO NOT USE COMPONENTS FROM ANY OTHER DESIGN SYSTEM.
* Install both packages:
  * `npm i {{packages.ui.name}}@{{packages.ui.version}}` – Confirm the correct version is installed.
  * `npm i {{packages.styles.name}}@{{packages.styles.version}}` – Confirm the correct version is installed.
  * If you need icons, also install `npm i @nordhealth/icons` — they live in a separate package.
* You MUST import the Nord stylesheet in your main entry point (e.g. `src/main.tsx`): `import "@nordhealth/css";`
* Prefer the React bindings (`<Button>`, `<Card>`, etc.) over the raw Web Component tags (`<n-button>`) — the bindings handle prop typing and ref forwarding.
* Rely exclusively on the Nord documentation site (https://nordhealth.design/) for guidance on how to use the UI library.
* The project should be built on top of Vite.
* Use as few NPM packages as possible.
* Do not add unit tests of any kind.
* Provide feedback on areas of friction when using the design system, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.
