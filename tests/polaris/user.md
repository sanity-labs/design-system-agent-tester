{{brief}}

# Instructions
* DO NOT USE OLDER VERSIONS OF `{{packages.ui.name}}`.
* DO NOT USE COMPONENTS FROM ANY OTHER DESIGN SYSTEM.
* Install the package:
  * `npm i {{packages.ui.name}}@{{packages.ui.version}}` – Confirm the correct version is installed.
  * If you need icons, also install `npm i @shopify/polaris-icons` — they live in a separate package.
* You MUST import `@shopify/polaris/build/esm/styles.css` in your main entry point (e.g. `src/main.tsx`).
* Wrap the entire app in `<AppProvider i18n={enTranslations}>` at the root. `AppProvider` is imported from `{{packages.ui.name}}` and `enTranslations` from `@shopify/polaris/locales/en.json`. Components rely on this i18n context and will throw without it.
* Rely exclusively on the Polaris documentation site (https://polaris.shopify.com/) for guidance on how to use the UI library.
* The project should be built on top of Vite.
* Use as few NPM packages as possible.
* Do not add unit tests of any kind.
* Provide feedback on areas of friction when using the design system, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.
