{{brief}}

# Instructions
* DO NOT USE OLDER VERSIONS OF `@atlaskit/*` PACKAGES.
* DO NOT USE COMPONENTS FROM ANY OTHER DESIGN SYSTEM.
* Install layout primitives plus one package per component you use:
  * `npm i {{packages.ui.name}}@{{packages.ui.version}}` – the layout primitives (`Box`, `Inline`, `Stack`, `Grid`). Confirm the correct version is installed.
  * Install each additional `@atlaskit/*` component package on demand (e.g. `npm i @atlaskit/button @atlaskit/textfield @atlaskit/heading`).
* Do NOT import a separate CSS file from `@atlaskit/*` packages — styles ship via Compiled (CSS-in-JS).
* Rely exclusively on the Atlassian Design System documentation site (https://atlassian.design/) for guidance on how to use the UI library.
* The project should be built on top of Vite.
* Use as few NPM packages as possible.
* Do not add unit tests of any kind.
* Provide feedback on areas of friction when using the design system, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.
