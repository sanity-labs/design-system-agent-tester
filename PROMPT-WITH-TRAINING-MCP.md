Create a simple interface that mimics Sanity Studio using Sanity UI.  

# Instructions
* DO NOT USE OLDER VERSIONS OF SANITY ICONS OR SANITY UI.
* Use the latest version of Sanity Icons and Sanity UI for the interface. YOU ARE NOT ALLOWED INSTALL A SPECIFIC VERSION. YOU HAVE TO EXPLICITLY INSTALL THE LATEST VERSION OF EACH PACKAGE WITH THE FOLLOWING COMMANDS:
  * Sanity icons: `npm i @sanity/icons@latest`
  * Sanity UI: `npm i @sanity/ui@latest`
* DO NOT import `Box`, `Flex`, `Grid`, or `Divider` from `@sanity/ui`. These four components are **superseded** by the `ui-poc` package, which will be present in your project at `./ui-poc/packages/ui/src/`. Import them like this:

  ```tsx
  import { Box }     from './ui-poc/packages/ui/src/components/Box'
  import { Flex }    from './ui-poc/packages/ui/src/components/Flex'
  import { Grid }    from './ui-poc/packages/ui/src/components/Grid'
  import { Divider } from './ui-poc/packages/ui/src/components/Divider'
  ```

  Add `classnames` to your `package.json` dependencies — the `ui-poc` components require it:

  ```json
  "classnames": "^2.5.1"
  ```

  **Do NOT write your own versions of Box, Flex, Grid, or Divider.** They already exist in `./ui-poc/packages/ui/src/components/`. Use them directly.

  All other `@sanity/ui` components — `Card`, `Stack`, `Heading`, `Text`, `Button`, `Badge`, `TextInput`, `Label`, `Tooltip`, `Menu`, `MenuItem`, `MenuButton`, `Toast`, `Popover`, etc. — continue to be imported from `@sanity/ui` as normal.

  **Quick import reference:**

  | Component | Import from |
  |-----------|-------------|
  | `Box` | `./ui-poc/packages/ui/src/components/Box` |
  | `Flex` | `./ui-poc/packages/ui/src/components/Flex` |
  | `Grid` | `./ui-poc/packages/ui/src/components/Grid` |
  | `Divider` | `./ui-poc/packages/ui/src/components/Divider` |
  | Everything else | `@sanity/ui` |
* Before building, develop a plan and engage with the Sanity UI MCP server to gain context on the components and icons. Do not write any code until reading the quick start guide.
* Before implementing components or icons, learn how to use them with the Sanity UI MCP server.
* The project should be built on top of Vite
* Use as few NPM packagess as possible 
* Do not add unit tests of any kind
* Provide feedback on areas of friction when using Sanity UI, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.

Use the Sanity UI MCP server to gain context on how to use Sanity UI. Once connected, you can ask your AI assistant things like:
- *"List all Sanity UI components"*
- *"What props does the Button component accept?"*
- *"When should I use Dialog vs Popover?"*
- *"What are the accessibility requirements for the Autocomplete component?"*
- *"Show me the best practices for using Toast"*
- *"Search for components related to navigation"*
- *"What icons are available for actions?"*
- *"Give me the implementation checklist for the Menu component"*
