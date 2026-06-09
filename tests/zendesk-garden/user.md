{{brief}}

# Instructions
* DO NOT USE OLDER VERSIONS OF `{{packages.ui.name}}` OR `{{packages.theming.name}}`.
* DO NOT USE COMPONENTS FROM ANY OTHER DESIGN SYSTEM.
* Install the packages:
  * `npm i {{packages.ui.name}}@{{packages.ui.version}}` – Confirm the correct version is installed.
  * `npm i {{packages.theming.name}}@{{packages.theming.version}}` – Confirm the correct version is installed.
  * `npm i styled-components@^6` – peer dependency that Garden requires.
  * If you need icons, also install `npm i @zendeskgarden/svg-icons` — they live in a separate package.
* Wrap the entire app in `<ThemeProvider>` at the root. `ThemeProvider` is imported from `@zendeskgarden/react-theming`. Components depend on this context and several throw without it.
* Do NOT import a separate CSS file from `@zendeskgarden/*` — styles ship via styled-components.
* Rely exclusively on the Zendesk Garden documentation site (https://garden.zendesk.com/) for guidance on how to use the UI library.
* The project should be built on top of Vite.
* Use as few NPM packages as possible.
* Do not add unit tests of any kind.
* Provide feedback on areas of friction when using the design system, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.
