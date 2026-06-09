{{brief}}

# Instructions
* DO NOT USE OLDER VERSIONS OF `{{packages.ui.name}}` OR `{{packages.styles.name}}`.
* DO NOT USE COMPONENTS FROM ANY OTHER DESIGN SYSTEM.
* Install the latest versions of each package:
  * `npm i {{packages.ui.name}}@{{packages.ui.version}}` – Confirm that the correct version is installed.
  * `npm i {{packages.styles.name}}@{{packages.styles.version}}` – Confirm that the correct version is installed.
* You MUST import `@carbon/styles/css/styles.css` in your main entry point (e.g. `src/main.tsx`).
* Rely exclusively on Carbon's React documentation site (https://react.carbondesign.systems) for guidance on how to use the UI library.
* The project should be built on top of Vite.
* Use as few NPM packages as possible.
* Do not add unit tests of any kind.
* Provide feedback on areas of friction when using the design system, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.
