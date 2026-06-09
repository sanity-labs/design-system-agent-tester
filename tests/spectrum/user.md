{{brief}}

# Instructions
* DO NOT USE OLDER VERSIONS OF `{{packages.ui.name}}`.
* DO NOT USE COMPONENTS FROM ANY OTHER DESIGN SYSTEM.
* Install the latest version:
  * `npm i {{packages.ui.name}}@{{packages.ui.version}}` – Confirm that the correct version is installed.
* Wrap the entire app in `<Provider theme={defaultTheme}>` at the root. Both `Provider` and `defaultTheme` are imported from `{{packages.ui.name}}`.
* Do NOT import a separate CSS file — React Spectrum ships styles through the Provider.
* Rely exclusively on React Spectrum's documentation site (https://react-spectrum.adobe.com/react-spectrum/) for guidance on how to use the UI library.
* The project should be built on top of Vite.
* Use as few NPM packages as possible.
* Do not add unit tests of any kind.
* Provide feedback on areas of friction when using the design system, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.
