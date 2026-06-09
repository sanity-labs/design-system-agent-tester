{{brief}}

# Instructions
* DO NOT USE OLDER VERSIONS OF `{{packages.ui.name}}` OR `{{packages.styles.name}}`.
* DO NOT USE COMPONENTS FROM ANY OTHER DESIGN SYSTEM.
* Install both packages:
  * `npm i {{packages.ui.name}}@{{packages.ui.version}}` – Confirm the correct version is installed.
  * `npm i {{packages.styles.name}}@{{packages.styles.version}}` – Confirm the correct version is installed.
* You MUST import `@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.min.css` in your main entry point (e.g. `src/main.tsx`).
* Wire up the icon sprites: either copy `node_modules/@salesforce-ux/design-system/assets/icons/` into `public/assets/icons/` at build time, or configure Vite's static-asset handling so the sprites are served at `/assets/icons/...`. Set `<IconSettings iconPath="/assets/icons">` once at the app root.
* Rely exclusively on the Lightning Design System React documentation site (https://react.lightningdesignsystem.com/) for guidance on how to use the UI library.
* The project should be built on top of Vite.
* Use as few NPM packages as possible.
* Do not add unit tests of any kind.
* Provide feedback on areas of friction when using the design system, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.
