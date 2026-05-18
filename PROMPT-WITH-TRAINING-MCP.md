[ADD PROMPT HERE]  

# Instructions
* DO NOT USE OLDER VERSIONS OF SANITY ICONS OR SANITY UI.
* Use the latest version of Sanity Icons and Sanity UI for the interface. YOU ARE NOT ALLOWED INSTALL A SPECIFIC VERSION. YOU HAVE TO EXPLICITLY INSTALL THE LATEST VERSION OF EACH PACKAGE WITH THE FOLLOWING COMMANDS:
  * Sanity icons: `npm i @sanity/icons@latest`
  * Sanity UI: `npm i @sanity/ui@latest`
  * Sanity Design System: `npm i @sanity-labs/design-system@0.0.1-alpha.0`
* DO NOT import `Box`, `Flex`, `Grid`, `Text`, `Heading`, `Card` or `Divider` from `@sanity/ui`. These components are **superseded** by the Sanity Design System package.

  **Do NOT write your own versions of Box, Flex, Grid, Text, Heading, Card or Divider.** They already exist in Sanity Design System. Use them directly.

  All other components — `Avatar`, `Stack`, `Button`, `Badge`, `TextInput`, `Label`, `Tooltip`, `Menu`, `MenuItem`, `MenuButton`, `Toast`, `Popover`, etc. — continue to be imported from `@sanity/ui` as normal.

  **Quick import reference:**

  | Component | Import from |
  |-----------|-------------|
  | `Box` | `@sanity-labs/design-system` |
  | `Flex` | `@sanity-labs/design-system` |
  | `Grid` | `@sanity-labs/design-system` |
  | `Text` | `@sanity-labs/design-system` |
  | `Heading` | `@sanity-labs/design-system` |
  | `Card` | `@sanity-labs/design-system` |
  | `Divider` | `@sanity-labs/design-system` |
  | Everything else | `@sanity/ui` |

* Work within the constraints of Sanity UI the Sanity Design System package. **Do not make custom components if one exists in either library.**

Use the Sanity Design System MCP server to gain context on how to use Sanity Design System. Once connected, you can ask your AI assistant things like:
- *"List all Sanity Design System components"*
- *"When should I use Flex vs Box?"*
- *"Show me the best practices for using Text"*
