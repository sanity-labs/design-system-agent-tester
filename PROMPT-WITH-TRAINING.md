[ADD PROMPT HERE]  

# Instructions
* DO NOT USE OLDER VERSIONS OF SANITY ICONS OR SANITY UI.
* Use the latest version of Sanity Icons and Sanity UI for the interface. YOU ARE NOT ALLOWED INSTALL A SPECIFIC VERSION. YOU HAVE TO EXPLICITLY INSTALL THE LATEST VERSION OF EACH PACKAGE WITH THE FOLLOWING COMMANDS:
  * Sanity icons: `npm i @sanity/icons@latest`
  * Sanity UI: `npm i @sanity/ui@latest`
* DO NOT import `Box`, `Flex`, `Grid`, `Text`, `Heading`, `Divider`, or `Card` from `@sanity/ui`. These four components are **superseded** by the `ui-poc` package, which will be present in your project at `./ui-poc/packages/ui/src/`. Import them like this:

  ```tsx
  import { Box }     from './ui-poc/packages/ui/src/components/Box'
  import { Flex }    from './ui-poc/packages/ui/src/components/Flex'
  import { Grid }    from './ui-poc/packages/ui/src/components/Grid'
  import { Text }    from './ui-poc/packages/ui/src/components/Text'
  import { Heading } from './ui-poc/packages/ui/src/components/Heading'
  import { Divider } from './ui-poc/packages/ui/src/components/Divider'
  import { Card }    from './ui-poc/packages/ui/src/components/Card'
  ```

  Add `classnames` to your `package.json` dependencies — the `ui-poc` components require it:

  ```json
  "classnames": "^2.5.1"
  ```

  **Do NOT write your own versions of Box, Flex, Grid, or Divider.** They already exist in `./ui-poc/packages/ui/src/components/`. Use them directly.

  All other `@sanity/ui` components — `Avatar`, `Stack`, `Button`, `Badge`, `TextInput`, `Label`, `Tooltip`, `Menu`, `MenuItem`, `MenuButton`, `Toast`, `Popover`, etc. — continue to be imported from `@sanity/ui` as normal.


  **Quick import reference:**

  | Component | Import from |
  |-----------|-------------|
  | `Box` | `./ui-poc/packages/ui/src/components/Box` |
  | `Flex` | `./ui-poc/packages/ui/src/components/Flex` |
  | `Grid` | `./ui-poc/packages/ui/src/components/Grid` |
  | `Text` | `./ui-poc/packages/ui/src/components/Text` |
  | `Heading` | `./ui-poc/packages/ui/src/components/Heading` |
  | `Divider` | `./ui-poc/packages/ui/src/components/Divider` |
  | Everything else | `@sanity/ui` |

* Work within the constraints of Sanity UI the `ui-poc` package. **Do not make custom components if one exists in either library.**
* Rely on the guidelines below for guidance on how to use the UI library.
* The project should be built on top of Vite
* Use as few NPM packagess as possible 
* Do not add unit tests of any kind
* Provide feedback on areas of friction when using Sanity UI, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.

**Sanity UI guidelines below**

---

# Quick start

This guide walks you through setting up a Sanity UI project from scratch. By the end, you will have a working Vite + React app. It includes a sidebar, toolbar, content area, and proper accessibility structure.

## Import sources — the one rule to memorize

Components come from **two** packages. Importing from the wrong one produces **no TypeScript error and no runtime warning** — the component silently renders with a different API.

| Import from `'ui'` (ui-poc) | Import from `'@sanity/ui'` |
|------------------------------|----------------------------|
| `Box` | `Badge` |
| `Card` | `Button` |
| `Divider` | `Checkbox`, `Dialog` |
| `Flex` | `Inline`, `Label` |
| `Grid` | `Menu`, `MenuButton`, `MenuItem`, `MenuDivider` |
| `Heading` | `Popover`, `Select`, `Spinner`, `Stack` |
| `Text` | `Switch`, `Tab`, `TabList`, `TabPanel` |
| | `TextArea`, `TextInput`, `Tooltip` |
| | `ThemeProvider`, `studioTheme`, `buildTheme` |
| | `ToastProvider`, `useToast` |

```tsx
// ui-poc layout primitives
import { Box, Flex, Grid, Card, Heading, Text, Divider } from 'ui'

// everything else
import { Button, Stack, Badge, TextInput, Select, Label } from '@sanity/ui'
import { SearchIcon, CloseIcon } from '@sanity/icons'
```

> ⛔ If a Box, Flex, Card, Heading, or Text renders with unexpected behavior and no error, **check the import source first.** This is the #1 cause of silent failures across all test runs.

---

## Create the project

Start with a Vite project and add the packages Sanity UI needs.

```sh
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install @sanity/ui @sanity/icons styled-components classnames
```

⛔ **You must use `@vitejs/plugin-react` (Babel), not the SWC variant.** `@sanity/ui` uses `styled-components`, which requires Babel for correct behavior. Using the SWC plugin causes styled-components to silently produce unstyled or broken output — no error is thrown.

The default Vite template now installs SWC. Always verify which plugin your project uses:

```sh
npm install @vitejs/plugin-react
# then check vite.config.ts — it must import from '@vitejs/plugin-react', not '@vitejs/plugin-react-swc'
```

If your `vite.config.ts` imports `@vitejs/plugin-react-swc`, replace it with `@vitejs/plugin-react`. The failure is completely silent — styled-components renders without styles and no error message points to the cause.

## Known pitfalls — read before writing any code

The following failures have **no error message, no TypeScript warning, and no console output**. They are the most common reasons a working-looking implementation silently breaks.

| Pitfall | Symptom | One-line fix |
|---------|---------|-------------|
| Layout props on `Card` | Layout broken, no error | Wrap in `<Box flexGrow={1}>` |
| `Heading` without `level` | Wrong `<h2>` in heading hierarchy | `<Heading level={1}>` |
| `tone="primary"` on Button | Fails WCAG AA contrast silently | Use `tone="default"` |
| `Stack` with `gap` / `Flex` with `space` | Spacing ignored | `Flex`→`gap`, `Stack`→`space` |
| Wrong package import | Different API, no error | `Box`/`Flex`/`Card`/`Heading`/`Text` → `import from 'ui'` |
| `styles.css` not imported | All components unstyled | Import in `main.tsx` (see below) |
| SWC plugin instead of Babel | Styled-components unstyled | Use `@vitejs/plugin-react` |

See `silent-failures.md` for the full reference including `MenuButton`, `Tooltip`, `--card-border-color`, and more.

---

## Project structure

After setup, you will have these files:

```text
my-app/
├── index.html
├── package.json
├── vite.config.ts
├── ui-poc/                  ← already present in your project root
│   └── packages/
│       └── ui/
│           └── src/
│               ├── index.ts
│               ├── styles.css
│               └── components/
│                   ├── Box.tsx
│                   ├── Flex.tsx
│                   ├── Grid.tsx
│                   ├── Heading.tsx
│                   ├── Text.tsx
│                   └── Card.tsx
└── src/
    ├── main.tsx
    ├── App.tsx
    └── reduced-motion.css
```

## Import `ui-poc` components

⛔ **`styles.css` must be imported or nothing will render correctly — and no error will tell you why.**

Omitting this import causes all ui-poc components (Box, Flex, Grid, Heading, Text, Card, Divider) to render as bare, unstyled HTML elements. No console error is thrown. No TypeScript warning fires. No hint appears anywhere that the import is missing. This is the most commonly missed setup step.

Import it in `main.tsx` — see that section below.

```tsx
// Box, Flex, Grid, Divider, Heading, Text, and Card come from ui-poc — NOT from @sanity/ui
// With the Vite alias configured, 'ui' is the canonical import:
import { Box, Flex, Grid, Card, Heading, Text, Divider } from 'ui'
// Without the alias (e.g. in a file that can't use the alias), use the full path:
import { Box }     from '../ui-poc/packages/ui/src/components/Box'
import { Flex }    from '../ui-poc/packages/ui/src/components/Flex'
import { Grid }    from '../ui-poc/packages/ui/src/components/Grid'
import { Divider } from '../ui-poc/packages/ui/src/components/Divider'
import { Heading } from '../ui-poc/packages/ui/src/components/Heading'
import { Text }    from '../ui-poc/packages/ui/src/components/Text'
import { Card }    from '../ui-poc/packages/ui/src/components/Card'
```

## index.html

Set `lang="en"` on the `<html>` element. Without it, screen readers cannot detect the page language (WCAG 3.1.1 A).

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## reduced-motion.css

Sanity UI buttons and interactive parts apply `transition-duration: 0.1s` through styled-components. These transitions do not respect `prefers-reduced-motion` at the library level. This file overrides them. Import it in `main.tsx`. Every project needs it.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## vite.config.ts

Add a Vite alias so that `import { Box } from 'ui'` resolves to the ui-poc source. Also set up the `@vitejs/plugin-react` plugin.

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      ui: fileURLToPath(
        new URL('./ui-poc/packages/ui/src', import.meta.url),
      ),
    },
  },
})
```

## main.tsx

Wrap the app in `ThemeProvider` with `studioTheme` and `ToastProvider`. Both are required. `ToastProvider` must be **inside** `ThemeProvider`. Import `reduced-motion.css` and the compiled ui-poc styles here.

**`studioTheme` vs `buildTheme()`.** The quick-start uses `studioTheme` from `@sanity/ui` — a ready-made theme. You can also use `buildTheme()` from `@sanity/ui/theme`, which produces the same result. Use `buildTheme()` when you need to pass custom options.

**`ToastProvider` is required for `useToast()`.** It is NOT included in `ThemeProvider`. Omitting it causes a runtime error with no helpful message. Always include it in your provider stack. See `toast.md` for the full API.

```tsx
import { createRoot } from 'react-dom/client'
import { ThemeProvider, studioTheme, ToastProvider } from '@sanity/ui'
import App from './App'
import './reduced-motion.css'
import '../ui-poc/packages/ui/src/styles.css'

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={studioTheme}>
    <ToastProvider>
      <App />
    </ToastProvider>
  </ThemeProvider>,
)
```

> ⚠ **Both imports are required.**
> - `reduced-motion.css` — suppresses animations for users with vestibular disorders.
> - `ui-poc/…/styles.css` — **required for all ui-poc component styles** (Box, Flex, Grid, Heading, Text, Card). Without this import, components render silently unstyled with no error messages.
>
> **If `Box`, `Flex`, or `Grid` appear to have no borders, padding, or layout behaviour, this import is missing.**

## App.tsx — full scaffold

This file creates a three-region layout. It includes a navigation sidebar, a main content area with a toolbar, and a document list. It follows the accessibility standards from the component documentation.

```tsx
import { useState } from 'react'
import {
  Stack,
  Button,
  TextInput,
  Badge,
} from '@sanity/ui'

// Box, Flex, Grid, Divider, Heading, Text, and Card come from ui-poc — NOT from @sanity/ui
import { Box }     from '../ui-poc/packages/ui/src/components/Box'
import { Flex }    from '../ui-poc/packages/ui/src/components/Flex'
import { Heading } from '../ui-poc/packages/ui/src/components/Heading'
import { Text }    from '../ui-poc/packages/ui/src/components/Text'
import { Card }    from '../ui-poc/packages/ui/src/components/Card'

import { SearchIcon, AddIcon, MenuIcon, CloseIcon } from '@sanity/icons'

const DOCUMENTS = ['Getting Started', 'API Reference', 'Design Tokens']

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  return (
    <Flex flexWrap="wrap" minHeight="100vh">
      {/* Navigation sidebar — renders as <nav> landmark */}
      {sidebarOpen && (
        <Box
          as="nav"
          aria-label="Main navigation"
          borderRight
          width="260px"
          flexShrink={0}
          overflowY="auto"
        >
          <Stack>
            <Box padding={3} borderBottom>
              <Flex alignItems="center" justifyContent="space-between">
                <Heading level={2}>Studio</Heading>
                <Button
                  mode="bleed"
                  icon={CloseIcon}
                  aria-label="Close navigation"
                  onClick={() => setSidebarOpen(false)}
                />
              </Flex>
            </Box>
            <Box padding={3}>
              <Stack space={4}>
                <TextInput
                  id="nav-search"
                  icon={SearchIcon}
                  placeholder="Search content..."
                  aria-label="Search content"
                />
                <Stack space={3}>
                  <Text size={1} weight="medium">Documents</Text>
                  <Text size={1} muted>Authors</Text>
                  <Text size={1} muted>Settings</Text>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Box>
      )}
      {/* Main content — renders as <main> landmark */}
      <Flex
        as="main"
        flexDirection="column"
        flexGrow={1}
        flexShrink={1}
        flexBasis="0"
        minWidth="0"
        overflow="hidden"
      >
        {/* Toolbar */}
        <Box padding={3} borderBottom>
          <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Flex alignItems="center" gap={3} minWidth="0">
              {!sidebarOpen && (
                <Button
                  mode="bleed"
                  icon={MenuIcon}
                  aria-label="Show navigation"
                  onClick={() => setSidebarOpen(true)}
                />
              )}
              <Heading
                level={1}
                lines={1}
              >
                All Documents
              </Heading>
            </Flex>
            <Button text="New document" icon={AddIcon} tone="default" />
          </Flex>
        </Box>
        {/* Content list */}
        <Box padding={4} flexGrow={1} overflowY="auto">
          <Stack space={3}>
            {DOCUMENTS.map((title) => (
              <Card key={title}>
                <Flex alignItems="center" justifyContent="space-between">
                  <Stack space={2}>
                    <Heading level={2}>{title}</Heading>
                    <Text size={1} muted>Last edited 2 hours ago</Text>
                  </Stack>
                  <Badge tone="positive">Published</Badge>
                </Flex>
              </Card>
            ))}
          </Stack>
        </Box>
      </Flex>
    </Flex>
  )
}

export default App
```

## Run it

```sh
npm run dev
```

Open `http://localhost:5173` in a browser. You should see a sidebar with a search field on the left and a document list on the right.

## What the scaffold gives you

| **Feature** | **How it works** |
| --- | --- |
| Landmark structure | `Box as="nav"` or `Flex as="nav"` and `Flex as="main"` create `<nav>` and `<main>` elements. Screen readers list them as landmarks. |
| Responsive sidebar | `width="260px"` on the sidebar and `flexWrap="wrap"` on the outer Flex container. At 320px the sidebar stacks above the content instead of overflowing. |
| Toolbar reflow | `flexWrap="wrap"` on the toolbar Flex. The heading and button flow to separate lines at narrow widths instead of overflowing. |
| Heading hierarchy | One `<h1>` for the content area title ("All Documents"). `<h2>` for the sidebar name and each document card heading. No levels are skipped. |
| Page language | `<html lang="en">` in `index.html`. |
| Icon-only buttons | `aria-label` on every button that has no visible text (`CloseIcon`, `MenuIcon`). |
| Form input | `aria-label` on the search `TextInput` provides an accessible name for screen readers. |
| Reduced motion | `reduced-motion.css` cancels transitions when the user prefers reduced motion. |

## Key patterns to remember

### ThemeProvider wraps everything

Every Sanity UI component reads color, spacing, and font values from the theme. Without `ThemeProvider`, components render with no styles.

```tsx
import { ThemeProvider, studioTheme } from '@sanity/ui'

<ThemeProvider theme={studioTheme}>
  {/* All Sanity UI components go here */}
</ThemeProvider>
```

### Box and Flex are structural containers

Box and Flex handle structural layout — landmarks, toolbars, padding regions, and scroll containers. They do not add a background color or visual surface. Use them anywhere you are grouping or positioning elements without needing a distinct content surface.

```tsx
// Box, Flex, Heading, Text, and Card come from ui-poc — NOT from @sanity/ui
import { Box }     from '../ui-poc/packages/ui/src/components/Box'
import { Flex }    from '../ui-poc/packages/ui/src/components/Flex'
import { Heading } from '../ui-poc/packages/ui/src/components/Heading'
import { Text }    from '../ui-poc/packages/ui/src/components/Text'
import { Card }    from '../ui-poc/packages/ui/src/components/Card'

// Everything else comes from @sanity/ui
import { Button } from '@sanity/ui'
```

```jsx
{/* Navigation sidebar — structural landmark, no card surface */}
<Box
  as="nav"
  aria-label="Main navigation"
  borderRight
  width="260px"
  flexShrink={0}
>
  {/* Sidebar header — a structural divider, not a card */}
  <Box padding={3} borderBottom>
    <Flex alignItems="center" justifyContent="space-between">
      <Heading level={2}>Studio</Heading>
    </Flex>
  </Box>
  {/* content */}
</Box>

{/* Main content area — structural landmark, Flex for column direction */}
<Flex
  as="main"
  flexDirection="column"
  flexGrow={1}
  flexShrink={1}
  flexBasis="0"
  minWidth="0"
  overflow="hidden"
>
  {/* Toolbar — structural section, not a card */}
  <Box padding={3} borderBottom>
    {/* content */}
  </Box>
</Flex>
```

### Card is a content surface

Card renders a distinct visual surface with a background, border, and optional tone. Use it to group related content that deserves its own visual container. Do not use Card for structural UI regions like sidebars, toolbars, or scroll containers — those are layout, not content surfaces.

**Density quick reference** — Card uses `density` instead of separate `padding` and `radius` props:

| `density` | Padding | Radius | Use when |
|-----------|---------|--------|----------|
| `"tight"` | 8px | 3px | High-density lists, compact items |
| `"medium"` (default) | 12px | 7px | Standard content cards |
| `"loose"` | 20px | 11px | Low-density layouts, featured cards |

```jsx
{/* ✓ A content surface — grouped content on a distinct background */}
<Card>
  <Flex alignItems="center" justifyContent="space-between">
    <Stack space={2}>
      <Heading level={2}>Document title</Heading>
      <Text size={1} muted>Last edited 2 hours ago</Text>
    </Stack>
    <Badge tone="positive">Published</Badge>
  </Flex>
</Card>

{/* ✗ Card used as a toolbar — use Box instead */}
<Card>
  <Flex alignItems="center" justifyContent="space-between">
    <Heading level={1}>All Documents</Heading>
    <Button text="New document" icon={AddIcon} />
  </Flex>
</Card>
```

### Stack spaces children in a vertical column

Stack adds even spacing between children. The prop is `space`, not `gap`. (`Flex` uses `gap`; `Stack` uses `space`. They are different props on different components.)

```jsx
<Stack space={3}>
  <Heading level={2}>Title</Heading>
  <Text size={1}>Description</Text>
</Stack>
```

### Flex lays children out in a row

Flex defaults to horizontal direction. Use `alignItems`, `justifyContent`, `gap`, and `flexWrap` to control the layout.

> ⚠️ **Every Flex with 2+ children must set `flexWrap="wrap"`.** This includes both the outer page layout and any inner toolbars or action rows. Missing wrap on even one Flex causes a 320px reflow failure (WCAG 1.4.10 AA). See `flex.md` → Accessibility → Reflow checklist.

```jsx
<Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
  <Heading level={1}>Page Title</Heading>
  <Button text="Action" />
</Flex>
```

### Heading needs a `level` prop

The ui-poc Heading renders `<h2>` by default when you omit `level`. That means silently using the wrong heading level for the content hierarchy. Always set `level` explicitly. Use `size` for visual sizing — size and heading level are independent.

```jsx
{/* ✗ Defaults to <h2> — may be the wrong semantic level for this context */}
<Heading size={0}>Title</Heading>

{/* ✓ Renders as <h1> — the content area page title */}
<Heading level={1} size={0}>Page Title</Heading>

{/* ✓ Renders as <h2> — sidebar name, section headings, list items */}
<Heading level={2} size={0}>Section Title</Heading>
```

### Icon-only buttons need aria-label

When a button has only an icon and no `text` prop, add `aria-label`. The `tooltip` prop does not set an accessible name — it is only visible on hover and does not reach screen readers.

```jsx
{/* ✗ No accessible name */}
<Button icon={SearchIcon} mode="bleed" />

{/* ✓ Screen readers announce "Search" */}
<Button icon={SearchIcon} mode="bleed" aria-label="Search" />
```

### Form inputs always need a Label

Every `Select`, `TextInput`, `TextArea`, and `Switch` must be wrapped in a `Stack` with an associated `Label`. A bare input with no label is an axe `select-name` critical violation (WCAG 4.1.2 A).

```tsx
{/* ✗ — axe critical: no accessible name */}
<Select onChange={handleChange}>...</Select>

{/* ✓ — required for all form inputs */}
<Stack space={1}>
  <Label htmlFor="category">Category</Label>
  <Select id="category" onChange={handleChange}>...</Select>
</Stack>
```

The same pattern applies to `TextInput`, `TextArea`, and `Switch`. See `select.md`, `textinput.md`, `textarea.md`, and `switch.md`.

## Next steps

- Add an inspector sidebar with `Box as="aside" aria-label="Inspector"`.
- Add a `Menu` and `MenuButton` for dropdown actions. `MenuButton` requires an `id` prop for ARIA and a `popover` prop with `portal: true` inside `overflow: hidden` containers. See `menu.md`.
- Use `tone` on Card and Button to show status (`"positive"`, `"caution"`, `"critical"`). Pair each tone with an icon. Do not use `tone="primary"` in default mode — it fails contrast.
- Use `useToast()` for async action feedback. See `toast.md` for the full `toast.push()` API.
- **Custom brand colors (warm backgrounds, dark sidebars, amber accents):** Override existing Sanity UI palette tokens (`--gray-*`, `--blue-*`, etc.) on `:root` in `global.css`. Use `Card inverted` for dark regions. Do not use inline `style={{ background }}` or `style={{ color }}` on Sanity UI components. See `patterns-custom-theming.md`.
- See the component docs for Button, Card, Stack, Flex, Box, Heading, and Text for full prop references and accessibility guidelines.

---

## Available components

All components come from one of two packages. Importing from the wrong source produces no error but silently renders the wrong component.

### From `ui` (ui-poc)

```tsx
import { Box, Flex, Grid, Card, Heading, Text, Divider } from 'ui'
```

| Component | Purpose |
|-----------|---------|
| `Box` | Structural container — padding, margin, borders, sizing, overflow |
| `Flex` | One-dimensional layout — row or column with alignment and gap |
| `Grid` | Two-dimensional layout — rows and columns |
| `Card` | Content surface — background, border, tone, density |
| `Heading` | Semantic heading (`level` 1–6, visual `size` 0–5) |
| `Text` | Body copy, captions, metadata (`size` 0–4, `color`, `muted`, `lines`) |
| `Divider` | Horizontal rule — thematic break between sections |

### From `@sanity/ui`

```tsx
import {
  Avatar, Badge, Button, Checkbox,
  Dialog, Inline, Label,
  Menu, MenuButton, MenuDivider, MenuItem,
  Popover, Select, Spinner, Stack, Switch,
  Tab, TabList, TabPanel,
  TextArea, TextInput, Tooltip,
  ThemeProvider, studioTheme, buildTheme,
  ToastProvider, useToast,
} from '@sanity/ui'
```

| Component | Purpose |
|-----------|---------|
| `Avatar` | User profile photo or initials |
| `Badge` | Small status or count label |
| `Button` | Action trigger — modes: `default`, `ghost`, `bleed` |
| `Checkbox` | Boolean form input |
| `Dialog` | Modal overlay |
| `Inline` | Horizontal wrapping row for variable-width items |
| `Label` | Form field label — always pair with `htmlFor` |
| `Menu` | Dropdown menu container |
| `MenuButton` | Button that opens a Menu — requires `id` prop |
| `MenuDivider` | Separator inside a Menu |
| `MenuItem` | Clickable item inside a Menu |
| `Popover` | Non-modal floating panel |
| `Select` | Native dropdown — one value from a fixed list. See `select.md`. |
| `Spinner` | Loading indicator |
| `Stack` | Vertical column with even `space` between children |
| `Switch` | Toggle for boolean settings |
| `Tab` / `TabList` / `TabPanel` | Tabbed navigation |
| `TextArea` | Multi-line text input |
| `TextInput` | Single-line text input. See `textinput.md`. |
| `Tooltip` | Hover/focus label for icon-only elements |
| `ThemeProvider` | Root theme context — required at app root |
| `studioTheme` | Pre-built theme object |
| `buildTheme()` | Customisable theme builder |
| `ToastProvider` | Required for `useToast()` — must be inside `ThemeProvider` |
| `useToast()` | Hook to push toast notifications |

### Not available — use native HTML

| Need | Use instead |
|------|-------------|
| Multi-line text | `TextArea` from `@sanity/ui` |
| Date / time picker | Native `<input type="date">` / `<input type="time">` |
| Multi-select | Composed `Checkbox` list |
| Data table | Native `<table>` — see `table.md` |
| Navigation item | `Menu` + `MenuItem` or `Button mode="bleed"` — see `patterns-navigation.md` |

# Code style guide

Conventions for writing reliable, consistent code with the Sanity UI system. These rules address the most common sources of silent failures and build errors observed across iterative development.

---

## String literals

### Use template literals or double quotes for strings containing apostrophes

Single-quoted strings break at apostrophes. This causes a Vite build error (`Expected "}" but found "s"`) that is not always clearly reported — especially inside large hardcoded data objects.

```tsx
// ✗ — apostrophe inside single-quoted string causes a build error
const abstract = 'Fatima\'s approach to roadmapping cut the team\'s delivery time.'

// ✓ — template literal
const abstract = `Fatima's approach to roadmapping cut the team's delivery time.`

// ✓ — double quotes
const abstract = "Fatima's approach to roadmapping cut the team's delivery time."
```

**Rule:** Use template literals for all multi-word string values in hardcoded data. Reserve single quotes for short identifiers and prop values that contain no natural language.

---

## Imports

### Always import from the correct package

Box, Flex, Grid, Card, Heading, Text, and Divider come from `ui` (ui-poc). Everything else comes from `@sanity/ui`. Importing from the wrong source produces no TypeScript error and no runtime warning — the component silently renders with the wrong API.

```tsx
// ✗ — Box from @sanity/ui has a completely different API
import { Box, Flex, Card } from '@sanity/ui'

// ✓ — layout primitives from ui-poc
import { Box }  from '../ui-poc/packages/ui/src/components/Box'
import { Flex } from '../ui-poc/packages/ui/src/components/Flex'
import { Card } from '../ui-poc/packages/ui/src/components/Card'

// ✓ — everything else from @sanity/ui
import { Button, Stack, Badge, TextInput, TextArea } from '@sanity/ui'
```

See `quick-start.md` — "Available components" — for the full import source reference.

### Use named imports only

```tsx
// ✗ — imports the entire library
import * as SanityUI from '@sanity/ui'

// ✓ — tree-shakeable named imports
import { Button, Stack } from '@sanity/ui'
import { SearchIcon } from '@sanity/icons'
```

---

## Props vs inline styles

### Always prefer props over `style={{}}`

Every visual attribute that has a prop equivalent must use the prop. Inline styles bypass the spacing scale, break dark mode, and are not responsive-array aware.

```tsx
// ✗
<Box style={{ padding: '12px', width: '260px', overflow: 'hidden' }} />

// ✓
<Box padding={3} width="260px" overflow="hidden" />
```

**Inline styles are only acceptable for:**
- Values with no prop equivalent (e.g. `transform`, `gridTemplateAreas`)
- CSS custom property overrides for a specific instance
- Raw `<table>`, `<textarea>`, and other native elements with no Sanity UI equivalent

See `box.md` → "Inline style alternatives" for the full lookup table.

---

## TypeScript

### Event handlers: use `currentTarget`, not `target`

> **This is the canonical reference for input event handling in Sanity UI.** The `select.md`, `textinput.md`, and `textarea.md` docs all follow this same pattern. When in doubt, refer here.

Sanity UI input components (`TextInput`, `Select`, `TextArea`) wrap native browser events. Use `event.currentTarget` to read values and cast the event type explicitly.

```tsx
// ✗ — event.target may be the wrong type
<TextInput onChange={(e) => setValue(e.target.value)} />

// ✓
<TextInput
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.currentTarget.value)
  }}
/>

// ✓ — same pattern for Select
<Select
  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.currentTarget.value)
  }}
/>

// ✓ — Switch uses checked, not value
<Switch
  checked={isEnabled}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
    setIsEnabled(e.currentTarget.checked)  // boolean, not string
  }}
/>
```

### Responsive arrays: use `null` to inherit, not `undefined`

`null` is the documented skip value for responsive arrays. `undefined` is accepted by TypeScript but does not reliably inherit the previous breakpoint's value.

```tsx
// ✗
<Flex flexDirection={['column', undefined, 'row']} />

// ✓
<Flex flexDirection={['column', null, 'row']} />
```

---

## Component patterns

### Wrap layout props around Card, not on it

Card silently ignores all flex-child and layout props with no TypeScript error.

```tsx
// ✗ — silently broken
<Card flexGrow={1} minWidth="0" overflowY="auto">...</Card>

// ✓
<Box flexGrow={1} minWidth="0" overflowY="auto">
  <Card>...</Card>
</Box>
```

### Wrap Stack in Box when it needs to be a flex child

Stack does not accept `flexGrow`, `flexShrink`, or `flexBasis`.

```tsx
// ✗ — flexGrow on Stack silently does nothing
<Stack space={3} flexGrow={1}>...</Stack>

// ✓
<Box flexGrow={1} overflowY="auto">
  <Stack space={3}>...</Stack>
</Box>
```

### Use `space` on Stack and `gap` on Flex — never the other way round

Using `gap` on Stack or `space` on Flex silently does nothing.

```tsx
// ✗
<Flex space={3}>...</Flex>
<Stack gap={3}>...</Stack>

// ✓
<Flex gap={3}>...</Flex>
<Stack space={3}>...</Stack>
```

### Never use `Box as="button"`

`Box as="button"` inherits browser button defaults (border, background, padding, cursor) with no prop-based way to reset them. Use `Button` instead.

```tsx
// ✗
<Box as="button" onClick={handleClick}>Label</Box>

// ✓
<Button mode="bleed" text="Label" onClick={handleClick} />
```

# Inline style overrides

**Before you write `style={{...}}` on any component, check this guide.** Most inline styles have a prop-based option. For gaps where no prop exists, this guide shows the canonical workaround.

## Rule

Use `style` only when this guide lists it as acceptable. If this guide shows a prop, use the prop. If a pattern is not listed here, check whether a prop covers it before reaching for `style`.

## Most common mistakes

These six inline styles appear most often in test runs. Every one has a prop equivalent that agents miss.

| Inline style agents write | Prop to use instead |
|---|---|
| `<Flex style={{ flexWrap: 'wrap' }}>` | `<Flex flexWrap="wrap">` |
| `<Flex style={{ minHeight: '100vh' }}>` | `<Flex minHeight="100vh">` |
| `<Box style={{ minWidth: 0 }}>` | `<Box minWidth="0">` |
| `<Box style={{ overflow: 'hidden' }}>` | `<Box overflow="hidden">` |
| `<Box style={{ width: '260px' }}>` | `<Box width="260px">` |
| `<Box style={{ display: 'flex', flexDirection: 'column' }}>` | Use `<Flex flexDirection="column">` instead of `<Box>` |

> ⛔ **If you are writing `style={{...}}` on a Box or Flex and the property is in the table above, stop.** Use the prop. Box and Flex accept `width`, `minWidth`, `maxWidth`, `height`, `minHeight`, `maxHeight`, `overflow`, `overflowX`, and `overflowY` as **string props that take any CSS value** — not just token-scale numbers.

Two other frequent mistakes are not Box/Flex prop issues but component-choice issues:

- **Native `<button style={{...}}>` for nav items** — use `Menu` + `MenuItem` or `Button mode="bleed"` instead. See `patterns-navigation.md`.
- **Inline `style={{...}}` on `<th>` and `<td>`** — put table styles in `global.css` using palette tokens. See `table.md`.

## Quick lookup: CSS property → prop

Use this table when you know the CSS property you want to set.

| CSS property | Inline style (don't) | Prop (do) |
|---|---|---|
| `display: flex` | `style={{ display: 'flex' }}` | Use `<Flex>` instead of `<Box>` |
| `display: grid` | `style={{ display: 'grid' }}` | Use `<Grid>` instead of `<Box>` |
| `flex-direction` | `style={{ flexDirection: 'column' }}` | `<Flex flexDirection="column">` |
| `flex-wrap` | `style={{ flexWrap: 'wrap' }}` | `<Flex flexWrap="wrap">` |
| `align-items` | `style={{ alignItems: 'center' }}` | `<Flex alignItems="center">` |
| `justify-content` | `style={{ justifyContent: 'space-between' }}` | `<Flex justifyContent="space-between">` |
| `gap` | `style={{ gap: 8 }}` | `<Flex gap={2}>` (token scale 0–9) |
| `flex-grow` | `style={{ flexGrow: 1 }}` | `flexGrow={1}` on Box or Flex |
| `flex-shrink` | `style={{ flexShrink: 0 }}` | `flexShrink={0}` on Box or Flex |
| `flex-basis` | `style={{ flexBasis: '260px' }}` | `flexBasis="260px"` on Box or Flex |
| `flex` (shorthand) | `style={{ flex: '1 1 0' }}` | `flexGrow={1} flexShrink={1} flexBasis="0"` |
| `width` | `style={{ width: '260px' }}` | `width="260px"` on Box or Flex |
| `min-width` | `style={{ minWidth: 0 }}` | `minWidth="0"` on Box or Flex |
| `max-width` | `style={{ maxWidth: '320px' }}` | `maxWidth="320px"` on Box or Flex |
| `height` | `style={{ height: '48px' }}` | `height="48px"` on Box or Flex |
| `min-height` | `style={{ minHeight: '100vh' }}` | `minHeight="100vh"` on Box or Flex |
| `max-height` | `style={{ maxHeight: '100vh' }}` | `maxHeight="100vh"` on Box or Flex |
| `overflow` | `style={{ overflow: 'hidden' }}` | `overflow="hidden"` on Box or Flex |
| `overflow-x` | `style={{ overflowX: 'auto' }}` | `overflowX="auto"` on Box or Flex |
| `overflow-y` | `style={{ overflowY: 'auto' }}` | `overflowY="auto"` on Box or Flex |
| `position` | `style={{ position: 'sticky' }}` | `position="sticky"` on Box or Flex |
| `top` / `right` / `bottom` / `left` | `style={{ top: 0 }}` | `top={0}` on Box or Flex (scale 0–9) |
| `padding` | `style={{ padding: 16 }}` | `padding={4}` (token scale 0–9) |
| `margin` | `style={{ margin: '0 auto' }}` | `marginY={0} marginX="auto"` |
| `margin-left: auto` | `style={{ marginLeft: 'auto' }}` | `marginLeft="auto"` on Box |
| `border-radius` | `style={{ borderRadius: '50%' }}` | `radius="full"` on Box or Flex |
| `background` (themed) | `style={{ background: 'var(--card-bg-color)' }}` | `tone="neutral"` on Box or Flex |
| `border` (themed) | `style={{ borderColor: 'var(--card-border-color)' }}` | `border` prop on Box or Flex |
| `color` (themed) | `style={{ color: 'var(--card-fg-color)' }}` | `<Text color="default">` wrapping content |
| `font-size` (for icons) | `style={{ fontSize: '1.25rem' }}` | Wrap in `<Text as="span" size={N}>` |
| `color` (text muted) | `style={{ color: '#666' }}` | `<Text color="muted">` or `<Text muted>` |
| `color` (text semantic) | `style={{ color: 'green' }}` | `<Text color="positive">`, `color="critical"`, etc. |
| `font-weight` (text) | `style={{ fontWeight: 600 }}` | `<Text weight="semibold">` |

**Width, height, minWidth, maxWidth, minHeight, and maxHeight accept any CSS string value.** They are not limited to the token scale. Pixel values, viewport units, percentages, and `calc()` all work as prop values.

## Components that reject layout props

Card, Stack, and Button do not accept flex-child or overflow props. Passing `flexGrow`, `flexShrink`, `flexBasis`, `minWidth`, `overflow`, or `overflowY` to these components does nothing. No error is thrown.

**The fix is always the same: wrap in a Box or Flex.**

### Card inside a Flex

Card needs its own visual surface (background, border, shadow). It does not control its own layout sizing. Put sizing props on a wrapper.

```jsx
// ✗ flexGrow on Card does nothing
<Card flexGrow={1} padding={3}>...</Card>

// ✓ Box handles layout, Card handles the surface
<Box flexGrow={1} minWidth="0" overflow="hidden">
  <Card padding={3}>...</Card>
</Box>
```

### Stack inside a Flex

Stack spaces children in a column. It does not grow or shrink as a flex child. Wrap it when it sits inside a Flex parent.

```jsx
// ✗ flexGrow on Stack does nothing
<Stack flexGrow={1} space={3}>...</Stack>

// ✓ Box handles layout, Stack handles spacing
<Box flexGrow={1}>
  <Stack space={3}>...</Stack>
</Box>
```

### Button full width

Button has no `fullWidth` prop. Wrap it in a Box with `width="100%"`.

```jsx
// ✗ Inline style on Button
<Button style={{ width: '100%' }} text="Action" />

// ✓ Box controls width
<Box width="100%">
  <Button text="Action" />
</Box>
```

### Button with complex children

Button's internal flex layout clips custom children. Do not place Box or Flex inside Button children. For a row with icon + label + badge, use Box or Flex with `onClick` and the right ARIA roles. Or keep Button's built-in `icon` and `text` props.

## Scrollable regions

Box and Flex both accept `overflow`, `overflowX`, and `overflowY` as props. Valid values: `'auto'`, `'hidden'`, `'scroll'`, `'clip'`, `'visible'`. No inline style is needed.

```jsx
// ✗ Inline style for scroll
<Box style={{ overflowY: 'auto', height: '100%' }}>
  {/* content */}
</Box>

// ✓ Props for scroll
<Box overflowY="auto" height="100%">
  {/* content */}
</Box>
```

## Full-height layout containers

Building a full-height app shell does not need inline styles. Box and Flex accept `minHeight` and `height` as string props.

```jsx
// ✗ Inline style for viewport height
<Flex style={{ minHeight: '100vh' }}>
  ...
</Flex>

// ✓ Prop for viewport height
<Flex minHeight="100vh">
  ...
</Flex>
```

The same applies to fixed-height headers and sidebars:

```jsx
// ✗ Inline style for fixed height
<Box style={{ height: '48px' }}>...</Box>

// ✓ Prop for fixed height
<Box height="48px">...</Box>
```

## Sidebar and panel widths

Sidebar widths like `260px` or `320px` are not token-scale values. They still work as prop values. Box and Flex accept any CSS string for `width`, `maxWidth`, `flexBasis`, etc.

```jsx
// ✗ Inline style for sidebar width
<Box style={{ width: '260px', flexShrink: 0 }}>
  {/* sidebar */}
</Box>

// ✓ Props for sidebar width
<Box width="260px" flexShrink={0}>
  {/* sidebar */}
</Box>

// ✓ Responsive sidebar that stacks at narrow widths
<Flex
  as="nav"
  aria-label="Main navigation"
  flexGrow={1} flexShrink={1} flexBasis="100%"
  maxWidth="260px"
>
  {/* sidebar */}
</Flex>
```

## Icon sizing outside Button or Heading

Icons render at `1em` and inherit font size. Inside Button's `icon` prop or inside Heading, sizing is handled for you. In a standalone context, wrap the icon in Text:

```jsx
// ✗ Inline font-size on Box
<Box style={{ fontSize: '1.25rem', lineHeight: 1 }}>
  <RocketIcon />
</Box>

// ✓ Text controls icon size through the type scale
<Text as="span" size={2}>
  <RocketIcon />
</Text>
```

Size `1` produces a 21px icon. Size `3` produces a 29px icon.

## CSS custom properties

Box and Flex provide `tone` and `border` props that apply themed colors. Use these instead of `--card-*` variables.

```jsx
// ✗ Manual CSS variable reference
<Box style={{
  background: 'var(--card-muted-bg-color)',
  borderBottom: '1px solid var(--card-border-color)'
}}>
  ...
</Box>

// ✓ Props apply themed values
<Box tone="neutral" borderBottom>
  ...
</Box>
```

**`--card-*` variables only resolve inside a Card ancestor.** A Box outside any Card gets undefined values and no visual effect. Use `tone` on the Box itself.

If you need a themed container without Card's visual surface, use `Card` with `border={false}` and `padding={0}`. Or use `tone` on a Box.

## When inline style is acceptable

Use `style` only for values with no prop AND no workaround above:

- `cursor: 'pointer'` — no prop exists
- `user-select: 'none'` — no prop exists
- `opacity` — no prop exists
- `transform` / `transition` — no prop exists
- `z-index` — no prop exists
- `white-space` — no prop exists

Keep inline styles to the fewest properties needed. Setting more than two style properties on one element is a sign that props can replace most of them. Check this guide again.

## Do not use Card as="button"

`Card as="button"` inherits browser button defaults (border, background, cursor, width). Sanity UI does not reset these. Use Button for interactive elements. For a card-like clickable surface, use a different pattern.

## Cross-references

- **Full prop reference:** `core-component-props.md` lists every shared prop for Box, Flex, and Grid.
- **Layout patterns:** `layouts.md` and `stretch-layouts.md` show full app shell compositions using props.
- **Component choice:** The "Choosing between Box, Flex, Grid, Stack, Inline, and Container" table in `box.md` and `flex.md` helps pick the right component.
- **Custom brand colors without inline styles:** `patterns-custom-theming.md` shows how to override existing Sanity UI palette tokens (`--gray-*`, `--blue-*`, etc.) on `:root` and use `Card inverted` for dark regions — instead of inline `style={{ background }}` or `style={{ color }}`.

# Silent failures quick reference

These are the most commonly encountered patterns that **fail without any error, warning, or TypeScript feedback**. When a layout breaks, a style is missing, or behavior is wrong with zero console output, check here first.

---

| # | Trigger | Symptom | Fix |
|---|---------|---------|-----|
| 1 | Placing `flexGrow`, `minWidth`, `overflow`, or any layout prop directly on `Card` | Layout silently broken — card doesn't grow, overflow is ignored | Wrap Card in `Box` or `Flex`: `<Box flexGrow={1}><Card>` |
| 2 | Omitting `level` on `Heading` | `<h2>` rendered regardless of context, breaking heading hierarchy | Always set `level` explicitly: `<Heading level={1}>` |
| 3 | Using `tone="primary"` on `Button` or `Badge` | Button renders but fails WCAG AA contrast (4.29:1) — looks correct, ships broken | Use `mode="default" tone="default"` for primary actions |
| 4 | Passing `flexGrow`, `flexShrink`, or `flexBasis` to `Stack` | Stack doesn't grow or shrink — layout broken silently | Use `<Flex flexDirection="column" gap={3}>` or wrap in `<Box flexGrow={1}>` |
| 5 | Importing `Box`, `Flex`, `Card`, `Heading`, or `Text` from `@sanity/ui` | Different prop API, no error — e.g. `padding` on Box silently does nothing | Import these from `'ui'`: `import { Box } from 'ui'` |
| 6 | Omitting `import '../ui-poc/packages/ui/src/styles.css'` from `main.tsx` | All ui-poc components render as unstyled HTML — no error thrown | Add the import to `main.tsx`; see quick-start.md |
| 7 | Using `@vitejs/plugin-react-swc` instead of `@vitejs/plugin-react` | All styled-components styles missing — completely unstyled output, no error | Replace the plugin; see quick-start.md setup |
| 8 | Using `space` prop on `Flex` (or `gap` on `Stack`) | Spacing has no effect — silently wrong prop on wrong component | `Flex` uses `gap`; `Stack` uses `space` — they are not interchangeable |
| 9 | Using `var(--card-border-color)` outside a `Card` ancestor | Border is invisible — CSS variable resolves to `undefined` silently | Use `var(--gray-200)` — it resolves everywhere |
| 10 | Omitting `id` on `MenuButton` | ARIA relationship broken — screen readers can't associate trigger with menu | Always set `id`: `<MenuButton id="my-menu" ...>` |
| 11 | `MenuButton` inside `overflow: hidden` without `popover={{ portal: true }}` | Menu is invisible or clipped — no error, no warning | Add `popover={{ portal: true }}` to the MenuButton |
| 12 | Wrapping a non-ref-forwarding component in `Tooltip` | Tooltip never appears — no error | Use a native element or Sanity UI component as the child, or wrap with `React.forwardRef` |
| 13 | `Text` inside `Stack` without `as="p"` | Text renders as inline `<span>`, items crowd together | Set `as="p"` on Text components used as block-level content |
| 14 | Using `Card inverted` or dark inline styles on structural regions (sidebar, header) | Visual inconsistency — dark structural regions are not a supported pattern | Keep all structural regions light-themed; see `layouts.md` |

---

## Diagnostic checklist

When something doesn't look right and there's no error:

- [ ] Is `Card` receiving layout props? → Wrap in `Box`
- [ ] Is `Heading` missing a `level`? → Add `level={N}`
- [ ] Is a `Flex` or `Stack` using the wrong spacing prop? → `Flex` = `gap`, `Stack` = `space`
- [ ] Are ui-poc components imported from `@sanity/ui`? → Switch to `import { Box } from 'ui'`
- [ ] Is `styles.css` imported in `main.tsx`? → Add it
- [ ] Is `var(--card-border-color)` used outside a Card? → Replace with `var(--gray-200)`
- [ ] Is a MenuButton clipping? → Add `popover={{ portal: true }}`
- [ ] Is a Tooltip invisible? → Check that its child forwards refs

# Accessibility standards

This document helps designers and developers build accessible interfaces with Sanity UI components. It covers the rules you need to follow, the mistakes to avoid, and tested code patterns you can copy.

For guidelines on building or documenting Sanity UI components themselves, see `component-authoring-accessibility.md`.

## Do / Don't quick reference

Scan this list before building. Each rule links to a section below with full details and code examples.

**Landmarks and structure (§1)**
Use `Box` or `Flex` for structural regions that have no visual surface (sidebars, toolbars, scroll containers, landmarks). Use `Card` only when content needs its own distinct visual surface — background, border, or shadow. Never use `Card as="nav"` or `Card as="main"`.

- ✓ Do wrap your content area in `Flex as="main"`.
- ✓ Do wrap sidebars in `Box as="nav"` or `Flex as="nav"` with `aria-label`.
- ✗ Don't build a page with only `<div>` containers and no landmark elements.

**Headings (§2)**

- ✓ Do set `level={1}` on the page title and `level={2}` on list items below it.
- ✓ Do use `size` for visual sizing — it is independent of the heading level.
- ✓ Do use `level={2}` for the sidebar/app name. Only the content area title is h1.
- ✗ Don't skip from `1` to `3`. Use `2` for the next level down.
- ✗ Don't use two `1` levels. One page, one h1.
- ✗ Don't omit the `level` prop on Heading.

**Accessible names (§3)**

- ✓ Do add `aria-label` to every icon-only Button and MenuButton trigger.
- ✓ Do link every TextInput to a `<Label>` via `htmlFor`/`id`, or set `aria-label`.
- ✗ Don't rely on `tooltip` to name a button. It does not set `aria-label`.
- ✗ Don't use `placeholder` as the only label for an input.

**Color contrast (§4)**

- ✓ Do use `tone="default"` for primary action buttons.
- ✓ Do pair every semantic tone (`positive`, `caution`, `critical`) with an icon.
- ✓ Do use the Sanity UI `Avatar` component for user initials — it handles contrast.
- ✗ Don't use `tone="primary"` in default mode. It produces 4.29:1 contrast — below AA.
- ✗ Don't hardcode `background: #556bfc` with white text. It fails the same contrast check.

**Reduced motion (§5)**

- ✓ Do create `reduced-motion.css` and import it in your entry file. Every project needs it.
- ✗ Don't skip the global override. Sanity UI's own hover transitions do not respect `prefers-reduced-motion`.

**Touch targets (§6)**

- ✓ Do use Sanity UI `Checkbox`, `Radio`, or `Switch` for toggle inputs.
- ✓ Do use `gap={2}` or higher between adjacent buttons in toolbars.
- ✗ Don't use bare `<input type="checkbox">` or `<input type="radio">`. They render at 13×13px.
- ✗ Don't use bare `<input type="text">` with custom styling. Use `TextInput` instead.
- ✗ Don't place buttons with `gap={1}`. Target zones overlap below 24px spacing.

**Responsive reflow (§7)**

- ✓ Do add `flexWrap="wrap"` to every horizontal `Flex` that holds more than one child.
- ✓ Do set `overflow: 'hidden'` on the content Card.
- ✓ Do use `flex: '1 1 100%'` with `maxWidth` on sidebars.
- ✗ Don't use `width` with `flexShrink: 0` on sidebars. It creates a rigid column.
- ✗ Don't use `height: '100vh'` on the outer Flex. Use `minHeight: '100vh'`.
- ✗ Don't build a toolbar `Flex` without `flexWrap="wrap"`. It overflows at 320px.

**HTML lang (§8)**

- ✓ Do set `<html lang="en">` (or the correct code) in `index.html`.

## Semantics

| **Value** | **When to use** | **Requirements** |
| --- | --- | --- |
| `'div'` | Generic vertical layout (default) | None |
| `'ul'` | An unordered list of items | Add `role="list"`. Children must be `<li>` elements. |
| `'ol'` | An ordered list of items | Add `role="list"`. Children must be `<li>` elements. |
| `'nav'` | A group of navigation links | Add `aria-label` when the page has more than one `<nav>`. |
| `'section'` | A themed group with a heading | Add a heading child. Without one, `<section>` has no landmark role. |
| `'fieldset'` | A group of related form controls | Add a `<legend>` as the first child. |
| `'form'` | A form container | Add an `aria-label` or visible heading. |
| `'header'` | Page or section header | Should contain heading and nav elements. |
| `'footer'` | Page or section footer | Should contain metadata or nav elements. |

## 1. Landmarks and page structure

### Use landmarks for screen reader navigation

Every page must have at least one `<main>` landmark. A layout with a sidebar should also include `<nav>` and `<aside>`. Without landmarks, screen reader users experience the page as a flat list of elements.

Use the `as` prop on `Box` or `Flex` to render landmark elements:

```jsx
<Box as="nav" aria-label="Main navigation">...</Box>
<Flex as="main">...</Flex>
<Box as="aside" aria-label="Document inspector">...</Box>
```

### Label landmarks when needed

| **Element** | **When to label** |
| --- | --- |
| `<nav>` | Add `aria-label` when more than one `<nav>` exists on the page. Without it, screen readers list multiple "navigation" landmarks with no way to tell them apart. |
| `<section>` | Add a heading child or `aria-label`. Without an accessible name, `<section>` is the same as `<div>`. |
| `<main>` | Use once per page. No label needed. |
| `<aside>` | Add `aria-label` when the role is not clear from context. |
| `<form>` | Add `aria-label`, `aria-labelledby`, or a `<legend>` inside a `<fieldset>`. |
| `<header>`, `<footer>` | At page level they act as `banner` and `contentinfo` landmarks. Nested inside `<main>` or `<section>`, they scope to that region. |

## 2. Headings

### Every page needs exactly one h1

Headings give screen reader users an outline of the page. A page with zero headings forces users to read every element in sequence. Use `<Heading level={1}>` for the page title and `<Heading level={2}>` for each major section.

**Only one h1 per page.** The h1 is the main content title — not the app name or studio label. If your sidebar has a heading like "My Studio," make it `<Heading level={2}>`. The content area title ("All Documents") is the h1. Two h1 elements confuse screen readers about which heading represents the page.

```jsx
// ✗ Two h1 elements — screen readers cannot determine the page title
<Box as="nav"><Heading level={1}>My Studio</Heading></Box>
<Box as="main"><Heading level={1}>Documents</Heading></Box>

// ✓ One h1 for the page title — sidebar heading is h2
<Box as="nav"><Heading level={2}>My Studio</Heading></Box>
<Box as="main"><Heading level={1}>Documents</Heading></Box>
```

### Always set the `level` prop

The `Heading` component defaults to `level={2}`. Set `level` on every `Heading`. This keeps the hierarchy clear and intentional.

```jsx
// ✗ Renders as <h2> by default — the level may be wrong
<Heading>Page Title</Heading>

// ✓ Renders as <h1> — screen readers find it
<Heading level={1}>Page Title</Heading>
```

### Do not skip heading levels

Heading levels must descend in sequence: H1 → H2 → H3. Do not skip from H1 to H3. The `level` prop sets the semantic level. The `size` prop sets the visual size. They are independent.

**Rule: items in a list under an h1 are h2, not h3.** This is the most common heading skip. When a page title is `<Heading level={1}>` and you show a list of documents below it, each document heading must be `<Heading level={2}>`.

```jsx
// ✗ Skips h2 — agents default to h3 for "small" list items
<Heading level={1}>All Documents</Heading>
<Card padding={3} border>
  <Heading level={3}>Getting Started Guide</Heading>
</Card>

// ✓ h2 follows h1 — use size={1} to make it look small
<Heading level={1}>All Documents</Heading>
<Card padding={3} border>
  <Heading level={2}>Getting Started Guide</Heading>
</Card>
```



## 3. Accessible names

### Icon-only buttons need `aria-label`

When a Button has only an icon and no `text` prop, it has no accessible name. The `tooltip` prop renders visible hover text but does not set `aria-label`. You must add it yourself.

```jsx
// ✗ No accessible name — screen readers say "button"
<Button icon={SearchIcon} mode="bleed" />

// ✗ Tooltip does not set aria-label
<Button icon={SearchIcon} mode="bleed" tooltip={{ content: 'Search' }} />

// ✓ Screen readers announce "Search"
<Button icon={SearchIcon} mode="bleed" aria-label="Search" />
```



The same applies to MenuButton triggers:

```jsx
// ✗ Trigger has no accessible name
<MenuButton
  id="doc-menu"
  button={<Button icon={EllipsisVerticalIcon} mode="bleed" />}
  menu={<Menu><MenuItem text="Edit" /></Menu>}
/>

// ✓ Trigger has aria-label
<MenuButton
  id="doc-menu"
  button={
    <Button icon={EllipsisVerticalIcon} mode="bleed" aria-label="Document options" />
  }
  menu={<Menu><MenuItem text="Edit" /></Menu>}
/>
```

### Form inputs need labels

A `placeholder` attribute is not a label. Screen readers may read it, but it vanishes when the user types.

```jsx
// ✗ Placeholder is not a label
<TextInput placeholder="Search content..." />

// ✓ aria-label
<TextInput placeholder="Search content..." aria-label="Search content" />

// ✓ Visible label linked by id
<Stack space={2}>
  <Label size={0} htmlFor="search-input">Search</Label>
  <TextInput id="search-input" placeholder="Search content..." />
</Stack>
```

### Tooltips must not repeat the accessible name

If a button already has `aria-label="Settings"`, a tooltip that also says "Settings" adds no value. The tooltip should provide extra context or be omitted.

## 4. Color contrast

### Text contrast ratios

- **Standard text** (below 24px regular / 19px bold): minimum **4.5:1** against background (WCAG 1.4.3 AA).
- **Large text** (24px+ regular or 19px+ bold): minimum **3:1** against background.
- **UI components** (icons, borders, focus rings): minimum **3:1** against nearby colors (WCAG 1.4.11 AA).
- **Disabled elements** are exempt from WCAG 1.4.11.

### Do not use `tone="primary"` in default mode

The default Sanity UI theme uses `#556bfc` as the background for `tone="primary"` in default mode and for any selected/active state that resolves to the primary blue. White text on this background produces a 4.29:1 ratio — below the 4.5:1 AA threshold. Automated tests flag this every time.

**This applies to more than Buttons.** The same blue background appears on selected MenuItems, selected Cards, and any element that enters the primary selected state. If the element displays standard-size text on the primary blue, it fails contrast.

**Do not hardcode the primary blue hex.** Agents sometimes build custom avatar circles or status badges using `background: #556bfc` (or `rgb(85, 107, 252)`) with white text. This produces the same 4.29:1 failure. Use the Sanity UI `Avatar` component instead — it handles contrast. If you must build a custom element, do not use the primary blue with white text at standard font sizes.

The fix: **use **`tone="default"` for primary actions. For navigation menus, avoid using `selected` on MenuItems that display text content. Use a left border accent or bold text to mark the active item instead.

`mode="ghost"`** with **`tone="primary"`** does NOT always pass.** At 13px normal weight, the primary blue text (`#556bfc`) on the light blue ghost tint (`#e5edff`) produces 3.65:1 — below 4.5:1 AA. Ghost mode only passes for large or bold text. Do not use it for standard-size nav item text.

```jsx
// ✗ Fails contrast — 4.29:1 (white on primary blue)
<Button tone="primary" text="New document" />

// ✗ Fails contrast — selected MenuItem uses primary blue background
<MenuItem text="Documents" selected />

// ✗ May fail contrast — ghost primary at standard font sizes (3.65:1)
<Button tone="primary" mode="ghost" text="Nav item" />

// ✓ Passes — use tone="default" for buttons
<Button tone="default" text="New document" />
```

### Do not build custom colored elements with white text

Agents sometimes build custom avatar circles, status badges, or nav items using hardcoded background colors from the palette with white text. Many palette colors fail contrast at small text sizes:

| **Color** | **Hex** | **White text contrast** | **Passes AA at 13px?** |
| --- | --- | --- | --- |
| Primary blue | `#556bfc` | 4.29:1 | ✗ No |
| Positive green | `#04b97a` | 2.55:1 | ✗ No |
| Caution yellow | `#d28a04` | 2.96:1 | ✗ No |

Use the Sanity UI `Avatar` component for user initials — it handles contrast. For status indicators, use `Badge` with a `tone` prop. Do not build custom elements with `background: <palette color>` and `color: white`.

### Pair semantic color with a non-color indicator

Color must not be the only way to convey meaning. Every use of `tone="positive"`, `tone="caution"`, or `tone="critical"` must include an icon, a text label, or both (WCAG 1.4.1 A).

```jsx
// ✗ Color alone — users with color vision differences miss the meaning
<Button tone="critical" text="Delete" />

// ✓ Icon reinforces the meaning
<Button tone="critical" text="Delete" icon={TrashIcon} />
```

### Do not add `aria-selected` to plain `<div>` elements

The `aria-selected` attribute is only valid on elements with roles like `option`, `row`, `tab`, `gridcell`, or `treeitem`. A `<div>` with no explicit role cannot carry `aria-selected`. Automated tests flag this as a critical violation (WCAG 4.1.2 A).

Card's `selected` prop sets `data-selected` for styling. It does NOT set `aria-selected`. If you need a selectable list of Cards, either:

- Use `role="listbox"` on the container and `role="option"` on each Card, which allows `aria-selected`.
- Or skip `aria-selected` and use `aria-current="true"` to mark the active item. `aria-current` is valid on any element.

## 5. Reduced motion

### Add the global override to every project

Sanity UI Button, MenuButton, and other interactive parts apply `transition-duration: 0.1s` for hover states through styled-components. These transitions do not respect `prefers-reduced-motion` at the library level. You must add a global CSS override. **This is required — not optional.**

Create `src/reduced-motion.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Import it in your entry file:

```tsx
// main.tsx
import './reduced-motion.css'
```

The `0.01ms` value triggers transition-end events that some components rely on, but it is fast enough to count as instant. Automated tests treat any duration under 1ms as passing.

Without this file, every Button on the page will fail the motion accessibility test.

## 6. Touch targets

### Minimum 24×24 CSS pixels

All interactive targets must meet 24×24 CSS pixels (WCAG 2.5.8 AA). Inline links within paragraph text are exempt.

### Keep 24px spacing between adjacent targets

The 24×24px rule applies to the clickable area, not only the visual size. When buttons sit next to each other in a toolbar, each button must have at least 24px of unobscured clickable space. Buttons placed with `gap={1}` (4px) may overlap each other's target zones. Use `gap={2}` (8px) or higher between adjacent buttons in toolbars and action rows.

```jsx
// ✗ Buttons too close — target zones overlap
<Flex gap={1}>
  <Button icon={AddIcon} mode="bleed" aria-label="New document" />
  <Button icon={CloseIcon} mode="bleed" aria-label="Hide navigation" />
</Flex>

// ✓ Enough space between targets
<Flex gap={2}>
  <Button icon={AddIcon} mode="bleed" aria-label="New document" />
  <Button icon={CloseIcon} mode="bleed" aria-label="Hide navigation" />
</Flex>
```

### Do not use bare native inputs

Browser-default `<input type="checkbox">` and `<input type="radio">` render at about 13×13px. Use the Sanity UI `Checkbox`, `Radio`, or `Switch` components instead — they render at compliant sizes.

Bare `<input type="text">` elements with custom styling can also fall below the 24px minimum height. Use `TextInput` from `@sanity/ui` instead — it renders at compliant sizes and handles theming. If you must use a native input, set `min-height: 24px` and use `padding` to reach the target size.

If you must use a native checkbox or radio, wrap it in a `<label>` with enough padding to reach 24×24px, or apply CSS to set `width` and `height` to at least 24px.

## 7. Responsive layout — 320px reflow

Layouts must work at 320px viewport width with no horizontal scrolling (WCAG 1.4.10 AA). This simulates 400% zoom on a 1280px screen.

**Every **`<Flex>`** with more than one child must have **`flexWrap="wrap"`**.** This applies at every level of the tree — outer layout, toolbar, action rows, and any other horizontal row. A single non-wrapping Flex is enough to cause overflow at 320px. There are no exceptions.

**Reflow checklist.** Before shipping, confirm each of these. A single missed item causes the test to fail.

- Outer layout Flex has `flexWrap="wrap"`
- Sidebar uses `flexGrow={1} flexShrink={1} flexBasis="100%"` with `maxWidth`, not `width` with `flexShrink={0}`
- Content `Flex` has `overflow="hidden"`
- Toolbar Flex (heading + buttons) has `flexWrap="wrap"` and `gap={2}`
- Every actions row inside a Card has `flexWrap="wrap"`
- Outer Flex uses `minHeight: '100vh'`, not `height: '100vh'`
- No Flex child uses a fixed `px` width without a `maxWidth` fallback

### The pattern that fails every time

```jsx
// ✗ Fixed sidebar + 100vh forces overflow at 320px
<Flex height="100vh">
  <Card style={{ width: '260px', flexShrink: 0 }}>Sidebar</Card>
  <Card style={{ flex: '1 1 auto' }}>Content</Card>
</Flex>
```

At 320px, the 260px sidebar plus any content exceeds the viewport.

### The pattern that passes

```jsx
/* ✓ Sidebar stacks above content at narrow widths */
<Flex flexWrap="wrap" minHeight="100vh">
  <Flex
    as="nav"
    aria-label="Main navigation"
    flexGrow={1} 
    flexShrink={1} 
    flexBasis="100%"
    maxWidth="260px"
    padding={3}
  >
    Sidebar
  </Flex>
  <Flex 
    as="main" 
    flexGrow={1} 
    flexShrink={1} 
    flexBasis="0" 
    minWidth="0" 
    overflow="hidden" 
    padding={4}
  >
    Content
  </Flex>
</Flex>
```

### Key differences

| **Prop** | **Fails** | **Passes** |
| --- | --- | --- |
| Container | `Flex` (no flexWrap) | `Flex flexWrap="wrap"` |
| Sidebar sizing | `width: '260px', flexShrink: 0` | `flexGrow={1} flexShrink={1} flexBasis="100%" maxWidth="260px"` |
| Container height | `height: '100vh'` | `minHeight="100vh"` |
| Content `Flex` | `style={{ flex: '1 1 auto' }}` | `flexGrow={1} flexShrink={1} flexBasis="0" minWidth="0" overflow="hidden"` |

**Do not use **`flexShrink={0}` on sidebars. It prevents the sidebar from shrinking below its width.

**Do not use **`height: '100vh'` on the outer Flex. Use `minHeight="100vh"`. A fixed height stops the container from growing when content stacks.

**Always set **`overflow="hidden"` on the content `Flex`. Long headings or button rows can push the page `scrollWidth` past the viewport.

### Toolbar rows must wrap — this is the most common remaining failure

**Every test run fails this check.** The toolbar Flex inside the content Card overflows at 320px because agents forget `flexWrap="wrap"` on the inner Flex even when the outer layout Flex has it. The outer layout handles sidebar stacking. The inner toolbar handles heading + button wrapping. Both need `flexWrap="wrap"` independently.

**Copy this exact toolbar pattern into every content area:**

```jsx
{ /* ✗ FAILS EVERY TIME — no wrap on toolbar Flex */}
<Flex as="main" flexGrow={1} flexShrink={1} flexBasis="0" minWidth="0" overflow="hidden" padding={4}>
  <Flex alignItems="center" justifyContent="space-between">
    <Heading level={1}>All Documents</Heading>
    <Button text="New document" icon={AddIcon} />
  </Flex>
</Flex>

{ /* ✓ PASSES — flexWrap="wrap" and gap={2} on toolbar Flex */ }
<Flex as="main" flexGrow={1} flexShrink={1} flexBasis="0" minWidth="0" overflow="hidden" padding={4}>
  <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
    <Heading level={1}>All Documents</Heading>
    <Button text="New document" icon={AddIcon} tone="default" />
  </Flex>
</Flex>
```

The difference is one prop: `flexWrap="wrap"` on the toolbar `Flex`. Without it, the heading and button sit in a single non-breaking row that exceeds 320px. With it, the button flows to the next line at narrow widths.

**If you build a toolbar row with a heading and a button, add **`flexWrap="wrap"`** and **`gap={2}`**.** This applies to every toolbar in the app — the content header, card action rows, and any other horizontal grouping of heading + buttons.

## 8. HTML lang attribute

Every page must declare its language on `<html>` (WCAG 3.1.1 A).

```html
<!DOCTYPE html>
<html lang="en">
  <head>...</head>
  <body>...</body>
</html>
```

In a Vite project, set this in `index.html`.

## 9. Known Sanity UI issues

These are library-level issues you cannot fix through props. Automated tests will flag them. Do not spend time trying to work around them.

### MenuButton emits `aria-haspopup="true"`

The `MenuButton` component emits `aria-haspopup="true"` instead of `aria-haspopup="menu"`. The value `"true"` is an alias for `"menu"`, but screen readers may announce it as "has popup" instead of "has popup menu." This requires a fix in `@sanity/ui` itself.

### Palette colors fail contrast with white text at small sizes

White text on `tone="primary"` default-mode buttons produces a 4.29:1 ratio. The primary blue (`#556bfc`) on the ghost-mode light tint (`#e5edff`) produces 3.65:1. The positive green (`#04b97a`) with white text produces 2.55:1. All fail the 4.5:1 AA threshold at standard font sizes. Use `tone="default"` for actions. Do not build custom elements with palette colors and white text. See §4 above.

### ToastProvider renders `<ul>` without `role="list"`

The `ToastProvider` component renders a `<ul>` element with `list-style: none`. WebKit strips list semantics from unstyled lists. VoiceOver does not announce the element as a list. This is a library-level issue. Automated tests may flag it under the `semantic-structure` check.

## Full page scaffold

This scaffold passes all automated accessibility tests. Use it as a starting point.

```jsx
<ThemeProvider theme={theme}>
  <Flex flexWrap="wrap" minHeight="100vh">
    {/* Sidebar — <nav> landmark */}
    <Box
      as="nav"
      aria-label="Main navigation"
      padding={3}
      flexGrow={1} flexShrink={1} flexBasis="100%"
      maxWidth="260px"
    >
      <Stack space={3}>
        <Heading level={2}>Navigation</Heading>
        {/* nav items */}
      </Stack>
    </Box>

    {/* Content — <main> landmark */}
    <Flex
      as="main"
      flexGrow={1} flexShrink={1} flexBasis="0"
      minWidth="0" overflow="hidden" flexDirection="column"
      padding={4}
    >
      {/* Toolbar — wrap prevents overflow at 320px */}
      <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Heading level={1}>Page Title</Heading>
        <Button text="New document" icon={AddIcon} tone="default" />
      </Flex>

      {/* Document list — h2 follows h1, not h3 */}
      <Stack space={3} marginTop={4}>
        {documents.map(doc => (
          <Card key={doc.id} padding={3} border radius={2}>
            <Heading level={2}>{doc.title}</Heading>
          </Card>
        ))}
      </Stack>
    </Flex>
  </Flex>
</ThemeProvider>
```



**What this gives you:**

| **Feature** | **How** |
| --- | --- |
| Landmarks | `Box as="nav"` and `Flex as="main"` |
| Heading hierarchy | One `<h1>` for the page title. `<h2>` for sidebar heading, list items, and sections. Never skip to `<h3>`. Never use two `<h1>` elements. |
| Page language | Set `<html lang="en">` in `index.html` |
| Responsive reflow | `flexWrap="wrap"` + flex sizing (no fixed widths) |
| Toolbar wrap | `flexWrap="wrap"` on toolbar Flex |
| Target spacing | `gap={2}` or higher between adjacent buttons in toolbars |
| Contrast | `tone="default"` instead of `tone="primary"`. Do not hardcode `#556bfc` with white text. |
| Overflow clip | `overflow="hidden"` on content `Flex` |

# Accessibility checklist

Use this checklist when reviewing a component doc or building a new component. Each item maps to a standard above. Check every item that applies to the component. Items marked with a WCAG level indicate the minimum conformance level.

## Semantic structure

- [ ] If the component has an `as` prop, the doc lists when to use each semantic element value (1.1, WCAG 1.3.1 A)
- [ ] If the component has an `as` prop, the doc warns which elements carry behavioral contracts the component does not fulfil (1.4, WCAG 4.1.2 A)
- [ ] If the component is a layout primitive, the doc states it provides layout only — no keyboard handling, focus management, or ARIA state (1.1)
- [ ] If the component can render as `<nav>`, `<section>`, `<aside>`, `<form>`, `<header>`, or `<footer>`, the doc states the labeling requirement for each (1.2, WCAG 1.3.1 A)
- [ ] If the component can render as `<nav>`, the doc states that `aria-label` is required when more than one `<nav>` exists on the page (1.2)
- [ ] If the component can render as `<section>`, the doc states that an accessible name (heading or `aria-label`) is required for it to register as a landmark (1.2)
- [ ] If the component renders `<ul>` or `<ol>`, the doc states that `role="list"` is needed when `list-style: none` is applied (1.3, WCAG 1.3.1 A)
- [ ] If the component renders `<ul>` or `<ol>`, the doc states that children must be `<li>` elements (1.3)

### Keyboard interaction

- [ ] If the component is interactive, the doc specifies which keys activate it — Enter, Space, or both (2.1, WCAG 2.1.1 A)
- [ ] If the component is interactive, the doc specifies which keys navigate within it — Arrow keys, Tab, Home, End (2.1)
- [ ] If the component has internal navigation, the doc specifies edge behavior — wrap to start or stop at the end (2.1)
- [ ] If the component has a disabled state, the doc states whether disabled removes it from tab order or keeps it focusable (2.1)
- [ ] If the component is a layout primitive, the doc warns against CSS `order`, reverse flex directions, and grid reordering that break visual-to-DOM order (2.2, WCAG 1.3.2 A)

## Focus management

- [ ] If the component opens an overlay, the doc states where focus moves on open (3.1, WCAG 2.4.3 A)
- [ ] If the component opens an overlay, the doc states where focus returns on close (3.1)
- [ ] If the component opens a modal overlay, the doc states that focus is trapped inside the modal (3.1)
- [ ] If the component opens an overlay, the doc states that Escape closes it and returns focus to the trigger (3.1)
- [ ] If the component shows or hides a sidebar or panel, the doc states where focus moves on show and on hide (3.2)
- [ ] If the component hides content, the doc states that hidden content is removed from tab order (3.2)

## ARIA conventions

- [ ] If the component triggers a popup or expandable region, the trigger has `aria-expanded` (true/false) documented (4.1, WCAG 4.1.2 A)
- [ ] If the component triggers a popup, the trigger has `aria-haspopup` documented with the correct popup type — not bare `true` (4.1)
- [ ] If the component has a disabled state, the doc states whether it uses HTML `disabled` or `aria-disabled="true"` and explains the trade-off (4.2)
- [ ] If the component has a disabled state, the doc warns that tooltips on HTML-disabled elements cannot be reached by keyboard (4.2)
- [ ] If the component updates content dynamically, the doc specifies the live region strategy — `aria-live="polite"` for status, `aria-live="assertive"` for errors (4.3, WCAG 4.1.3 AA)
- [ ] If the component has a loading state, the doc states that `aria-busy="true"` is set on the container (4.3)

## Screen reader behavior

- [ ] Every interactive element has a documented accessible name source — visible text, `aria-label`, or `aria-labelledby` (5.1, WCAG 4.1.2 A)
- [ ] Icon-only buttons have `aria-label` documented (5.1, WCAG 1.1.1 A)
- [ ] Form inputs have label association documented — `<label>` via `for`/`id` or wrapping (5.1)
- [ ] Tooltips do not repeat the trigger's `aria-label` (5.1)
- [ ] If the component builds an application layout, the doc maps regions to landmarks — `<nav>`, `<main>`, `<aside>` — with labeling (5.2, WCAG 2.4.1 A)

## Contrast and color

- [ ] Standard text meets 4.5:1 contrast against its background (6.1, WCAG 1.4.3 AA)
- [ ] Large text (24px+ regular or 19px+ bold) meets 3:1 contrast against its background (6.1, WCAG 1.4.3 AA)
- [ ] UI components and graphical objects meet 3:1 contrast against adjacent colors (6.1, WCAG 1.4.11 AA)
- [ ] If disabled elements have reduced contrast, the doc states the exemption from WCAG 1.4.11 (6.1)
- [ ] Every use of semantic color (`positive`, `caution`, `critical`) is paired with a non-color indicator — icon, text label, or shape (6.2, WCAG 1.4.1 A)

## Motion

- [ ] All animations and transitions honor `prefers-reduced-motion` (7.1, WCAG 2.3.3 AAA — treated as baseline)
- [ ] No animation is required to understand a state change (7.1)
- [ ] If the component has an `animate` prop, the doc states it respects `prefers-reduced-motion` (7.1)

## Touch targets

- [ ] All interactive targets meet 24×24 CSS px minimum (8.1, WCAG 2.5.8 AA)
- [ ] The doc states the target size and confirms it meets the minimum (8.1)
- [ ] If the component is an inline link within text, the doc notes the inline exemption (8.1)

## Heading hierarchy

- [ ] If the component renders a heading, it accepts a heading level via `as` (`as="h2"`, `as="h3"`, etc.) (9.1, WCAG 1.3.1 A)
- [ ] If the component renders a heading, the doc warns against skipping heading levels for visual sizing — use `size` for visuals, `as` for semantics (9.1)
- [ ] If the component contains heading content, the doc states that heading levels must follow the page hierarchy (9.1, WCAG 2.4.6 AA)

## Spacing and reflow

- [ ] Spacing tokens use `rem` units. This lets them scale with user font-size settings (WCAG 1.4.12 AA)
- [ ] The component works at 400% zoom / 320px viewport width without horizontal scrolling (WCAG 1.4.10 AA)
- [ ] The component works when users override text spacing per WCAG 1.4.12 — line height 1.5×, paragraph spacing 2×, letter spacing 0.12×, word spacing 0.16× (WCAG 1.4.12 AA)

## Cross-component patterns

- [ ] If the component has a polymorphic `as` prop, all `as`-related accessibility guidance follows the shared pattern defined in standard 1.1 (10.1)
- [ ] If the component renders a list, it follows the WebKit list remediation pattern — `role="list"` plus `<li>` children (10.2)
- [ ] If the component is a layout primitive, it confirms visual order matches DOM order and documents reflow behavior (10.3)
- [ ] If the component opens an overlay, it follows the shared overlay focus lifecycle — focus on open, restore on close, Escape to dismiss (10.4)
- [ ] If the component has a disabled state and supports tooltips, the doc warns that HTML `disabled` blocks tooltip access for keyboard users (10.5)
- [ ] If the component uses semantic tones, each tone is paired with a non-color indicator (10.6)

# Product content standards

This file sets rules for the words, labels, messages, and short copy inside UI parts. It tells you what end users should read: button labels, menu items, tooltip text, error messages, empty states, confirm dialogs, placeholder text, and status messages.

`documentation-standards.md` tells how authors write the _docs_ (section layout, table format, source style). This file is for designers, engineers, and content reviewers who pick the words inside Sanity UI parts.

Both files work as a pair. `content-standards.md` keeps the docs steady. `product-content-standards.md` keeps the product steady. When a part doc has a "Content" or "Content Guidelines" section, its rules must match the standards here.

## Standards by content type

### P1: Labels and actions

Labels name the action on buttons, menu items, tabs, links, and other controls. Users read labels to know what happens before they act.

#### Rules

1. **Start with a verb.** Write labels that say what the user does. Use "Publish," "Edit," "Upload image" — not "Publishing," "Editor," or "Image upload."

  - _Derives from:_
    - Button Content ("Start with verbs. Describe the action")
    - Tooltip Content Guidelines ("Start with a verb if describing an action")
    - Menu Content Guidelines ("Use verbs that describe the action")
    - Layouts Action button guidelines ("Button labels should be verb-led")
    - Popover Content Guidelines ("If the popover contains a menu, use verbs for labels")

1. **Be short.** Aim for 1–3 words on button labels. Keep menu item labels to 1–3 words. Use 1–2 words for nav group labels. Overflow menu items may run up to 5 words because they must stand alone without icons or tooltips.

  - _Derives from:_
    - Button Content ("Labels should be short and clear")
    - Menu Content Guidelines ("Keep MenuItem text short (1-3 words)")
    - Layouts Labeling groups ("Labels should be short — one or two words")
    - Layouts Action button guidelines ("aim for two words or less")
    - Layouts Overflow menus ("The label should stand on its own")

1. **Use sentence case.** Cap only the first word and proper nouns. Write "Add item," not "Add Item." Write "Save to board," not "Save To Board."

  - _Derives from:_
    - Button Content ("Use sentence case")
    - Text Content ("Use sentence case for UI labels and body text")
    - Tooltip Content Guidelines ("Use sentence case")
    - Popover Content Guidelines ("Use sentence case")
    - Menu Content Guidelines ("Use sentence case for all menu items")
    - Heading Content ("Use sentence case for headings")
    - Layouts Labeling groups ("Labels should use sentence case")

1. **Name the action.** Do not use vague labels like "Click here," "Submit," "Go," or "OK." The label must say what will happen. "Upload image" beats "Submit." "Delete 3 items" beats "Confirm."

  - _Derives from:_
    - Button Content ("Avoid vague labels")
    - Button Best practices ("Don't use vague labels like 'Click here'")
    - Layouts Action button guidelines ("Avoid vague labels like 'Click here', 'Submit', 'Go', or 'OK'")

1. **Use plain, clear words for critical actions.** Give destructive actions strong verbs: "Delete," "Remove," "Discard." Do not soften destructive labels. Give safe actions clear verbs: "Publish," "Confirm," "Complete."

  - _Derives from:_
    - Button Tone table ("critical" tone pairs with "Delete, Remove")
    - Layouts Confirmation for destructive actions ("The confirm button repeats the destructive action's name")

1. **Name the group, not the action, for group labels.** Nav group labels name what the items are, not what the user does with them. Use "Documents" instead of "Manage documents." Use "Team" instead of "View team members."

  - _Derives from:_ Layouts Labeling groups ("Labels should name the kind of items, not the action done on them").

1. **Overflow menu labels must stand alone.** When an action goes into an overflow menu, its label must make sense on its own — no icon, no tooltip. Use "Export as CSV" instead of "Export."

  - _Derives from:_ Layouts Overflow menus ("Overflow menu items use a label only — no tooltips, no icons. The label must stand on its own").

1. **Toggle labels must show the next action.** When a button toggles state (show/hide, expand/collapse), write the `aria-label` and tooltip to say what happens next — not what is true now. Sidebar shown → "Hide nav." Sidebar hidden → "Show nav."

  - _Derives from:_ Layouts Toggling sidebars ("The button's aria-label and tooltip should update to match the action").

#### Quick reference

| **Part** | **Length target** | **Verb-first** | **Sentence case** | **Sample** |
| --- | --- | --- | --- | --- |
| Button label | 1–3 words | Yes | Yes | "Save draft" |
| Menu item label | 1–3 words | Yes | Yes | "Rename" |
| Overflow menu item | 1–5 words | Yes | Yes | "Export as CSV" |
| Nav group label | 1–2 words | No (noun phrase) | Yes | "Media library" |
| Tab label | 1–2 words | No (noun phrase) | Yes | "Page settings" |
| Toggle button label | 1–3 words | Yes | Yes | "Show inspector" |

### P2: Tooltips

Tooltips give brief help when a user hovers or focuses on a part. Use them for quick scans — not key info.

#### Rules

1. **Keep tooltips under 75 characters.** Aim for 60–75 characters. If you need more, put the words in body text, a popover, or a dialog — not a tooltip.

  - _Derives from:_ Tooltip Content Guidelines ("Limit text to 60–75 characters").

1. **Start with a verb when naming an action.** If the tooltip says what a button does, lead with the verb: "Edit profile," not "Profile editor." If the tooltip adds info (not an action), a short phrase works.

  - _Derives from:_ Tooltip Content Guidelines ("Start with a verb if describing an action").

1. **Use sentence case.** Cap only the first word and proper nouns.

  - _Derives from:_ Tooltip Content Guidelines ("Use sentence case").

1. **No dots on fragments.** Do not end tooltip fragments with a dot. If the tooltip holds a full sentence, add a dot as normal.

  - _Derives from:_ Tooltip Content Guidelines ("Avoid dots at the end of fragments. Only add dots if the tooltip holds full sentences").

1. **Do not restate shown text.** If the button says "Delete," write a tooltip that adds more ("Delete this document and all its links"). Do not repeat "Delete."

  - _Derives from:_ Tooltip When not to use ("Do not use when you restate text already shown on screen").

1. **Do not put tooltips on disabled buttons.** Disabled buttons drop out of the tab order. Keyboard users cannot reach them, and the tooltip stays hidden. Use a nearby note or info icon instead.

  - _Derives from:_
    - Tooltip ("Never attach a tooltip to a disabled button")
    - Button ("Avoid tooltips on disabled buttons")
    - Layouts ("Do not rely on tooltips — disabled buttons leave the tab order")

1. **All icon-only buttons need a tooltip.** When a button has no shown text, add a tooltip for sighted users. Pair it with an `aria-label` for screen readers. Both are needed.

  - _Derives from:_
    - Button Best practices ("Add tooltips to icon-only buttons")
    - Iconography ("Always pair standalone icons with a Tooltip")
    - Layouts ("All icon-only buttons must have an aria-label and a paired tooltip")

1. **The tooltip must not repeat the **`aria-label`**.** If the `aria-label` says "Close dialog," the tooltip must either match it (fine) or say more. It must never clash with the `aria-label`.

  - _Derives from:_ Tooltip ("Make sure the tooltip does not repeat the aria-label. If the button reads 'Settings,' the tooltip should say more").

1. **All action buttons with a text label need a tooltip that adds detail.** The tooltip grows the label: "Export" → "Export all items as a CSV file."

  - _Derives from:_ Layouts ("All action buttons should have a tooltip that adds detail").

### P3: Error messages

No part doc yet has error message rules in its "Content" section. This standard draws on best practices and patterns from other docs. Parts that need error message help: TextInput, Dialog, Card (with `tone="critical"`), and Toast.

#### Rules

1. **Name the problem in plain words.** Tell the user what went wrong. Do not show error codes, jargon, or stack traces in the UI. "The image failed to upload" works. "Error 413: Payload over limit" does not.

1. **Tell the user what to do next.** Each error message must have a next step — what the user can do to fix it. "The image failed to upload. Try a file under 10 MB." The pattern: _what went wrong_ + _what to do about it_.

1. **Do not blame the user.** Keep it neutral. "This file type is not allowed" — not "You sent a bad file." Frame the error as a state, not a fault.

1. **Be exact.** "Something went wrong" is a last resort. Name the thing and what failed: "Could not save the document. The server did not answer."

1. **Use sentence case.** Error messages follow the same casing rule as all other UI text.

1. **Keep error messages under two sentences.** If the problem needs more, link to docs or offer a "Details" toggle.

1. **Pair **`tone="critical"`** with an icon.** When showing errors in Cards, Buttons, or Toasts, use `tone="critical"` and add `ErrorOutlineIcon`. Do not rely on color alone.

  - _Derives from:_
    - Button Best practices ("Pair tones with an icon that matches")
    - Card Variants ("Pair Card tone values with an icon that matches")
    - Color Principles ("Never rely on color alone to show meaning")

#### Components that need error message guidance

| **Part** | **Why** |
| --- | --- |
| TextInput (not yet documented) | Form errors display inline near inputs |
| Dialog (not yet written) | Error confirms and failure notes |
| Card | Uses `tone="critical"` but has no error message content rules |
| Toast (not yet written) | Async error notices |

### P4: Empty states

Empty states show up when a list has no items, a search finds nothing, or a feature is not set up yet. The docs cover empty state layout but not the words inside them.

#### Rules

1. **Name what is missing.** The first line of an empty state says what is not there: "No documents yet," "No results found," "No team members."

1. **Tell the user how to fill the space.** The next line gives an action or a call-to-action button. "Create your first document" — not "Get started."

  - _Derives from:_ Layouts Empty states ("Put a clear call-to-action in the middle of the content space: 'Create your first document,' not 'Get started'").

1. **Structure: what + why + action.** An empty state has at most three parts:

  1. What the space will hold.
  1. A one-line reason why it's empty (optional).
  1. A call-to-action button using P1's verb-first label rules.

1. **Use a warm, helpful tone.** Empty states are a chance to help, not to alarm. Avoid "Error: no data." Use "No documents yet. Create one to get started."

1. **Center empty state text.** Put the copy in the middle of the content space. Set `align="center"` on Text parts inside the empty state.

  - _Derives from:_ Text Variants Align ("Copy within a center content block, such as an empty state").

1. **Use Text **`size={1}`** for empty state messages.** Empty state text is low-priority.

  - _Derives from:_ Text Variants Size ("Non-critical messages, such as Toasts and empty states" maps to `size={1}`).

#### Components that should document empty state guidance

| **Part** | **Why** |
| --- | --- |
| Layouts | Already has layout empty state rules; needs content rules for the text within |
| Card | Cards can contain lists that may be empty |
| Menu | A menu with no items needs an empty state |

### P5: Confirm dialogs

Confirm dialogs ask the user to check an action before it runs. The Layouts doc covers patterns for destructive actions. This standard widens the pattern to cover all confirms.

#### Rules

1. **The question names the action and the thing.** "Delete 'About us' page?" — not "Are you sure?" The user must know what will happen from the dialog title alone.

  - _Derives from:_ Layouts ("a confirm dialog that states what will happen").

1. **The confirm button repeats the action verb.** If the dialog asks "Delete 3 items?", the confirm button says "Delete 3 items" — not "Confirm," "Yes," or "OK."

  - _Derives from:_ Layouts ("The confirm button repeats the action's name — 'Delete 3 items,' not 'Confirm' or 'Yes'").

1. **The cancel button says "Cancel."** Do not use "No," "Go back," "Never mind," or "Dismiss." All users know "Cancel."

1. **Destructive confirm buttons use **`tone="critical"`**.** The look reinforces the weight of the action.

  - _Derives from:_ Layouts ("The confirm button should also use tone='critical'").

1. **Add a brief note when the outcome is unclear.** If the action has side effects, state them in the dialog body. Keep to one or two sentences. Like: "Deleting this document will also remove 12 links to it."

1. **Use sentence case for dialog titles and body text.** The same casing rule holds for all parts.

### P6: Placeholder text

No current part doc covers placeholder text rules. This standard draws on best practices. Add these rules to the TextInput and Autocomplete docs when written.

#### Rules

1. **Placeholder text shows the format, not the field name.** A date field reads "YYYY-MM-DD," not "Enter date." A search field reads "Search by title or ID," not "Search."

1. **Placeholder text does not take the place of a shown label.** Give each input a shown label above or next to it. The placeholder is a hint — it fades when the user types and fails as a lasting label.

1. **Use sentence case.** Placeholder text follows the same rule as all other UI text.

1. **Keep placeholder text short.** One phrase or short line. It must fit inside the input at the input's default width with no clipping.

1. **Do not use placeholder text for rules.** If the user must know rules before typing (like "Must be at least 8 chars"), put help text below the input.

#### Components that should document placeholder text guidance

| **Part** | **Why** |
| --- | --- |
| TextInput (not yet written) | The main user of placeholder text |
| Autocomplete (not yet written) | Search-style inputs with placeholder |

### P7: Status messages

Status messages are toast notices, inline markers, and loading notes. They tell the user what happened or what a task is doing.

#### Rules

1. **Name the action and its result.** "Document published" — not "Success." "3 items deleted" — not "Done." Users must know what happened without thinking back to what they had clicked.

1. **Use past tense for done actions.** Write "Published," "Saved," "Deleted." Use "-ing" for actions not yet done: "Publishing…," "Saving…"

1. **Keep status messages under one sentence.** Toast messages must be easy to read at a glance. If more is needed, add a link to the item or a "Details" link.

1. **Fire a Toast for actions that take over three seconds.** When a task ends after loading for more than three seconds, show a Toast to tell the user. Do not rely on the button going back to its on state — the user may have moved on.

  - _Derives from:_
    - Button Loading state ("For tasks over three seconds, trigger a Toast when the action finishes")
    - Layouts Loading states ("trigger a Toast when the action completes")

1. **Use **`tone`** to match the status.** Good outcomes use `tone="positive"`. Warnings use `tone="caution"`. Failures use `tone="critical"`. Add the matching icon.

  - _Derives from:_ Card Tone table, Button Tone table, Color Principles ("Color carries meaning").

1. **Loading messages must name the task, not say "Loading."** Write "Publishing document…" or "Uploading image…" when the task is known. Use "Loading…" only when you do not know the task.

1. **Use sentence case.** Applies to all status messages.

1. **Use Text **`size={1}`** for toast and status messages.** Status messages are low-rank, short-lived words.

  - _Derives from:_ Text Variants Size (`size={1}` is for "small messages, such as Toasts and empty states").

### P8: Casing and format

Casing and format rules apply to all content types. They appear here once. All other standards point to them.

#### Rules

1. **Sentence case for all text.** All UI text uses sentence case: button labels, menu items, tooltips, headings, tab labels, group labels, error messages, empty states, placeholders, and status notes. Cap the first word and proper nouns only.

  - _Derives from:_
    - Button ("Use sentence case")
    - Text ("Use sentence case for UI labels and body text")
    - Tooltip ("Use sentence case")
    - Popover ("Use sentence case")
    - Menu ("Use sentence case for all menu items")
    - Heading ("Use sentence case for headings")
    - Layouts ("Labels should use sentence case")

1. **When not to use sentence case.** Proper nouns (Sanity, GitHub, GROQ), short forms (CSV, JSON, URL, UUID), and brand names keep their own casing. Never use all-caps text (like "MEDIA LIBRARY").

1. **No dots on short bits.** Button labels, menu items, tooltip bits, headings, and group labels do not end with a dot. Full sentences in body text, error messages, and dialog text do get dots and other marks.

  - _Derives from:_
    - Tooltip ("Avoid periods at the end of fragments")
    - Heading ("Do not end headings with a dot unless it is a question")

1. **No "!" marks in UI text.** Product copy keeps a calm, clear tone. Save "!" marks for sales copy — not buttons, errors, or status messages.

1. **Use figures, not words, for counts.** "Delete 3 items" — not "Delete three items." Users read figures faster in UI text.

1. **Use the Oxford comma in lists.** When a line lists three or more items, put a comma before "and" or "or" to keep the meaning clear.

### P9: Internationalization considerations

Sanity UI is used around the world. Write all text for translation, even when the source is English.

#### Rules

1. **Allow 30–50% growth for translated labels.** German, Finnish, and other languages often make labels 30–50% longer than English. A two-word English button may grow to four words in German. Plan layouts for this growth — do not treat the English length as the cap.

1. **Avoid text placed in code.** Make all user-facing strings easy to pull out. Do not hard-code labels, error messages, or status text in JSX. Pass them as props or through a locale file.

1. **Do not join strings to build sentences.** "You have " + count + " items" breaks in languages where word order is not the same. Use template strings with slots a translator can move: "You have {count} items."

1. **Support RTL scripts.** Labels, tooltips, error messages, and all other text must look right in right-to-left languages (like Hebrew). Use `inline-start` and `inline-end` in place of `left` and `right`.

  - _Derives from:_
    - Text Variants Align ("`left` for LTR, `right` for RTL")
    - Heading Best practices ("Start-align headings (left in LTR languages)")

1. **Avoid sayings and word games.** "Hit the ground running," "low-hanging fruit," and "out of the box" do not translate well. Use plain, straight words.

  - _Aligns with:_ Text Content ("Avoid jargon, acronyms, and hard sentences. Aim for an 8th-grade reading level").

1. **Test labels at their longest.** When building a part, test with the longest likely translated string (such as a 50%-longer German form). Check that the layout does not break, clip text, or push buttons off screen.

### P10: Truncation

Truncation is a last resort. All parts that handle text overflow must follow clear rules about when and how to truncate.

#### Rules

1. **Shorten the text before clipping.** The best clip is no clip at all. If users can change the text (like a title they typed), you may need to cut it. If the system sets the text (like a button label), write it shorter.

  - _Derives from:_
    - Heading TextOverflow ("Before truncating, try to shorten the text. The best truncation is no truncation")
    - Text TextOverflow ("Before truncating, try to shorten the text")

1. **Use ellipsis (**`…`**) to show clipping.** The default `textOverflow="ellipsis"` works for most cases. Do not use `clip` unless the cut part is only for looks.

  - _Derives from:_ Button API (`textOverflow` defaults to `'ellipsis'`).

1. **Show the full text with a Tooltip or **`title`**.** When you clip text, let the user see the full string on hover or focus. Use the Tooltip part or the HTML `title` tag.

  - _Derives from:_
    - Heading TextOverflow ("make sure the full text is within reach via Tooltip or title tag")
    - Text TextOverflow (same rule)

1. **Save clipping for user-made or changing text.** Write system-set labels (buttons, menu items, section headings) short enough to never clip. Clipping is for text the system cannot control: user-typed titles, machine-made IDs, and long web links.

  - _Derives from:_
    - Text TextOverflow ("Text that is user/machine made and edge cases may exist")
    - Heading TextOverflow (same)

1. **Clipping in grids and lists.** When grid or list items would cause odd sizes or layout jumps if they wrapped, clipping works. Make sure users can still see the full text.

  - _Derives from:_
    - Text TextOverflow ("Text within a grid where wrapping would cause odd sizes or shifts")
    - Heading TextOverflow (same)

## Part Content sections to update

All items from the initial audit have been resolved. The table below tracks only remaining work — docs not yet written, and Box/Flex layout primitives that still need minimal Content sections.

| **Document** | **Standard** | **What needs to change** |
| --- | --- | --- |
| `box.md` | P8 | Add a Content section noting that Box does not set text styles. Child Text/Heading components own casing and styling. Cite P8 for sentence case. |
| `flex.md` | P8 | Same as Box. Add a Content section noting that Flex does not set text styles. Cite P8. |
| `dialog.md` (not yet written) | P3, P5, P6 | When written, include a Content section covering confirm dialog rules (P5), error message structure (P3), and placeholder text in dialog inputs (P6). |
| `textinput.md` (not yet written) | P3, P6 | When written, include a Content section covering placeholder text rules (P6) and inline error messages (P3). |
| `toast.md` (not yet written) | P7 | When written, include a Content section covering status message rules (P7). |

## How to use this file

### For people building interfaces with Sanity UI

1. **Before writing any user-facing text**, read the right standard (P1 for button labels, P2 for tooltips, P3 for errors, etc.).
1. **Use P8 (casing and format) on all text.** Use sentence case, skip dots on bits, use figures for counts.
1. **When in doubt, check the quick lookup table** in P1 for label length and form.
1. **Think about translation.** Even if you write in English, follow P9 — allow for 30–50% growth, avoid string joining, use plain words.
1. **Clipping is a last resort.** Follow P10 — shorten the text first. If you cannot avoid clipping, show the full text with a Tooltip.

### For reviewers checking Content sections

1. **Check each part's Content section against all rules in this file.** Use the audit as a checklist to start.
1. **When a part's Content section adds a new rule**, see if it belongs here. If the rule goes past that one part, add it here and cite it from the part doc.
1. **When a part's Content section clashes with a rule here**, the system rule wins. Change the part doc to match, or pitch a change with proof.
1. **Flag missing Content sections.** The "Parts with NO Content section" table lists parts that need them. When you write a new part doc, add a Content section that cites the right rules from this file.

### For maintaining this file

1. **This file grows over time.** Each review adds to or makes the rules better. Do not repeat — update in place.
1. **All new rules must cite proof.** Ground each rule in part doc Content sections. Where no part doc has a given content type, note the gap and write the rule from best practices.
1. **Run the feedback loop.** When you add or change a rule, also update the audit and the "Part Content sections to update" table. A rule that lives only here and never gets into part docs does not work.
1. **Version the changes.** Add a row to the changelog below when you add, refine, or retire standards.

# Typography



## Best practices

**Do**

- Always use vertically stacked Text/Heading pairings with `<Stack>` or `<Flex>`. Text and Heading components require explicit vertical spacing between them because they have all vertical spacing stripped.
- Use `<Heading>` along with the `as` prop for all interface waypoints.

**Don’t**

- Don't replace text with icons for critical or complex topics.

# Color



## Principles

### Color is functional

It expresses semantic meaning, intent, and hierarchy. Color is not a decorative element within the core Sanity product.

### Color is never a barrier to entry

Never rely on color exclusively to convey meaning, indicate an action, or prompt a response. If color is your only cue (e:, relying solely on a red outline to indicate a form error), users with color blindness or low vision will not receive the intended message. Always pair semantic colors with text labels, icons, or other non-color information.

### Color is used with restraint

Better use of less is always preferred over "more on top of more". Keeping a limited palette of colors working harmoniously together is manageable; trying to balance dozens of colors leads to visual clashing and cognitive overload.

## Best practices

- Primary colors should be reserved for conveying high-emphasis, core actions that you want the user to take. Secondary colors should be used for medium-to-low emphasis actions, creating visual balance and ensuring the primary actions stand out.
- Semantic & Status Communication: Color is an excellent supplement to indicate the severity of a message, helping to distance a minor issue from a critical error. Background colors should purposefully deliver specific meanings, such as information, success, warning, or error.
- High-Intensity Backgrounds: Solid, bold semantic colors should be used on distinct UI elements (like badges or toast notifications) to immediately draw attention to a status.
- Low-Intensity Backgrounds: Light tints (or "weak" colors) of semantic colors are safe to use as larger background areas or behind text, maintaining readability while still conveying the status.
- Typography & Iconography: Text colors must be strictly managed to maintain readability hierarchy (e.g., separating default body text from subtle metadata). Icon colors should generally match their accompanying text colors to maintain visual consistency.

## Applying color in practice

This section bridges the ideas in the current document with concrete patterns.

### The hierarchy of color decisions

When choosing how to apply color, follow this order:

- **Tone on the component** — Does an interactive element need semantic meaning? Set `tone` on the Button, MenuItem, Badge, or other component.
- **Muted prop** — Does the content need to be de-emphasized? Use `muted` on Text or Card instead of picking a lighter color.
- **Scheme override** — Does a section need to invert the palette for emphasis? Set `scheme="dark"` on a Card inside a light interface (or vice versa). Use sparingly.
- **Direct color** — As a last resort, for elements outside the `@sanity/ui` component system (such as charts or data visualizations), reference `@sanity/color` values.

### What not to do
- **Avoid using custom colors** without creating a full theme. Sanity UI's components are built to work with specific color patterns. 
- **Don't use hardcoded hex values** for colors that `@sanity/ui` components manage. Every `color`, `background-color`, and `border-color` in the system flows through CSS custom properties. Hardcoded values break in dark mode, ignore tone contexts, and diverge from the palette.
- **Don't reference **`--card-*`** variables** in component styles unless building a custom component that takes part in the Card color context. Prefer `@sanity/ui` components with `tone` and `muted` props.
- **Don't use **`ThemeColorProvider`** directly** unless you are building infrastructure-level components. Use Card's `tone` and `scheme` props, which wrap `ThemeColorProvider` with the correct semantics.
- **Don't assign meaning to raw hues.** Users should never see "blue" or "red" as a concept in the interface. They should see "primary," "critical," and the like. The mapping from tone to hue is the theme's job, and it may change.

## Accessibility

We adhere to WCAG AA guidelines for contrast to ensure visual clarity.

- Standard Text: Must maintain a contrast ratio of at least 4.5:1 against its background.
- Large Text: Text that is at least 24px regular or 19px semi-bold must maintain a 3:1 ratio.
- UI Components: Meaningful visual elements, such as icons or input borders, must maintain a 3:1 contrast ratio against adjacent colors.
- Dynamic Backgrounds: When text is rendered over gradient backgrounds or images, you must verify that the text color meets contrast standards in all places it appears. This is particularly critical for interfaces using animations or parallax scrolling where text and backgrounds move independently.

### Contrast ratios in the theme

The `@sanity/color` package includes a `contrastRatio` utility function that the theme build process uses to check color pairs. The tint scale is designed to ensure:

- Tints 600+ on white backgrounds meet WCAG AA for normal text (≥ 4.5:1)
- Tints 700+ on white backgrounds meet WCAG AAA for normal text (≥ 7:1)
- The default foreground (gray/800 on white) provides about 10:1 contrast
- Dark scheme foregrounds (gray/200 on gray/950) provide about 9:1 contrast

These ratios hold across all semantic tones. Positive, caution, and critical foregrounds on their tinted backgrounds all meet AA minimums.

# Spacing

The spacing scale controls padding, margin, and gap across all Sanity UI components. Every spacing prop maps to the same scale of 10 values.

## The spacing scale

| **Value** | **Pixels** | **rem** | **Common use** |
| --- | --- | --- | --- |
| `0` | 0px | 0 | No spacing |
| `1` | 4px | 0.25rem | Tight gaps — label paired with its input, icon next to text |
| `2` | 8px | 0.5rem | Compact padding — toolbars, sidebar items, dense lists |
| `3` | 12px | 0.75rem | Standard padding — content cards, buttons, form fields |
| `4` | 20px | 1.25rem | Spacious padding — form sections, dashboard cards |
| `5` | 32px | 2rem | Generous padding — onboarding cards, auth forms |
| `6` | 52px | 3.25rem | Large spacing — section breaks (use with caution) |
| `7` | 84px | 5.25rem | Extra-large spacing (use with caution) |
| `8` | 136px | 8.5rem | Page-level spacing (use with caution) |
| `9` | 220px | 13.75rem | Largest step (use with caution) |

The pixel values assume `1rem = 16px` (the browser default). When users change their browser font size, the `rem` values scale with it. If you inspect computed styles in DevTools, you will see `rem` values, not `px`.

The scale follows a Fibonacci-like progression. Each step grows by adding the two previous steps. This creates a scale that feels even at small values and spreads out at large values.

## Why numbers instead of named sizes

Sanity UI uses numeric keys (`padding={3}`) instead of named keys (`padding="md"`).

- **Fewer names to learn.** Ten numbers are easier to scan than ten size names.
- **Math works.** You can write `padding={basePadding - 1}` or `margin={-2}`. Named keys do not support arithmetic.
- **Consistent across props.** The same number means the same size on `padding`, `gap`, `paddingX`, `margin`, and every other spacing prop.

## Which props use the scale

These props accept spacing scale values on Box, Card, Flex, Stack, and other layout components:

| **Prop** | **What it controls** |
| --- | --- |
| `padding` | Inner spacing on all sides |
| `paddingX` | Inner spacing on left and right |
| `paddingY` | Inner spacing on top and bottom |
| `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft` | Inner spacing on one side |
| `margin` | Outer spacing on all sides |
| `marginX`, `marginY` | Outer spacing on one axis |
| `marginTop`, `marginRight`, `marginBottom`, `marginLeft` | Outer spacing on one side |
| `gap` | Space between children (Stack, Flex, Grid) |
| `space` | Space between children (Inline) |

Prefer `padding` over `margin` to avoid margin collapse issues. Prefer `gap` on the parent over `margin` on individual children.

## Responsive values

Every spacing prop accepts an array for responsive breakpoints. The array maps to the breakpoints defined in the theme.

`/* padding={2} at small screens, padding={4} at 600px+ */`

`<Card padding={[2, , 4]}>Content</Card>`

`/* gap={2} at small screens, gap={3} at medium, gap={4} at large */`

`<Stack gap={[2, 3, 4]}>`

`  {items}`

`</Stack>`



An empty slot (`, ,`) means "keep the previous value."

## Choosing a spacing value

Pick spacing based on content density:

**Tight (1–2).** Items that form a single unit. A label and its input. An icon and its caption. The gap should feel like a pause, not a break.

**Standard (3–4).** Distinct items in the same group. Form fields, cards in a list, paragraphs. The gap should feel like a clear separator. Most UI uses these values.

**Generous (5+).** Sections that need visual distance. Use these to create breaks without adding a divider. Values 6–9 are rarely needed outside of page-level layouts.

### Common patterns

| **Context** | **Prop** | **Value** | **Pixels** |
| --- | --- | --- | --- |
| Label + input pair | `gap` | `1`–`2` | 4–8px |
| Form fields in a group | `gap` | `3` | 12px |
| Cards in a list | `gap` | `3`–`4` | 12–20px |
| Content card padding | `padding` | `3` | 12px |
| Dashboard card padding | `padding` | `4` | 20px |
| Section break | `gap` | `5` | 32px |
| Button default padding | `padding` | `3` | 12px |
| Compact button padding | `padding` | `2` | 8px |

## Units and accessibility

The spacing scale uses `rem` units under the hood, not fixed `px`. The pixel column in the table above shows the defaults at `1rem = 16px`. The `rem` column shows the actual values the components render. When users change their browser font size, spacing scales with the text.

This matters for WCAG 1.4.12 (Text Spacing). Spacing must adapt when users override text spacing settings. Using the spacing scale instead of hardcoded `px` values keeps your layout compliant.

Content must also reflow at 320px viewport width without horizontal scrolling (WCAG 1.4.10 AA). Avoid large fixed spacing values that prevent content from fitting in narrow viewports. Use responsive spacing arrays to reduce padding at small breakpoints.

# Iconography



### **Usage guidelines**

**When to use:**

- To convey meaning in cases where space is limited
- To reinforce a label with a more visual representation
- To create visual emphasis for a critical element on the screen
- To support communication of important states (such as errors or success) for people who do not perceive color.
- When displaying information that’s visual in nature (ex: map pins in a map)

**When not to use:**

- As a decoration. Use imagery or illustrations instead.
- As the primary form of communication when space is available. Use text labels whenever possible.

### Bundle size

`@sanity/icons` is fully tree-shakeable. Named imports like `import { SearchIcon } from '@sanity/icons'` only include that icon in the bundle. Importing the full package object is not necessary and not recommended.

### Best practices

**Do**

- Color icons to match the semantic meaning.
- When placed adjacent to text, size the icons proportionally to the text’s size.
- Use icons within an interactive element (like Button) when it’s intended to be interactive.
- Add a Tooltip to describe interactive elements using an icon as the primary form of communication.

**Don’t**

- Don’t add icons alongside text unless it provides a clear functional purpose _or _the element requires high emphasis.
- Don’t use the “closest matching” icon in cases where there isn’t an obvious one for the intended use case. It’s better to use no icon than one that doesn’t match in meaning. Consider not using an icon or create a new icon for that specific use case.
- Don’t color icons specifically to increase visual emphasis.
- Don’t use filled variants of icons to increase visual weight.
- Don't manually style icons with inline styles. Wrap icons in the `<Text />` component to inherit styles.
- Don't wrap icons in `<Box />` as a container. Use `<Flex />` instead.

### Treatments

#### Supportive

Supportive icons accompany a text label. They reinforce or emphasize meaning but do not replace the text — if the icon were removed, the element would still be understood.

- Used via the `icon` prop on Button, MenuItem, TextInput, and similar components.
- The text label serves as the accessible name. The icon is decorative.
- Mark standalone supportive icons with `aria-hidden="true"` so screen readers skip them.

##### Guidance

- Do not add a supportive icon unless it provides a clear functional benefit — faster scanning, visual reinforcement of a semantic tone, or disambiguation between similar labels.
- When pairing icons with semantic tones (`positive`, `caution`, `critical`), the icon should match the tone's intent: `CheckmarkCircleIcon` for positive, `WarningOutlineIcon` for caution, `ErrorOutlineIcon` for critical. This supports people who do not perceive color.

#### Independent

Independent icons are the sole visual element communicating meaning — there is no adjacent text label. If the icon were removed, the element's purpose would be lost.

- Used as icon-only buttons, toolbar actions, or standalone status indicators.
- **Must** have an accessible name since no visible text is present. Provide `aria-label` on the interactive parent element.
- Should be paired with a Tooltip for sighted users to confirm meaning on hover/focus.
- Reserve for:
  - Universally understood concepts: close, search, add, settings, navigation arrows.
  - Compositions where density is critical (ex: Toolbars)
  - Secondary or low-risk actions where immediate comprehension is not critical

**Guidance:**

- When in doubt, use a supportive treatment instead. Independent icons require the user to already know (or discover via tooltip) what the icon means.
- Always pair independent icons with a Tooltip. This serves both as a learning aid for new users and a confirmation for experienced ones.
- Never use an independent treatment for critical or destructive actions. A delete action should always have a visible "Delete" label.

### Variants

#### Outlined vs Filled

Sanity icons should be displayed as outlined by default. Filled icons are specifically used to indicate that an element is active or toggled on. An example of this is using PinOutlineIcon when a navigation element is unpinned and PinFilledIcon when it’s pinned.

Note that not every icon has a filled counterpart. Most icons exist only in their outlined form. The filled variants are intentionally limited to cases where a toggle or active-state distinction is meaningful.

#### Size

Sanity icons currently come in one default size, 25x25. However, icon sizing should be visually paired when set next to text.

- Icons render at `width="1em"` and `height="1em"`, meaning they scale with their parent's font size.
- When placed inside `@sanity/ui` typography components, the theme applies a precise `font-size` override to `[data-sanity-icon]` elements that aligns icons to the cap-height of adjacent text.

_You should not manually set _`fontSize`_, _`width`_, or _`height`_ on Sanity icons._* Instead, control size by placing the icon inside the appropriate typography component at the desired `size` prop value. The theme handles the rest.

##### Sizing standalone icons (outside a Text/Button/Heading context)

The recommended way to control icon size when used standalone is to wrap the icon in a `Text` component and use its `size` prop — `Text` sets the CSS `font-size` that icons inherit:

```tsx
{/* 16px icon */}
<Text size={1}><SearchIcon /></Text>

{/* 24px icon */}
<Text size={3}><SearchIcon /></Text>
```

If `Text` adds unwanted layout (e.g. `display: block`), use `as="span"`:

```tsx
<Text as="span" size={2}><SearchIcon /></Text>
```

Avoid `style={{ fontSize: '24px' }}` directly on the icon — this bypasses the spacing scale and breaks the relationship between icon size and the surrounding type scale.

#### Text icon sizes

| `size` | **Font size** | **Icon size** | **Line height** |
| --- | --- | --- | --- |
| `0` | 10px | 17px | 15px |
| `1` | 13px | 21px | 19px |
| `2`** (default)** | **15px** | **25px** | **23px** |
| `3` | 18px | 29px | 27px |
| `4` | 21px | 33px | 31px |

#### Heading icon sizes

| `size` | **Font size** | **Icon size** | **Line height** |
| --- | --- | --- | --- |
| `0` | 13px | 17px | 19px |
| `1` | 16px | 25px | 23px |
| `2` | 21px | 33px | 29px |
| `3` | 27px | 41px | 35px |
| `4` | 33px | 49px | 41px |
| `5` | 38px | 53px | 47px |

#### Label icon sizes

| `size` | **Font size** | **Icon size** | **Line height** |
| --- | --- | --- | --- |
| `0` | 8.1px | 13px | 10px |
| `1` | 9.5px | 15px | 11px |
| `2` | 10.8px | 17px | 12px |
| `3` | 12.25px | 19px | 13px |
| `4` | 13.6px | 21px | 14px |
| `5` | 15px | 23px | 15px |

#### Color

Icons in `@sanity/icons` use `stroke="currentColor"` (outlined icons) or `fill="currentColor"` (filled icons). This means they automatically inherit color from their parent element. Color should be controlled through `@sanity/ui`'s theming system — not by setting `color`, `fill`, or `stroke` directly on the icon.

| **Context** | **How color is applied** | **Result** |
| --- | --- | --- |
| Default | Inherits `--card-fg-color` from the nearest Card context | Standard foreground color matching surrounding text |
| Muted | Place inside `<Text muted>` | Renders at `--card-muted-fg-color`, a lighter shade for de-emphasized content |
| Semantic tone | Tone is applied on the parent component | Icon color follows the component's tone automatically |
| Status: success | Use `tone="positive"` on the parent component or Card | Green foreground color |
| Status: warning | Use `tone="caution"` on the parent component or Card | Yellow/amber foreground color |
| Status: error | Use `tone="critical"` on the parent component or Card | Red foreground color |
| Status: info | Use `tone="primary"` on the parent component or Card | Blue foreground color |

**Guidance:**

- **Never set **`color`**, **`fill`**, or **`stroke`** directly on icon SVGs.** Let color cascade from the parent component's tone and the Card color context. This ensures icons respond correctly to light/dark mode, high-contrast themes, and tone changes.
- When using icons to communicate status (success, warning, error, info), always pair the colored icon with a text label. Color alone is insufficient for people with color vision deficiencies.
- The muted treatment (via `<Text muted>`) is useful for de-emphasizing secondary icons in dense layouts, such as metadata rows or collapsed sections.

## Choosing the right icon

The library contains 200+ icons. Choosing the right one starts with knowing the categories of icons and the naming conventions used.

This table lists the most-used icons grouped by purpose. Import them from `@sanity/icons`.

| **Purpose** | **Icon name** | **When to use** |
| --- | --- | --- |
| **Navigation** |  |  |
|  | `ChevronDownIcon` | Dropdown or menu trigger |
|  | `ChevronRightIcon` | Drill into nested navigation |
|  | `ChevronLeftIcon` | Go back |
|  | `ArrowRightIcon` | Navigate to a new page |
|  | `LaunchIcon` | Open an external link or new tab |
|  | `MenuIcon` | Open a sidebar or mobile menu |
|  | `CloseIcon` | Close a panel, dialog, or sidebar |
| **Actions** |  |  |
|  | `AddIcon` | Create or add an item |
|  | `EditIcon` | Edit content |
|  | `TrashIcon` | Delete an item |
|  | `CopyIcon` | Duplicate or copy |
|  | `SearchIcon` | Search or filter |
|  | `UploadIcon` | Upload a file |
|  | `PublishIcon` | Publish content |
| **Status** |  |  |
|  | `CheckmarkIcon` | Success or completion |
|  | `CheckmarkCircleIcon` | Success in a badge or inline context |
|  | `WarningOutlineIcon` | Caution or warning — pair with `tone="caution"` |
|  | `ErrorOutlineIcon` | Error or critical state — pair with `tone="critical"` |
|  | `InfoOutlineIcon` | Informational note — pair with `tone="primary"` |
|  | `SpinnerIcon` | Loading state |
| **Editing** |  |  |
|  | `BoldIcon` | Bold text toggle |
|  | `ItalicIcon` | Italic text toggle |
|  | `LinkIcon` | Insert or edit a link |
|  | `ImageIcon` | Insert or manage an image |
|  | `OlistIcon` | Ordered list |
|  | `UlistIcon` | Unordered list |

For the full list of 200+ icons, see the icon guidelines reference

1. **Use the most specific icon available.** Prefer `DocumentTextIcon` over `DocumentIcon` when representing a text document. Prefer `ImageRemoveIcon` over a generic `CloseIcon` when indicating image removal.
1. **Don't use a "close enough" icon.** If no icon in the library clearly represents the concept, it's better to use no icon at all than one that could be misinterpreted. Consider requesting a new icon for the specific use case.
1. **Be consistent across the product.** Once an icon is chosen for a concept, use that same icon everywhere the concept appears. Don't use `CogIcon` for settings in one place and `ControlsIcon` in another.
1. **Match established conventions.** Users bring expectations from other software. A magnifying glass means search. A trash can means delete. A pencil means edit. Don't repurpose universally understood icons for novel meanings.


### Common semantic concepts — icon lookup

Some concepts don't map obviously to an icon name. Use this table before guessing:

| Concept | Use this icon | Notes |
|---------|---------------|-------|
| Location / venue / place | `PinIcon` or `EarthGlobeIcon` | `LocationIcon` does not exist |
| More options (vertical dots) | `EllipsisVerticalIcon` | Three dots stacked vertically |
| More options (horizontal dots) | `EllipsisHorizontalIcon` | Three dots in a row |
| Phone / contact number | `MobileDeviceIcon` or `EnvelopeIcon` | `PhoneIcon` does not exist |
| Change status / sync | `SyncIcon` | `RefreshIcon` does not exist |
| Film / video / media | `DocumentVideoIcon` or `PlayIcon` | `FilmIcon` does not exist |
| Article / document | `DocumentTextIcon` | |
| Person / user profile | `UserIcon` | Plural: `UsersIcon` |
| Tag / label / category | `TagIcon` | Plural: `TagsIcon` |
| Settings / configuration | `CogIcon` | Also `ControlsIcon` for filter panels |
| Notification / alert | `BellIcon` | |
| Calendar / date | `CalendarIcon` | |
| Collapse sidebar / hide panel | `PanelLeftIcon` | Not `ChevronLeftIcon` — use `PanelLeftIcon` for panel controls |
| Expand sidebar / show panel | `PanelRightIcon` | Paired with `PanelLeftIcon` |

> **If an icon name doesn't resolve, it probably doesn't exist.** Browse the full set at [sanity.io/icons](https://icons.sanity.io) rather than guessing adjacent names.

### Naming conventions

Icon names follow PascalCase with an `Icon` suffix. Modifiers appear between the concept and the suffix:

- **Outline/Filled:** `HeartIcon` / `HeartFilledIcon` — outline is the default treatment; filled indicates active/toggled state.
- **Directional:** `ArrowUpIcon`, `ChevronLeftIcon`, `DoubleChevronRightIcon` — direction is always stated in the name.
- **State variants:** `EyeOpenIcon` / `EyeClosedIcon`, `LockIcon` / `UnlockIcon` — opposing states use distinct names instead of a single togglable icon.
- **Related concepts:** `LinkIcon` / `LinkRemovedIcon`, `PinIcon` / `PinRemovedIcon` — the `Removed` suffix indicates negation or deactivation.

### Icons by category

#### Navigation & wayfinding

`ArrowDownIcon`, `ArrowLeftIcon`, `ArrowRightIcon`, `ArrowUpIcon`, `ArrowTopRightIcon`, `ChevronDownIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `ChevronUpIcon`, `DoubleChevronDownIcon`, `DoubleChevronLeftIcon`, `DoubleChevronRightIcon`, `DoubleChevronUpIcon`, `CollapseIcon`, `ExpandIcon`, `HomeIcon`, `LaunchIcon`, `EnterIcon`, `EnterRightIcon`, `LeaveIcon`, `PanelLeftIcon`, `PanelRightIcon`, `MasterDetailIcon`

#### Actions

`AddIcon`, `AddCircleIcon`, `RemoveIcon`, `RemoveCircleIcon`, `EditIcon`, `TrashIcon`, `CopyIcon`, `DownloadIcon`, `UploadIcon`, `ShareIcon`, `SearchIcon`, `FilterIcon`, `SortIcon`, `CropIcon`, `DragHandleIcon`, `ComposeIcon`, `PublishIcon`, `UnpublishIcon`, `RestoreIcon`, `RevertIcon`, `ResetIcon`, `RefreshIcon`, `RetryIcon`, `SyncIcon`, `UndoIcon`, `RedoIcon`, `SelectIcon`, `TransferIcon`, `GenerateIcon`

#### Status & feedback

`CheckmarkIcon`, `CheckmarkCircleIcon`, `CloseIcon`, `CloseCircleIcon`, `ErrorOutlineIcon`, `WarningOutlineIcon`, `InfoOutlineIcon`, `HelpCircleIcon`, `SpinnerIcon`, `AccessDeniedIcon`, `ReadOnlyIcon`, `EyeOpenIcon`, `EyeClosedIcon`, `LockIcon`, `UnlockIcon`

#### Content types & documents

`DocumentIcon`, `DocumentTextIcon`, `DocumentSheetIcon`, `DocumentVideoIcon`, `DocumentWordIcon`, `DocumentZipIcon`, `DocumentPdfIcon`, `DocumentRemoveIcon`, `DocumentsIcon`, `BinaryDocumentIcon`, `ImageIcon`, `ImagesIcon`, `ImageRemoveIcon`, `FolderIcon`, `DatabaseIcon`, `SchemaIcon`, `JsonIcon`, `CodeIcon`, `CodeBlockIcon`

#### Text formatting

`BoldIcon`, `ItalicIcon`, `UnderlineIcon`, `StrikethroughIcon`, `HighlightIcon`, `BlockquoteIcon`, `OlistIcon`, `UlistIcon`, `InlineIcon`, `InlineElementIcon`, `BlockContentIcon`, `BlockElementIcon`, `InsertAboveIcon`, `InsertBelowIcon`, `TruncateIcon`, `StringIcon`, `TextIcon`, `NumberIcon`, `HashIcon`

#### Communication & social

`CommentIcon`, `AddCommentIcon`, `EnvelopeIcon`, `BellIcon`, `HeartIcon`, `HeartFilledIcon`, `StarIcon`, `UserIcon`, `UsersIcon`

#### Objects & concepts

`CogIcon`, `ControlsIcon`, `TagIcon`, `TagsIcon`, `CalendarIcon`, `ClockIcon`, `PinIcon`, `PinRemovedIcon`, `LinkIcon`, `LinkRemovedIcon`, `TokenIcon`, `PackageIcon`, `PlugIcon`, `WrenchIcon`, `RobotIcon`, `RocketIcon`, `SparkleIcon`, `SparklesIcon`, `BoltIcon`, `BookIcon`, `ClipboardIcon`, `ClipboardImageIcon`, `CreditCardIcon`, `DashboardIcon`, `BarChartIcon`, `ChartUpwardIcon`, `TrendUpwardIcon`, `EarthGlobeIcon`, `EarthAmericasIcon`, `ComponentIcon`, `CubeIcon`, `DiamondIcon`

#### Presentation & layout

`MenuIcon`, `ThLargeIcon`, `ThListIcon`, `StackIcon`, `StackCompactIcon`, `SplitHorizontalIcon`, `SplitVerticalIcon`, `TiersIcon`, `DesktopIcon`, `MobileDeviceIcon`, `TabletDeviceIcon`, `ToggleArrowRightIcon`, `EllipsisHorizontalIcon`, `EllipsisVerticalIcon`, `DotIcon`, `CircleIcon`, `SquareIcon`, `TriangleOutlineIcon`


### Code examples

 Icon containers use `Flex`. Any small container that centers an icon needs flex centering. Don't add `style={{ display: 'flex' }}` to a `Box`:
```tsx
{/* ✗ Box converted to flex container via style prop */}
<Box padding={1} radius={2} tone="primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  <DocumentsIcon />
</Box>

{/* ✓ Flex with tone/radius — no inline styles */}
<Flex padding={1} radius={2} tone="primary" alignItems="center" justifyContent="center">
  <DocumentsIcon />
</Flex>
```

# Responsive design

Agents consistently produce layouts that fail reflow, use inline styles for spacing, and skip breakpoint-aware props — across every test run. This document is the reference for doing it correctly.

**Test data summary.** Across 9 iterations (3 runs × control + training groups), `spacing-and-reflow` passed at 0% in every single group. The control group averaged 44–70 inline styles per iteration; the training group averaged 2–8. Documentation eliminates inline style usage. The patterns below are drawn directly from observed failures.

---

## Do / Don't quick reference

| Do | Don't |
|----|-------|
| Use `padding={3}` — know it means 12px | Use `style={{ padding: '12px' }}` |
| Use `gap={2}` on Flex — know it means 8px | Use `style={{ gap: '8px' }}` on Flex |
| Use `minHeight="100vh"` on the outer container | Use `height="100vh"` — it prevents content from growing |
| Use `flexWrap="wrap"` on every horizontal Flex | Let horizontal Flex rows overflow at 320px |
| Use responsive arrays: `padding={[2, null, 4]}` | Write separate media queries or inline styles per breakpoint |
| Use `gridTemplateColumns={['1fr', '1fr 1fr', 'repeat(3, 1fr)']}` for responsive grids | Use fixed column counts with inline CSS |
| Use `minWidth="0"` on flex children that contain text | Let long headings push the layout past the viewport |
| Use `lines={1}` to truncate long text | Use `style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}` |
| Use `maxWidth="260px"` on sidebars instead of `width` | Use `width="260px"` with `flexShrink={0}` — collapses nothing at narrow widths |

---

## 1. Spacing scale

Every `padding`, `margin`, `gap`, `rowGap`, and `columnGap` prop maps to a CSS token. These are the actual pixel values. Use them — never guess with inline styles.

| Token | Pixels | Use case |
|-------|--------|----------|
| `0` | 0px | Remove all spacing |
| `1` | 4px | Tight internal spacing, icon gaps |
| `2` | 8px | Default gap for button/icon rows, compact lists |
| `3` | 12px | Standard internal padding, nav items, form rows |
| `4` | 20px | Content area padding, section separation |
| `5` | 32px | Large section gaps, between major layout regions |
| `6` | 52px | Page-level vertical rhythm |
| `7` | 84px | Intentional breathing room in low-density layouts |
| `8` | 136px | Large display spacing |
| `9` | 220px | Maximum spacing — rarely needed |

**Most common values in practice:**
- `gap={2}` (8px) — toolbar icon-button rows
- `gap={3}` (12px) — standard flex row gaps
- `padding={3}` (12px) — default card / nav item padding
- `padding={4}` (20px) — content area padding

```tsx
{/* ✗ Undiscoverable pixel values via inline style */}
<Box style={{ padding: '12px', gap: '8px' }} />

{/* ✓ Token-based — scales with user font-size settings */}
<Box padding={3} />
<Flex gap={2} />
```

---

## 2. Breakpoints and responsive arrays

Every layout prop that accepts a `Responsive<T>` type also accepts an array. Each position in the array maps to a breakpoint using `min-width`. Position `0` is the base (no media query — applies from 0px up, including 320px).

### Breakpoint table

| Array index | Min-width | Typical target |
|-------------|-----------|----------------|
| `[0]` | none (base) | 320px — narrow mobile, 400% zoom |
| `[1]` | `360px` | Standard mobile |
| `[2]` | `600px` | Large phone / small tablet |
| `[3]` | `900px` | Tablet / small laptop |
| `[4]` | `1200px` | Desktop |
| `[5]` | `1800px` | Large desktop |
| `[6]` | `2400px` | Ultra-wide |

### Syntax

```tsx
{/* Single value — applies at all breakpoints */}
<Box padding={3} />

{/* Array — different value per breakpoint */}
<Box padding={[2, null, 3, 4]} />
{/*         ^    ^     ^  ^
            base 360px 600px 900px   */}
```

**`null` means "inherit the previous breakpoint's value."** It does not reset to the default. Use it to skip a breakpoint without specifying a new value.

```tsx
{/* ✓ Correct — null skips 360px, uses 'row' from 600px up */}
<Flex flexDirection={['column', null, 'row']} />

{/* ✗ Wrong — TypeScript may accept undefined but null is the correct skip value */}
<Flex flexDirection={['column', undefined, 'row']} />
```

### Common responsive patterns

**Layout direction — column on mobile, row on desktop:**
```tsx
<Flex flexDirection={['column', null, 'row']} gap={[2, null, 4]}>
  <Box flexBasis={['100%', null, '260px']} flexShrink={0}>Sidebar</Box>
  <Box flexGrow={1} minWidth="0">Content</Box>
</Flex>
```

**Padding — tighter on mobile:**
```tsx
<Box padding={[2, null, 4]}>
  {/* 8px on mobile, 20px on 600px+ */}
</Box>
```

**Text size — larger at wider viewports:**
```tsx
<Heading level={1} size={[1, null, null, 3]} />
{/* size 1 on mobile, size 3 on 900px+ */}
```

**Alignment — centered on mobile, start on desktop:**
```tsx
<Text align={['center', null, 'start']} />
```

---

## 3. 320px reflow (WCAG 1.4.10)

Layouts must work at 320px with no horizontal scrolling. This test fails at 0% across all control runs. See **foundations-accessibility.md § 7** for the complete 320px reflow checklist and canonical layout pattern.

The three most common causes of failure:

### 1. Fixed sidebar width with `flexShrink={0}`

```tsx
{/* ✗ FAILS — sidebar won't collapse below 260px */}
<Flex>
  <Box width="260px" flexShrink={0}>Sidebar</Box>
  <Box flexGrow={1}>Content</Box>
</Flex>

{/* ✓ PASSES — sidebar stacks on top at narrow widths */}
<Flex flexWrap="wrap" minHeight="100vh">
  <Box
    flexGrow={1}
    flexShrink={1}
    flexBasis="100%"
    maxWidth="260px"
  >
    Sidebar
  </Box>
  <Box flexGrow={1} flexShrink={1} flexBasis="0" minWidth="0" overflow="hidden">
    Content
  </Box>
</Flex>
```

### 2. Toolbar Flex without `flexWrap`

```tsx
{/* ✗ FAILS — heading + button overflow at 320px */}
<Flex alignItems="center" justifyContent="space-between">
  <Heading level={1}>All Documents</Heading>
  <Button text="New document" icon={AddIcon} />
</Flex>

{/* ✓ PASSES — button wraps to next line at narrow widths */}
<Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
  <Heading level={1}>All Documents</Heading>
  <Button text="New document" icon={AddIcon} />
</Flex>
```

### 3. `height="100vh"` on the outer container

```tsx
{/* ✗ FAILS — fixed height clips stacked content */}
<Flex height="100vh" />

{/* ✓ PASSES — container grows when sidebar stacks above content */}
<Flex minHeight="100vh" />
```

---

## 4. Responsive Grid columns

Grid's `gridTemplateColumns` prop accepts a responsive array. This is the standard pattern for responsive card grids. Use `fr` units and `repeat()` — never hardcode pixel widths.

```tsx
{/* ✓ 1 column on mobile, 2 on tablet, 3 on desktop */}
<Grid
  gridTemplateColumns={['1fr', null, '1fr 1fr', 'repeat(3, 1fr)']}
  gap={3}
>
  {items.map(item => (
    <Card key={item.id}>{item.title}</Card>
  ))}
</Grid>
```

**Use `minmax()` for fluid grids that don't require exact breakpoints:**
```tsx
{/* Auto-fills columns, minimum 240px each, maximum 1fr */}
<Grid
  gridTemplateColumns="repeat(auto-fill, minmax(240px, 1fr))"
  gap={3}
>
```

**Common column patterns:**

| Layout | `gridTemplateColumns` |
|--------|----------------------|
| Full-width single column | `'1fr'` |
| Two even columns | `'1fr 1fr'` or `'repeat(2, 1fr)'` |
| Sidebar + content | `'260px 1fr'` |
| Responsive 1→2→3 | `['1fr', null, '1fr 1fr', 'repeat(3, 1fr)']` |
| Auto-fill fluid | `'repeat(auto-fill, minmax(240px, 1fr))'` |

**`gridColumn` on children for spanning:**
```tsx
{/* Featured item spans all 3 columns */}
<Grid gridTemplateColumns="repeat(3, 1fr)" gap={3}>
  <Card gridColumn="1 / -1">Featured</Card>
  <Card>Item A</Card>
  <Card>Item B</Card>
</Grid>
```

---

## 5. Sizing: width, minWidth, maxWidth

Prefer `min-width` and `max-width` over fixed `width` whenever content may overflow or the container needs to collapse responsively.

### Width vs minWidth vs maxWidth

| Prop | Use when |
|------|----------|
| `width` | The element must be exactly this size (icons, avatars, fixed UI chrome) |
| `minWidth` | The element must be at least this size but can grow |
| `maxWidth` | The element must not exceed this size but can shrink |
| `minWidth="0"` | The element is a flex child containing text that may overflow |

### `minWidth="0"` on flex children

This is the most commonly missed prop. By default, a flex child's minimum size is its content size — it won't shrink below the longest word in a heading. Setting `minWidth="0"` allows the child to shrink past its content size, enabling text truncation and preventing overflow.

```tsx
{/* ✗ Long heading in flex row pushes layout past viewport */}
<Flex gap={3}>
  <Heading level={1}>A very long document title that overflows</Heading>
  <Button icon={CloseIcon} aria-label="Close" />
</Flex>

{/* ✓ Heading container can shrink; text truncates instead of overflowing */}
<Flex gap={3}>
  <Box flexGrow={1} minWidth="0">
    <Heading level={1} lines={1}>A very long document title that overflows</Heading>
  </Box>
  <Button icon={CloseIcon} aria-label="Close" flexShrink={0} />
</Flex>
```

### height vs minHeight

| Prop | Behaviour |
|------|-----------|
| `height="100vh"` | Container is exactly 100vh — content that overflows is clipped or causes scroll on the inner element only |
| `minHeight="100vh"` | Container is at least 100vh but grows when stacked content is taller |

Always use `minHeight="100vh"` on the outermost layout container. `height="100vh"` is appropriate only when the container must scroll internally (e.g., a sidebar with `overflowY="auto"`).

```tsx
{/* ✗ Sidebar stacks above content but container clips at 100vh */}
<Flex flexWrap="wrap" height="100vh">

{/* ✓ Container grows to fit stacked content at narrow widths */}
<Flex flexWrap="wrap" minHeight="100vh">
```

---

## 6. Text overflow

Use the `lines` prop on `Text` and `Heading` to truncate text at a specific number of lines. This uses CSS `-webkit-line-clamp` and works correctly within flex and grid containers.

```tsx
{/* ✗ Inline overflow styles bypass the spacing scale and break in flex containers */}
<Heading
  level={2}
  style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
>
  Long title
</Heading>

{/* ✓ Single-line truncation with full text accessible via tooltip or title */}
<Heading level={2} lines={1}>Long title</Heading>

{/* ✓ Multi-line clamp */}
<Text size={1} lines={3}>
  This description will show three lines maximum and then clip with an ellipsis.
</Text>
```

**Always pair truncated text with a `Tooltip` or `title` attribute** so screen reader users and pointer users can access the full content:

```tsx
<Tooltip content={fullTitle} placement="bottom">
  <Heading level={2} lines={1}>{fullTitle}</Heading>
</Tooltip>
```

**`lines` accepts a responsive array** — you can show more lines on wider viewports:

```tsx
{/* 1 line on mobile, 2 on tablet, unclamped on desktop */}
<Text size={1} lines={[1, null, 2, undefined]}>
  {description}
</Text>
```

---

## 7. Inline styles — when they are and are not appropriate

The training data shows a dramatic reduction in inline styles when documentation is provided (44–70/iteration without docs → 2–8/iteration with docs). In nearly every case where an inline style appears in generated code, a prop or component already handles it.

### Never use inline styles for these — use the prop instead

| Inline style | Replace with |
|---|---|
| `style={{ padding: '12px' }}` | `padding={3}` |
| `style={{ gap: '8px' }}` | `gap={2}` (on Flex or Grid) |
| `style={{ width: '260px' }}` | `width="260px"` |
| `style={{ minWidth: '0' }}` | `minWidth="0"` |
| `style={{ height: '100vh' }}` | `height="100vh"` |
| `style={{ minHeight: '100vh' }}` | `minHeight="100vh"` |
| `style={{ overflow: 'hidden' }}` | `overflow="hidden"` |
| `style={{ overflowY: 'auto' }}` | `overflowY="auto"` |
| `style={{ flexGrow: 1 }}` | `flexGrow={1}` |
| `style={{ flexShrink: 0 }}` | `flexShrink={0}` |
| `style={{ display: 'flex' }}` | Use `<Flex>` instead of `<Box>` |
| `style={{ flexDirection: 'column' }}` | `flexDirection="column"` on Flex |
| `style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}` | `lines={1}` on Heading or Text |
| `style={{ fontSize: '24px' }}` on an icon | Wrap in `<Text as="span" size={3}>` |
| `style={{ borderRadius: '4px' }}` | `radius={2}` on Box or use Card `density` |
| `style={{ background: 'var(--card-bg)' }}` on Box | Use a Card ancestor or `tone` on Box |

### When inline styles are acceptable

Inline styles are appropriate only for values that have no prop equivalent and cannot be expressed with a spacing token:

```tsx
{/* Acceptable — no prop for arbitrary string-based grid template */}
<Grid style={{ gridTemplateColumns: 'auto 1fr auto' }} />

{/* Acceptable — position offsets for custom absolute positioned elements */}
<Box position="absolute" style={{ top: '50%', transform: 'translateY(-50%)' }} />

{/* Acceptable — CSS custom property override for a specific instance */}
<Box style={{ '--border-color': 'var(--blue-500)' }} />
```

---

## 8. `overflow: hidden` and portal-dependent components

When a container has `overflow="hidden"` or `overflowY="auto"`, any child component that renders a floating element (Menu, Tooltip, Dialog, Popover) will be clipped by the container boundary unless it uses a portal.

### MenuButton in overflow containers

```tsx
{/* ✗ Menu clips silently — no error, just invisible */}
<Box overflowY="auto">
  <MenuButton
    id="doc-actions"
    button={<Button text="Actions" />}
    menu={<Menu>...</Menu>}
  />
</Box>

{/* ✓ Menu escapes the overflow boundary via portal */}
<Box overflowY="auto">
  <MenuButton
    id="doc-actions"
    button={<Button text="Actions" />}
    menu={<Menu>...</Menu>}
    popover={{ portal: true }}
  />
</Box>
```

**Rule:** Any `MenuButton`, `Tooltip`, or `Popover` inside a scrollable or `overflow: hidden` container requires `popover={{ portal: true }}`. The failure is completely silent — no console error, no visual indicator.

---

## 9. Responsive layout checklist

Run through this before shipping any layout. A single missed item causes `spacing-and-reflow` to fail.

**Container**
- [ ] Outer layout Flex uses `minHeight` (not `height`)
- [ ] Outer layout Flex has `flexWrap="wrap"`

**Sidebar**
- [ ] No `width` + `flexShrink={0}` combination
- [ ] Uses `maxWidth` instead to cap width while allowing collapse
- [ ] Has `overflowY="auto"` if content scrolls

**Main content area**
- [ ] `flexGrow={1} flexShrink={1} flexBasis="0"` to fill remaining space
- [ ] `minWidth="0"` to prevent text overflow
- [ ] `overflow="hidden"` to contain long words and headings

**Every horizontal Flex row (toolbar, action bar, card actions)**
- [ ] `flexWrap="wrap"` present
- [ ] `gap={2}` or higher present (wrapping without gap creates collapsed-looking rows)

**Typography**
- [ ] Long headings inside flex rows are in a `minWidth="0"` wrapper
- [ ] Truncated text uses `lines` prop, not inline overflow styles
- [ ] Truncated text is paired with `Tooltip` or `title` attribute

**Spacing**
- [ ] All padding and margin use scale tokens (0–9), not inline px values
- [ ] All gap values use scale tokens, not inline px values

**Menus and popovers**
- [ ] Any `MenuButton` or `Tooltip` inside a scrollable container has `popover={{ portal: true }}`

**Grid**
- [ ] `gridTemplateColumns` uses `fr`, `auto`, or `minmax()` — not fixed pixel widths
- [ ] Responsive column count uses responsive array, not a single fixed value

# Theming

Theming in Sanity UI controls how color, typography, spacing, and shadows render across every component. The theme is a data object. You build it once, pass it to `ThemeProvider`, and every descendant component reads from it. You do not style components one by one. You configure the theme, and the system does the rest.

Two packages power the theme system. `@sanity/color` provides the base palette: 9 hues, 11 tint steps each, plus black and white. `@sanity/ui` consumes that palette through a token layer. That layer produces CSS custom properties for every color context. Designers and engineers do not pick colors by hand. They select **tones**, **schemes**, and **states**. The theme resolves those choices to the correct values.

---

## Setting up a theme

### ThemeProvider

Every Sanity UI app must wrap its component tree in a `ThemeProvider`. This provider accepts a `theme` object and makes it available to all children through React context.

```jsx
import {ThemeProvider} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'

const theme = buildTheme()

function App() {
  return (
    <ThemeProvider theme={theme}>
      {/* All Sanity UI components go here */}
    </ThemeProvider>
  )
}
```

Without `ThemeProvider`, components have no access to color tokens, spacing scales, or font stacks. Always place it at the root of your app.

**CSS reset.** `ThemeProvider` does not inject global styles for `<body>` or `<html>`. You must manage your own CSS reset. At minimum, add this to your global stylesheet:

```css
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
```

**`styled-components` is a required peer dependency.** Install it alongside `@sanity/ui`:

```sh
npm install @sanity/ui @sanity/icons styled-components
```

If `styled-components` is missing, components render with no styles and no error. For Vite projects, use `@vitejs/plugin-react` (Babel). The SWC variant does not support the Babel plugin that `styled-components` uses for display names and SSR. If you see flash-of-unstyled-content in production, add `babel-plugin-styled-components` to your Vite config.

### buildTheme

The `buildTheme` function from `@sanity/ui/theme` produces the default Sanity UI theme. Call it with no arguments to get the standard configuration. This is the starting point for all custom themes.

```jsx
import {buildTheme} from '@sanity/ui/theme'

// Default theme — no options needed
const theme = buildTheme()
```

The returned object contains color definitions for every tone, scheme, and state, plus typography scales, spacing values, and shadow definitions.

**`studioTheme` vs `buildTheme()`.** `studioTheme` (from `@sanity/ui`) is a pre-built theme object ready to use. `buildTheme()` (from `@sanity/ui/theme`) builds a fresh theme from defaults. Both produce the same result with no arguments. Use `studioTheme` for the standard look. Use `buildTheme()` when you need to pass custom options.

### buildLegacyTheme (Sanity Studio)

Sanity Studio uses `buildLegacyTheme` from the `sanity` package to create studio-level themes. This is a separate entry point for Studio configuration, not for standalone Sanity UI apps.

```jsx
import {buildLegacyTheme, defineConfig} from 'sanity'

const myTheme = buildLegacyTheme({
  '--black': '#1a1a1a',
  '--white': '#fff',
  '--brand-primary': '#4285f4',
  '--state-danger-color': '#db4437',
  '--state-success-color': '#0f9d58',
  '--state-warning-color': '#f4b400',
  '--state-info-color': '#4285f4',
  '--focus-color': '#4285f4',
})

export default defineConfig({
  theme: myTheme,
  // ...rest of config
})
```

Use `buildLegacyTheme` when theming Sanity Studio. Use `buildTheme` when building standalone apps or custom tools with `@sanity/ui`.

---

## Core concepts

### Schemes

The color system supports two schemes: `"light"` and `"dark"`. A scheme controls whether backgrounds are light with dark text, or dark with light text.

- The root scheme is set on `ThemeProvider` via the `scheme` prop.
- Any `Card` can override the scheme for its subtree using its own `scheme` prop. This is how a dark panel appears inside a light interface — the Card sets `scheme="dark"` and all descendants inherit the dark tokens.
- Every color token stores two values internally: one for light, one for dark. The active scheme picks the right one.
- Scheme cascades downward through the component tree. A `scheme="dark"` Card inside a light app creates a dark island. Nested Cards inside that dark island inherit dark mode unless they override it again.

#### Light scheme defaults

| Element | Source | Example |
| --- | --- | --- |
| Card background | `white` | `#ffffff` |
| Card foreground | Gray 800 | `#252837` |
| Border | Gray 200 | `#e3e4e8` |
| Icon | Gray 600 | `#515870` |
| Muted foreground | Gray 700 at 75% | De-emphasized text |
| Link | Blue 600 | `#4043e7` |
| Focus ring | Blue 500 | `#556bfc` |

#### Dark scheme defaults

| Element | Source | Example |
| --- | --- | --- |
| Card background | Gray 950 | `#13141b` |
| Card foreground | Gray 200 | `#e3e4e8` |
| Border | Gray 800 | `#252837` |
| Icon | Gray 400 | `#9499ad` |
| Muted foreground | Gray 300 at 75% | De-emphasized text |
| Link | Blue 300 | `#a8bfff` |
| Focus ring | Blue 500 | `#556bfc` |

The tint steps for foreground and background are roughly inverted between schemes. Light uses an 800-range foreground on a white background. Dark uses a 200-range foreground on a 950-range background. This inversion is consistent across all tones.

### Tones

Tones map a semantic intent to a palette hue. They are the primary way to apply meaningful color. Set a `tone` on a Card, Button, Badge, or other component, and the theme handles the rest.

| Tone | Hue | Purpose |
| --- | --- | --- |
| `"default"` | Gray | Standard surface with no semantic meaning |
| `"neutral"` | Gray | Distinct from default in multi-tone layouts |
| `"primary"` | Blue | Brand or informational emphasis — **see contrast warning below** |
| `"suggest"` | Purple | Suggestions or AI-related content |
| `"positive"` | Green | Success, completion, health |
| `"caution"` | Yellow | Attention needed, non-blocking warning |
| `"critical"` | Red | Error, failure, destructive action |

Not every component supports every tone. Check the component doc for its accepted values. The visual treatment of a tone (hue, saturation, contrast) varies by component. A `"critical"` Button is a solid red fill. A `"critical"` Card is a light red tint. The meaning is the same. The intensity differs.

**`tone="primary"` fails WCAG AA contrast.** The default theme produces white text (`#fff`) on `#556bfc` for `tone="primary"` in default mode. The contrast ratio is 4.29:1 — below the 4.5:1 AA threshold. Automated tests flag this every time. Use `tone="default"` for primary actions. Do not use `tone="primary"` on Buttons, Cards, or MenuItems that display standard-size text. See `accessibility-standards.md` §4 for the full table of palette colors that fail with white text.

### States

Interactive components cycle through states that affect their color tokens:

| State | Trigger | Visual effect |
| --- | --- | --- |
| Enabled | Default resting state | Base colors for the tone and mode |
| Hovered | Cursor enters the element | Background shifts toward a stronger value |
| Pressed | Click or touch is active | Background shifts further in the same direction |
| Selected | Element is in a chosen state | Background becomes saturated with an inverted foreground |
| Disabled | Element is non-interactive | Colors shift to gray; contrast drops |

State colors are defined per tone, per mode, per scheme. You do not set them by hand. Interact with the component, and the theme produces the right values.

---

## The color palette

The base palette lives in `@sanity/color`. It provides 9 hues, each with 11 tint steps. Black and white sit outside the hue scale.

### Hues

| Hue | Key hex (500 tint) | Role in the system |
| --- | --- | --- |
| Gray | `#727892` | Default UI chrome, borders, muted text |
| Blue | `#556bfc` | Primary/brand tone, links, focus rings |
| Purple | `#8f57ef` | Suggest tone, accent color |
| Magenta | `#e72767` | Avatar colors, syntax highlighting |
| Red | `#ef4434` | Critical tone — errors, destructive actions |
| Orange | `#fa6400` | Syntax highlighting, avatar colors |
| Yellow | `#d28a04` | Caution tone — warnings |
| Green | `#04b97a` | Positive tone — success, healthy states |
| Cyan | `#04b8be` | Avatar colors, syntax highlighting |

### Tint scale

Each hue has 11 tint steps. Lower numbers are lighter. Higher numbers are darker.

| Tint | Character | Common use |
| --- | --- | --- |
| 50 | Near-white | Card backgrounds (light), subtle highlights |
| 100 | Light | Skeleton states, hover backgrounds |
| 200 | Light | Borders, badge backgrounds (light) |
| 300 | Light-mid | Icon color (dark), muted foregrounds |
| 400 | Mid-light | Foreground color (dark), badge foregrounds |
| 500 | Mid | Button backgrounds (default mode) |
| 600 | Mid-dark | Foreground color (light), icon color (light) |
| 700 | Dark | Text foregrounds (light), muted text |
| 800 | Dark | Default card foreground (light), borders (dark) |
| 900 | Near-black | Card backgrounds (dark) |
| 950 | Deepest | Card base backgrounds (dark) |

### Black and white

The palette includes black (`#0d0e12`) and white (`#ffffff`). The black value is not pure `#000000`. It is a dark blue-gray. This avoids the harshest extreme, improves readability, and leaves room for further darkening on hover or press states.

---

## How color flows through components

### The Card color context

Color flows through the **Card** component. Card is more than a container. It is a color context provider. When you set `tone` or `scheme` on a Card, it writes CSS custom properties onto that DOM subtree. Every child inherits them.

- Text inside a `tone="critical"` Card receives the critical foreground color.
- Icons, borders, badges, and links all adapt to the Card's tone.
- Nested Cards can override the tone for their own subtree.

Set color at the Card level. Let children inherit. Do not style children one by one.

### CSS custom properties

The theme generates `--card-*` CSS custom properties for each color context. These are how color reaches every element.

**When to use them.** Reference `--card-*` properties only for custom elements that must match the Card color context. Examples include a custom border, a custom divider, or a status dot that inherits the tone's foreground color. Always prefer component props (`tone`, `muted`, `scheme`) over raw CSS variables. If a Sanity UI component already has a prop for the color you need, use the prop.

**When NOT to use them.** Do not reference `--card-*` variables in global styles, in components outside a Card context, or to override a Sanity UI component's built-in colors. The variables are scoped to the nearest Card ancestor. Outside a Card, they may be undefined.

**Surface colors:**

| Variable | Purpose |
| --- | --- |
| `--card-bg-color` | Background color |
| `--card-fg-color` | Foreground (text) color |
| `--card-border-color` | Border color |
| `--card-icon-color` | Icon color |

**Content variants:**

| Variable | Purpose |
| --- | --- |
| `--card-muted-fg-color` | De-emphasized text and icons |
| `--card-muted-bg-color` | Muted background (code blocks) |
| `--card-accent-fg-color` | Accent text color |
| `--card-link-fg-color` | Link text color |

**Focus and shadow:**

| Variable | Purpose |
| --- | --- |
| `--card-focus-ring-color` | Focus ring color |
| `--card-shadow-outline-color` | Shadow outline (tone-specific) |
| `--card-shadow-umbra-color` | Shadow umbra layer |
| `--card-shadow-penumbra-color` | Shadow penumbra layer |
| `--card-shadow-ambient-color` | Shadow ambient layer |

**Code and keyboard:**

| Variable | Purpose |
| --- | --- |
| `--card-code-bg-color` | Code block background |
| `--card-code-fg-color` | Code block foreground |
| `--card-kbd-bg-color` | Keyboard badge background |
| `--card-kbd-fg-color` | Keyboard badge foreground |
| `--card-kbd-border-color` | Keyboard badge border |

These properties update when a Card's `tone` or `scheme` changes. A custom style using `color: var(--card-fg-color)` adapts to light mode, dark mode, and every tone with no extra work.

**Badge colors (per tone):** Each semantic tone generates `--card-badge-{tone}-bg-color`, `--card-badge-{tone}-fg-color`, `--card-badge-{tone}-dot-color`, and `--card-badge-{tone}-icon-color`.

**Avatar colors (per hue):** Each palette hue generates `--card-avatar-{hue}-bg-color` and `--card-avatar-{hue}-fg-color`.

---

## Typography

The theme defines font families, size scales, weight values, and line heights. Components like Text, Heading, and Label read these from the theme context. You do not set typography through CSS — you set it through component props (`size`, `weight`, `muted`, `accent`).

### Font stack

The default theme uses the Inter font family with a system fallback stack. Headings and body text share the same family.

### Size scale

Typography size is controlled through numbered props (`size={0}` through `size={5}`). Each step maps to a `font-size` and `line-height` pair defined in the theme. See the Text and Heading component docs for the full size tables.

### Weight

Font weight uses named values: `"regular"`, `"medium"`, `"semibold"`, and `"bold"`. The theme maps these to numeric values (400, 500, 600, 700). Use the `weight` prop on Text and Heading instead of setting `font-weight` in CSS.

---

## Spacing

The theme provides a spacing scale that all padding, margin, and gap props reference. Values range from `0` to `9`. Each step maps to a pixel value.

| Value | Pixels | Common use |
| --- | --- | --- |
| 0 | 0px | No spacing |
| 1 | 4px | Tight gaps within dense controls |
| 2 | 8px | Compact padding (toolbars, sidebar items) |
| 3 | 12px | Standard padding (content cards, buttons) |
| 4 | 20px | Spacious padding (form sections) |
| 5 | 32px | Generous padding (onboarding cards, auth forms) |
| 6 | 52px | Large spacing (rarely needed) |
| 7 | 84px | Extra-large (rarely needed) |
| 8 | 136px | Page-level spacing (rarely needed) |
| 9 | 220px | Largest step (rarely needed) |

Use scale values, not pixel values. The spacing scale keeps layouts consistent and allows the theme to adjust the base unit if needed.

---

## Shadows

Shadows express elevation. The theme defines shadow levels from `0` to `5`. Higher levels produce larger, more diffuse shadows.

| Level | Use case |
| --- | --- |
| 0 | Hairline shadow — use with caution |
| 1 | Low elevation — elements floating above the surface |
| 2 | Mid elevation — use with caution |
| 3 | High elevation — dialogs and popovers |
| 4–5 | Reserved for rare, high-emphasis overlays |

Shadow tokens include umbra, penumbra, and ambient layers. They adapt between light and dark schemes. Do not create custom `box-shadow` values that bypass the theme.

---

## Applying color in practice

When choosing how to apply color, follow this order of preference:

1. **Tone on the Card.** Does the content area need semantic meaning? Set `tone` on the enclosing Card.
2. **Tone on the component.** Does a button or badge need semantic meaning? Set `tone` on that component.
3. **Muted prop.** Does content need less emphasis? Use `muted` on Text or Card instead of picking a lighter color.
4. **Scheme override.** Does a section need to invert the palette? Set `scheme="dark"` on a Card inside a light interface. Use this sparingly.
5. **Accent prop.** Does text need brand-colored emphasis? Use `accent` on Text. Use sparingly.
6. **Direct palette reference.** As a last resort — for charts, data visualizations, or elements outside `@sanity/ui` — reference `@sanity/color` values.

---

## Dark mode

Dark mode is not a separate theme. It is the second value in every color token pair. When the scheme is `"dark"`, the theme selects the dark variant for each token.

### How to add a dark mode toggle

Pass `scheme` to `ThemeProvider` to set the root scheme. Use React state to toggle it.

```jsx
import { useState } from 'react'
import { ThemeProvider, studioTheme, Card, Button } from '@sanity/ui'

function App() {
  const [scheme, setScheme] = useState('light')

  return (
    <ThemeProvider theme={studioTheme} scheme={scheme}>
      <Card padding={4}>
        <Button
          text={scheme === 'light' ? 'Switch to dark' : 'Switch to light'}
          onClick={() => setScheme(s => s === 'light' ? 'dark' : 'light')}
          mode="ghost"
        />
        {/* Rest of your app */}
      </Card>
    </ThemeProvider>
  )
}
```

**Match the system setting.** To follow the user's OS preference, read `prefers-color-scheme` on mount:

```jsx
import { useState, useEffect } from 'react'

function useSystemScheme() {
  const [scheme, setScheme] = useState('light')

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setScheme(mq.matches ? 'dark' : 'light')
    const handler = (e) => setScheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return scheme
}

// Usage:
const scheme = useSystemScheme()
<ThemeProvider theme={studioTheme} scheme={scheme}>
```

### Invert a section with Card scheme

To create a dark panel inside a light interface, set `scheme="dark"` on a Card. All descendants inherit the dark tokens.

```jsx
/* Light app with a dark sidebar */
<ThemeProvider theme={studioTheme} scheme="light">
  <Flex>
    <Card scheme="dark" padding={3} style={{ width: '260px' }}>
      {/* This sidebar and all its children render in dark mode */}
      <Text>Dark sidebar content</Text>
    </Card>
    <Card flex={1} padding={4}>
      {/* This content stays in light mode */}
      <Text>Light content area</Text>
    </Card>
  </Flex>
</ThemeProvider>
```

### What adapts on its own

When a Card's scheme changes, all descendants adapt with no extra code:

- Text foreground colors invert.
- Icon colors shift to lighter tints.
- Borders shift from light tints (200) to dark tints (800).
- Badge backgrounds and foregrounds swap.
- Input backgrounds invert.
- Focus rings keep blue 500 in both schemes.
- Syntax highlighting colors shift between tint 600 (light) and tint 400 (dark).

### What does not adapt

- Hardcoded hex values in custom CSS.
- Colors set through inline `style` props.
- Images, illustrations, and raster content.
- Third-party libraries that do not consume `--card-*` variables.

Dark mode support is not optional polish. It is a core requirement. Avoiding hardcoded color values is how you meet it.

---

## Best practices

**Do**

- Use `buildTheme()` or `buildLegacyTheme()` as your starting point. Build from the default and override what you need.
- Wrap your app in `ThemeProvider` at the root. Every Sanity UI component expects it.
- Set color through `tone`, `scheme`, and `muted` props. Let the theme resolve the values.
- Use `--card-*` CSS custom properties when building custom components that must follow the color context.
- Test every custom component in both light and dark schemes.
- Test every semantic tone (positive, caution, critical) to confirm colors adapt.

**Don't**

- Don't hardcode hex values for colors that the theme provides. Hardcoded values break in dark mode and ignore tone contexts.
- Don't reference `--card-*` variables in component styles unless building a custom component within the Card color context. Prefer `tone` and `muted` props on standard components.
- Don't use `ThemeColorProvider` unless building low-level infrastructure. Use Card's `tone` and `scheme` props instead.
- Don't assign meaning to raw hues. Users should see "positive" or "critical," not "green" or "red." The mapping from tone to hue is the theme's job.
- Don't set `font-size`, `font-weight`, `color`, or `background-color` through inline styles or custom CSS when a component prop exists for that purpose.
- Don't create your own spacing values outside the 0–9 scale. Stick to the theme's scale for consistency.
- Don't hardcode dark/light background colors on the root `<Box>`. Instead, set `body { background: var(--card-bg-color); color: var(--card-fg-color); }` in `global.css`. When `ThemeProvider` changes scheme, these variables update automatically — no inline style needed on any component.

---

## Interactive state colors by button mode

State behavior varies by button mode. Understanding this helps when building custom interactive components.

**Default mode (solid fill):**

- Enabled: Saturated background (e.g., gray 800 for default tone).
- Hovered: Darker background.
- Pressed: Darkest background.
- Foreground is white (light scheme) or black (dark scheme) in all states.

**Ghost mode (outlined):**

- Enabled: Light or clear background with a border.
- Hovered: Subtle background tint appears.
- Pressed: Stronger background tint.
- Foreground uses the tone's mid-range tint.

**Bleed mode (no chrome):**

- Enabled: No background, no border.
- Hovered: Subtle background tint appears.
- Pressed: Stronger background tint.
- The most minimal state changes, by design.

**Disabled state (all modes):**

- Hue shifts to gray, stripping semantic meaning.
- Contrast drops to signal non-interactivity.
- The `disabled` attribute handles keyboard and screen reader exclusion.

---

## Input colors

Form inputs have their own color layer on top of the Card context.

| State | Visual effect |
| --- | --- |
| Enabled | White background (light) or black background (dark) with a standard border |
| Hovered | Border color shifts to signal interactivity |
| Read-only | Muted background to show the value cannot change |
| Disabled | Gray background, reduced text contrast |
| Invalid | Subtle red tint on the background; red 100 (light) or red 950 (dark) |

The invalid state must always pair with a visible error message. The tinted background alone is not enough.

---

## Syntax highlighting

The theme provides tokens for syntax-highlighted code. Each token type maps to a hue. Light scheme uses tint 600. Dark scheme uses tint 400.

| Token type | Hue |
| --- | --- |
| Keywords, operators | Magenta |
| Strings, characters | Yellow |
| Functions, attributes | Green |
| Properties, regex | Blue |
| Constants, numbers | Purple |
| Tags, selectors, URLs | Red |
| Classes, units | Orange |
| Comments, punctuation | Gray |

These tokens are applied by the Code component. Do not apply syntax colors by hand. The theme manages them for dark mode support.

---

## Avatar colors

Avatars use a distinct mapping. A user identifier is hashed to one of the 9 palette hues. Each hue generates a background/foreground pair:

- Light scheme: hue 500 background, white foreground.
- Dark scheme: hue 400 background, black foreground.

The assignment is deterministic. The same user always receives the same color. The blend mode inverts between schemes (`screen` for light, `multiply` for dark) to keep contrast.

---

## Accessibility

### Contrast ratios

The tint scale is designed to meet WCAG AA targets:

- Tints 600 and above on white backgrounds meet AA for normal text (4.5:1 or higher).
- Tints 700 and above on white backgrounds meet AAA for normal text (7:1 or higher).
- The default foreground (gray 800 on white) provides roughly 10:1 contrast.
- Dark scheme foregrounds (gray 200 on gray 950) provide roughly 9:1 contrast.

These ratios hold across all semantic tones.

### Focus ring

The focus ring uses blue 500 (`#556bfc`) in both light and dark schemes. Blue was chosen for its contrast against all tone backgrounds. The ring has two layers: an inner inset shadow and an outer outset shadow. A gap between them matches the Card background. This creates a clear, high-contrast indicator that does not depend on the element's border.

### Color independence

Never rely on color alone to convey meaning. Every use of a semantic tone must pair with a non-color indicator:

| Context | Color signal | Required pairing |
| --- | --- | --- |
| Card with `tone="critical"` | Red background | Text label + status icon |
| Button with `tone="critical"` | Red fill | Text label naming the action |
| Badge with `tone="caution"` | Yellow badge | Text content within the badge |
| Toast | Tone-colored background | Text message + status icon |
| Form validation | Red input tint | Error message below the input |

### Disabled elements

Disabled elements drop below WCAG contrast minimums on purpose. Reduced contrast signals "not available." The key requirement: users must discover **why** the element is disabled and **how** to enable it. Convey this through surrounding text, not through the element's own color.

---

## Theming for Sanity Studio

When theming Sanity Studio, use `buildLegacyTheme` in your `sanity.config.ts` file. The available override variables cover base colors, brand, button states, navbar, and focus:

| Variable | Controls |
| --- | --- |
| `--black` | Base black |
| `--white` | Base white |
| `--gray` / `--gray-base` | Gray base |
| `--brand-primary` | Brand/primary color |
| `--component-bg` | Component background |
| `--component-text-color` | Component text |
| `--default-button-color` | Default button |
| `--default-button-primary-color` | Primary button |
| `--default-button-success-color` | Success button |
| `--default-button-warning-color` | Warning button |
| `--default-button-danger-color` | Danger button |
| `--state-info-color` | Info state |
| `--state-success-color` | Success state |
| `--state-warning-color` | Warning state |
| `--state-danger-color` | Danger state |
| `--main-navigation-color` | Navbar background |
| `--main-navigation-color--inverted` | Navbar foreground |
| `--focus-color` | Focus ring |

The [Sanity Themer app](https://www.sanity.io/docs/studio/theming) provides a visual tool for building Studio themes. It generates the configuration for you.

---

## Theming in the App SDK

When using Sanity UI with the App SDK, set up `ThemeProvider` in your `App.tsx`:

```tsx
import {SanityApp} from '@sanity/sdk-react'
import {ThemeProvider} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'

const theme = buildTheme()

function App() {
  return (
    <ThemeProvider theme={theme}>
      <SanityApp config={config} fallback={<div>Loading...</div>}>
        {/* Your components here */}
      </SanityApp>
    </ThemeProvider>
  )
}
```

You can initialize a new app with Sanity UI built in:

```sh
npx sanity@latest init --template app-sanity-ui
```

Or add it to an existing app:

```sh
npm install @sanity/ui styled-components
```

For faster styled-components, use the Sanity fork:

```sh
# React 18
pnpm add --save-exact styled-components@npm:@sanity/styled-components
# React 19
pnpm add --save-exact styled-components@npm:@sanity/css-in-js
```

---

## Quick reference

| Task | How |
| --- | --- |
| Set up theming | Wrap in `ThemeProvider` with `buildTheme()` or `studioTheme` |
| Install peer deps | `npm install @sanity/ui @sanity/icons styled-components` |
| Apply semantic color | Set `tone` on Card, Button, Badge, or other component |
| Toggle dark mode | Pass `scheme` state to `ThemeProvider` — see "How to add a dark mode toggle" |
| Match system dark mode | Use `matchMedia('(prefers-color-scheme: dark)')` — see code above |
| Invert one section | Set `scheme="dark"` on a Card |
| De-emphasize content | Use the `muted` prop on Text or Card |
| Style a custom element | Use `--card-*` CSS custom properties (only inside a Card context) |
| Override Studio colors | Use `buildLegacyTheme()` in `sanity.config.ts` |
| Reference raw palette | Import hues from `@sanity/color` (last resort) |
| Avoid contrast failures | Do not use `tone="primary"` in default mode — 4.29:1 fails AA |
| CSS reset | Add `box-sizing: border-box` and `body { margin: 0 }` — theme does not inject global styles |

---

## Global vs Card-scoped CSS custom properties

Not all CSS custom properties work everywhere. Understanding the scope prevents silent failures where a variable resolves to `undefined` and its rule has no effect.

### Globally available (work anywhere in the DOM)

The raw palette tokens are defined on `:root` and resolve everywhere:

```css
var(--gray-50)  … var(--gray-950)
var(--blue-50)  … var(--blue-950)
var(--green-50) … var(--green-950)
var(--red-50)   … var(--red-950)
var(--yellow-50) … var(--yellow-950)
var(--purple-50) … var(--purple-950)
/* … and all other palette hues */
```

Use these freely on native elements, tables, and any element that doesn't live inside a Card:

```tsx
<td style={{ borderBottom: '1px solid var(--gray-200)' }}>
<tr style={{ background: 'var(--blue-50)' }}>
```

### Card-scoped only (undefined outside a Card ancestor)

These variables are written onto `.sui-Card` elements and cascade to descendants:

| Variable | Description |
|----------|-------------|
| `var(--card-bg)` | Card background colour |
| `var(--card-border-color)` | Card border colour |
| `var(--card-color)` | Card text colour (set in inverted mode) |

> ⛔ **Do not use `--card-*` variables outside a Card ancestor.** They silently resolve to `undefined` — no error, no visible output. Use the equivalent palette token (`var(--gray-200)` instead of `var(--card-border-color)`) for elements outside Card.

### Quick reference

| Need | Outside Card | Inside Card |
|------|-------------|-------------|
| Border colour | `var(--gray-200)` | `var(--card-border-color)` or `var(--gray-200)` |
| Background tint | `var(--blue-50)`, `var(--gray-50)`, etc. | `var(--card-bg)` or palette token |
| Text colour | `var(--gray-900)`, `var(--gray-500)`, etc. | `var(--card-color)` or palette token |

# Custom theming without inline styles

When an interface brief calls for custom brand colors, warm backgrounds, dark sidebars, or accent hues outside the default palette, the correct approach is to override the existing Sanity UI CSS custom properties — not to scatter `style={{ background: '...' }}` across components.

This guide shows every technique available, in priority order. Use the first technique that solves your problem.

---

## Why inline color styles are wrong

Inline `style={{ background: '#fdf8f4' }}` or `style={{ color: '#d97706' }}` on Sanity UI components:

- **Breaks dark mode.** Hardcoded values ignore scheme changes.
- **Ignores tone context.** Children inside a toned Card inherit `--card-*` variables. Inline colors bypass that inheritance.
- **Cannot be overridden by the theme.** A future palette change has no effect on inline values.
- **Fails the style-overrides rule.** See `style-overrides.md` — use `style` only for properties with no prop and no CSS variable equivalent.

Every color that appears on screen should flow from the theme, through CSS custom properties, to the component. The techniques below show how.

---

## How the variable system works

All Sanity UI color flows through two layers of CSS custom properties. Understanding these layers is essential before overriding anything.

### Layer 1: Global palette tokens (`:root`)

Defined in `color.css` on `:root`. Available everywhere in the DOM.

```css
:root {
  --black: #0b0b0b;
  --white: #ffffff;
  --gray-50: #f1f1f1;
  --gray-100: #e3e3e3;
  --gray-200: #c7c7c7;
  /* … --gray-300 through --gray-950 */
  --blue-50: #e5f2ff;
  --blue-100: #cbe5ff;
  /* … --blue-200 through --blue-950 */
  --green-50: #e7f6e3;
  /* … all hues: green, red, yellow, orange, purple, magenta, cyan */
}
```

Nine hues (gray, blue, green, red, yellow, orange, purple, magenta, cyan), each with 11 tint steps (50–950), plus `--black` and `--white`.

### Layer 2: Card-scoped tokens

Defined on `.sui-Card` elements. Cascade to all descendants. **Undefined outside a Card ancestor.**

```css
.sui-Card {
  --card-bg: var(--white);
  --card-border-color: var(--gray-100);
  --card-color: inherit;
}
```

Card tone and inverted variants override these by referencing the palette tokens:

```css
.sui-Card[data-tone='neutral'] {
  --card-bg: var(--gray-50);
  --card-border-color: var(--gray-200);
}
.sui-Card[data-inverted='true'][data-tone='default'] {
  --card-bg: var(--gray-900);
  --card-border-color: var(--gray-800);
  --card-color: var(--gray-50);
}
```

### Layer 3: Tone classes on Box and Flex

Applied by the `tone` prop. Reference the same palette tokens:

```css
.sui-tone-neutral  { background: var(--gray-50);   border-color: var(--gray-100); }
.sui-tone-primary  { background: var(--blue-50);    border-color: var(--blue-100); }
.sui-tone-positive { background: var(--green-50);   border-color: var(--green-100); }
.sui-tone-caution  { background: var(--yellow-50);  border-color: var(--yellow-100); }
.sui-tone-critical { background: var(--red-50);     border-color: var(--red-100); }
```

### The key insight

Everything references the palette tokens on `:root`. Override those tokens, and every component, tone class, and Card variant that references them updates with zero inline styles.

---

## Technique 1: Override palette tokens on `:root`

**Use when:** You need the entire UI to shift to a different color palette — warm grays, amber accents, deeper blacks, etc.

Create a `global.css` file and override the specific palette variables you need to change. Import it in `main.tsx` **before** the ui-poc `styles.css` so your values take precedence, or **after** it to override (both work since specificity is equal and later declarations win):

```css
/* global.css */

/* Warm the gray scale */
:root {
  --gray-50:  #f8f5f0;
  --gray-100: #ede9e1;
  --gray-200: #d8d1c6;
  --gray-300: #b5ac9e;
  --gray-500: #8a7e6f;
  --gray-700: #5a5044;
  --gray-800: #3d352b;
  --gray-900: #2c2520;
  --gray-950: #1a1714;
}

body {
  margin: 0;
  /* body background uses an existing token — not a hardcoded value */
  background: var(--gray-50);
  color: var(--gray-900);
}

*, *::before, *::after {
  box-sizing: border-box;
}
```

```tsx
// main.tsx
import './global.css'
import '../ui-poc/packages/ui/src/styles.css'
```

Now every component that uses `--gray-*` tokens — borders, muted text, card backgrounds, tones, dividers — uses the warm palette. `<Box tone="neutral">` renders with `var(--gray-50)` which is now `#f8f5f0`. No component code changes needed.

### Shifting the accent hue

The default primary/accent hue is blue. Tone classes, Card `tone="primary"`, and Badge `tone="primary"` all reference `--blue-*` tokens. To change the accent to amber, override the `--blue-*` variables:

```css
/* global.css — amber accent replaces blue */
:root {
  --blue-50:  #fffbeb;
  --blue-100: #fef3c7;
  --blue-200: #fde68a;
  --blue-300: #fcd34d;
  --blue-400: #fbbf24;
  --blue-500: #d97706;
  --blue-600: #b45309;
  --blue-700: #92400e;
  --blue-800: #78350f;
  --blue-900: #5c2d0e;
  --blue-950: #3b1c08;
}
```

After this, `<Button tone="primary">` uses the amber hue. `<Badge tone="primary">` uses the amber hue. `<Card tone="primary">` has an amber tinted background. Every reference is through `--blue-*`, so every reference updates.

> ⚠️ **Override tokens sparingly.** Changing a palette hue globally affects every component that references it. Only override tokens when you want the change to be truly global. For region-scoped changes, use Technique 2.

---

## Technique 2: Override palette tokens on a scoped container

**Use when:** One region of the interface needs different colors (a sidebar, a header, an inspector panel) but the rest should stay default.

CSS custom properties cascade. A class on a parent overrides `:root` values for that entire subtree. Define a CSS class that overrides specific tokens, then apply the class to a container:

```css
/* global.css */
.warm-sidebar {
  --gray-50:  #f0ebe3;
  --gray-100: #e3ddd4;
  --gray-200: #c8c1b6;
  --gray-900: #3d3529;
  --gray-950: #2a231c;
}
```

```tsx
<Box
  as="nav"
  aria-label="Main navigation"
  className="warm-sidebar"
  width="260px"
  padding={3}
  borderRight
>
  <Heading level={2}>Hearthstone Goods</Heading>
  <Text size={1} color="muted">Product catalogue</Text>
</Box>
```

Every Text, Heading, Badge, and Divider inside `.warm-sidebar` uses the overridden values. The border from `borderRight` uses the overridden `--gray-200`. No inline styles on any child.

---

## Technique 3: Card with `inverted` for dark regions

**Use when:** You need a dark sidebar, dark header, or dark panel inside a light interface.

`Card` with `inverted` is the mechanism for creating a dark region. It overrides `--card-bg`, `--card-border-color`, and `--card-color` to dark variants of the current tone. All children — Text, Heading, Badge, Divider, Button — automatically receive correct contrast colors.

```tsx
<ThemeProvider theme={buildTheme()} scheme="light">
  <Flex minHeight="100vh">
    {/* Dark sidebar — all children inherit dark tokens */}
    <Card inverted padding={3} style={{ width: '260px' }}>
      <Stack space={4}>
        <Heading level={2}>Navigation</Heading>
        <Text size={1} color="muted">All text auto-contrasts</Text>
        <Menu>
          <MenuItem icon={DashboardIcon} text="Dashboard" />
          <MenuItem icon={TagIcon} text="Products" />
        </Menu>
      </Stack>
    </Card>

    {/* Light content area */}
    <Flex as="main" flexDirection="column" flexGrow={1}>
      {/* ... */}
    </Flex>
  </Flex>
</ThemeProvider>
```

The one inline `style` here — `width` — is acceptable because width is a layout value with no color impact.

> **Note:** `Card` is the only component that creates a full color context inversion. `Box` and `Flex` with `tone` set a background tint but do NOT set `--card-bg`, `--card-border-color`, or `--card-color` — children inside a toned Box/Flex do not inherit contrasting text colors. Always use Card when you need the full dark/light context switch.

### Combining scoped token overrides with inverted Card

For a dark sidebar with a warm brand feel, combine Technique 2 with an inverted Card:

```css
/* global.css */
.warm-dark-sidebar {
  --gray-900: #2c2520;
  --gray-950: #1a1714;
  --gray-800: #3d352b;
  --gray-100: #ede8e0;
  --gray-200: #d4cec4;
}
```

```tsx
<Card inverted className="warm-dark-sidebar" padding={3} style={{ width: '260px' }}>
  {/* Inverted provides the dark inversion; the CSS class tunes the exact hue */}
</Card>
```

The inverted Card reads `--gray-900` for its `--card-bg`. The CSS class shifts that value to a warm dark brown. Every child inherits the adjusted palette.

---

## Technique 4: Tone on Box and Flex for semantic backgrounds

**Use when:** A section needs a tinted background that maps to a semantic meaning.

`Box` and `Flex` accept a `tone` prop. Tone classes set `background` and `border-color` by referencing palette tokens:

```tsx
{/* Light positive tint for a success region — no inline style */}
<Box tone="positive" padding={4} radius={3}>
  <Text>Inventory is healthy across all categories.</Text>
</Box>

{/* Light caution tint for a warning banner */}
<Flex tone="caution" padding={3} gap={2} alignItems="center">
  <Text as="span" size={1}><WarningOutlineIcon /></Text>
  <Text size={1}>3 products are low on stock.</Text>
</Flex>

{/* Neutral tint for a header or toolbar region */}
<Box tone="neutral" padding={3} borderBottom>
  <Heading level={1}>Products</Heading>
</Box>
```

Available tones: `default`, `neutral`, `primary`, `positive`, `caution`, `critical`.

Since tone classes reference palette tokens (`var(--gray-50)`, `var(--green-50)`, etc.), they pick up any overrides from Technique 1 or 2 automatically.

> ⚠️ **Tone on Box/Flex sets the background tint only.** It does NOT set `--card-*` foreground variables. If you need children to inherit contrasting text colors (especially on dark backgrounds), use `Card` with `tone` and/or `inverted` instead.

---

## Technique 5: Global CSS for native elements using existing palette tokens

**Use when:** You are styling `<table>`, `<tr>`, `<td>`, `<hr>`, or other native HTML elements that have no Sanity UI prop equivalents.

Reference the existing globally available palette tokens — not hardcoded hex values:

```css
/* global.css */
table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 2px solid var(--gray-200);
  color: var(--gray-700);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--gray-200);
  color: var(--gray-900);
}

tr:hover td {
  background: var(--gray-50);
}
```

These styles adapt to palette overrides from Technique 1 or 2. If you warm the grays, every table border and hover state warms with them.

> ⛔ **Do NOT use `var(--card-border-color)` or any `--card-*` variable for native elements outside a Card ancestor.** They resolve to `undefined` with no error. Use palette tokens like `var(--gray-200)` instead. See `silent-failures.md` #9.

---

## Decision table

| Need | Technique | What to override |
|------|-----------|-----------------|
| Custom page background | 1 — `body { background: var(--gray-50) }` after overriding `--gray-50` on `:root` | `--gray-50` |
| Warm/cool gray shift across entire UI | 1 — Override `--gray-*` on `:root` | `--gray-50` through `--gray-950` |
| Custom brand accent color | 1 — Override `--blue-*` on `:root` | `--blue-50` through `--blue-950` |
| Dark sidebar or header | 3 — `Card inverted` | No variable override needed |
| Dark sidebar with custom hues | 2 + 3 — CSS class overriding `--gray-*` on `Card inverted` | `--gray-*` scoped to a class |
| Tinted region (success/warning) | 4 — `tone` prop on Box/Flex/Card | No variable override needed |
| Table/native element borders | 5 — Global CSS with `var(--gray-200)` | No variable override needed |
| Table row hover | 5 — Global CSS with `var(--gray-50)` | No variable override needed |

---

## Complete example: artisan brand theme

This example implements "warm off-white background, slate sidebar, and amber accent" — all without a single inline color style on any Sanity UI component.

### global.css

```css
/* Override existing palette tokens on :root */
:root {
  /* Warm grays */
  --gray-50:  #f8f5f0;
  --gray-100: #ede9e1;
  --gray-200: #d8d1c6;
  --gray-300: #b5ac9e;
  --gray-500: #8a7e6f;
  --gray-700: #5a5044;
  --gray-800: #3d352b;
  --gray-900: #2c2520;
  --gray-950: #1a1714;

  /* Amber replaces blue for all primary/accent uses */
  --blue-50:  #fffbeb;
  --blue-100: #fef3c7;
  --blue-200: #fde68a;
  --blue-300: #fcd34d;
  --blue-400: #fbbf24;
  --blue-500: #d97706;
  --blue-600: #b45309;
  --blue-700: #92400e;
  --blue-800: #78350f;
  --blue-900: #5c2d0e;
  --blue-950: #3b1c08;
}

body {
  margin: 0;
  background: var(--gray-50);
  color: var(--gray-900);
}

*, *::before, *::after {
  box-sizing: border-box;
}

/* Table styles using existing palette tokens */
table { width: 100%; border-collapse: collapse; }
th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 2px solid var(--gray-200);
  color: var(--gray-700);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--gray-200);
}
tr:hover td {
  background: var(--gray-100);
  cursor: pointer;
}
```

### App.tsx (no inline color styles)

```tsx
import { buildTheme } from '@sanity/ui/theme'
import {
  ThemeProvider, ToastProvider, Stack, Button, Badge,
  Menu, MenuItem, Label, TextInput,
} from '@sanity/ui'
import { Box, Flex, Card, Heading, Text } from 'ui'
import { DashboardIcon, TagIcon, SearchIcon, AddIcon } from '@sanity/icons'

const theme = buildTheme()

function App() {
  return (
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <Flex minHeight="100vh">
          {/* Dark sidebar — Card inverted handles all color inversion.
              --gray-900 is now warm brown, so the sidebar is warm-dark. */}
          <Card inverted padding={0} style={{ width: '260px' }}>
            <Box padding={3} borderBottom>
              <Heading level={1} size={1}>Hearthstone Goods</Heading>
            </Box>
            <Box padding={3}>
              <Menu>
                <MenuItem icon={DashboardIcon} text="Dashboard" />
                <MenuItem icon={TagIcon} text="Products" selected />
              </Menu>
            </Box>
          </Card>

          {/* Main content — inherits warm palette from :root overrides */}
          <Flex as="main" flexDirection="column" flexGrow={1} minWidth="0">
            {/* Toolbar */}
            <Box padding={3} borderBottom>
              <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                <Heading level={1} size={1}>Products</Heading>
                <Flex alignItems="center" gap={2}>
                  <TextInput icon={SearchIcon} placeholder="Search products..." aria-label="Search products" />
                  <Button icon={AddIcon} text="Add product" />
                </Flex>
              </Flex>
            </Box>

            {/* Content area */}
            <Box padding={4} flexGrow={1} overflowY="auto">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><Text size={1} weight="medium">Hand-thrown mug</Text></td>
                    <td><Text size={1} color="muted">Ceramics</Text></td>
                    <td><Text size={1}>$34.00</Text></td>
                    <td><Badge tone="positive">In Stock</Badge></td>
                  </tr>
                  <tr>
                    <td><Text size={1} weight="medium">Woven throw blanket</Text></td>
                    <td><Text size={1} color="muted">Textiles</Text></td>
                    <td><Text size={1}>$89.00</Text></td>
                    <td><Badge tone="caution">Low Stock</Badge></td>
                  </tr>
                </tbody>
              </table>
            </Box>
          </Flex>
        </Flex>
      </ToastProvider>
    </ThemeProvider>
  )
}
```

The only `style` prop in this example is `width: '260px'` on the sidebar Card — a layout value, acceptable per `style-overrides.md`. Every color flows from overridden CSS custom properties.

---

## Full design token reference

Every CSS custom property defined by Sanity UI, with its default value. All are on `:root` unless noted otherwise. Override any of them in `global.css` to change the entire system.

### Color — Gray

Role: borders, muted text, neutral backgrounds, UI chrome. Used by `tone="neutral"`, `color="muted"`, Card default borders, and inverted Card backgrounds.

| Variable | Default | Used for |
|----------|---------|----------|
| `--gray-50` | `#f1f1f1` | Neutral tone background, hover backgrounds |
| `--gray-100` | `#e3e3e3` | Default Card border, skeleton states |
| `--gray-200` | `#c7c7c7` | Neutral Card border, table borders, Divider |
| `--gray-300` | `#acacac` | Muted text lighter tint (`color="muted" muted`) |
| `--gray-400` | `#929292` | — |
| `--gray-500` | `#757575` | Muted text color (`color="muted"`), muted icons |
| `--gray-600` | `#606060` | — |
| `--gray-700` | `#494949` | — |
| `--gray-800` | `#333333` | Inverted Card border |
| `--gray-900` | `#1e1e1e` | Inverted Card background, default foreground text |
| `--gray-950` | `#141414` | — |

### Color — Blue

Role: primary/accent tone, focus rings, links. Used by `tone="primary"`, Text `color="primary"`, and focus states.

| Variable | Default | Used for |
|----------|---------|----------|
| `--blue-50` | `#e5f2ff` | Primary tone background (Card and Box) |
| `--blue-100` | `#cbe5ff` | Default tone border, primary tone border (Box) |
| `--blue-200` | `#9cc9ff` | Primary Card border |
| `--blue-300` | `#6cadff` | — |
| `--blue-400` | `#338eff` | Primary text muted tint |
| `--blue-500` | `#006bff` | — |
| `--blue-600` | `#0050e3` | Primary text color (`color="primary"`) |
| `--blue-700` | `#0040a7` | — |
| `--blue-800` | `#002f6e` | Inverted primary Card border |
| `--blue-900` | `#0a1e3a` | Inverted primary Card background |
| `--blue-950` | `#0c1522` | — |

### Color — Green

Role: positive tone — success, healthy states. Used by `tone="positive"` and Text `color="positive"`.

| Variable | Default | Used for |
|----------|---------|----------|
| `--green-50` | `#e7f6e3` | Positive tone background |
| `--green-100` | `#d0edc6` | Positive tone border (Box) |
| `--green-200` | `#a0da8d` | Positive Card border |
| `--green-300` | `#6ec64c` | — |
| `--green-400` | `#34b000` | Positive text muted tint |
| `--green-500` | `#269200` | — |
| `--green-600` | `#197500` | Positive text color (`color="positive"`) |
| `--green-700` | `#0c5a00` | — |
| `--green-800` | `#073f00` | Inverted positive Card border |
| `--green-900` | `#0e2406` | Inverted positive Card background |
| `--green-950` | `#0d180a` | — |

### Color — Red

Role: critical tone — errors, destructive actions. Used by `tone="critical"` and Text `color="critical"`.

| Variable | Default | Used for |
|----------|---------|----------|
| `--red-50` | `#ffebe9` | Critical tone background |
| `--red-100` | `#ffd7d3` | Critical tone border (Box) |
| `--red-200` | `#ffafa8` | Critical Card border |
| `--red-300` | `#fa857d` | — |
| `--red-400` | `#f15552` | Critical text muted tint |
| `--red-500` | `#e50021` | — |
| `--red-600` | `#b40f1f` | Critical text color (`color="critical"`) |
| `--red-700` | `#86191c` | — |
| `--red-800` | `#5a1918` | Inverted critical Card border |
| `--red-900` | `#311412` | Inverted critical Card background |
| `--red-950` | `#1e100f` | — |

### Color — Yellow

Role: caution tone — warnings. Used by `tone="caution"` and Text `color="caution"`.

| Variable | Default | Used for |
|----------|---------|----------|
| `--yellow-50` | `#f8f2d4` | Caution tone background |
| `--yellow-100` | `#f1e4a7` | Caution tone border (Box) |
| `--yellow-200` | `#e3c72f` | Caution Card border |
| `--yellow-300` | `#caab00` | — |
| `--yellow-400` | `#ac9100` | Caution text muted tint |
| `--yellow-500` | `#8f7800` | — |
| `--yellow-600` | `#736000` | Caution text color (`color="caution"`) |
| `--yellow-700` | `#584800` | — |
| `--yellow-800` | `#3f3200` | Inverted caution Card border |
| `--yellow-900` | `#271d00` | Inverted caution Card background |
| `--yellow-950` | `#191400` | — |

### Color — Purple

Role: suggest tone. Used by `tone="suggest"`.

| Variable | Default | Used for |
|----------|---------|----------|
| `--purple-50` | `#efeeff` | Suggest tone background |
| `--purple-100` | `#e0ddff` | Suggest tone border (Box) |
| `--purple-200` | `#c3bcff` | Suggest Card border |
| `--purple-300` | `#a999ff` | — |
| `--purple-400` | `#9172ff` | — |
| `--purple-500` | `#7c40ff` | — |
| `--purple-600` | `#642edc` | — |
| `--purple-700` | `#4a2aa2` | — |
| `--purple-800` | `#33226b` | Inverted suggest Card border |
| `--purple-900` | `#1d1838` | Inverted suggest Card background |
| `--purple-950` | `#141221` | — |

### Color — Orange

Role: syntax highlighting, avatar colors.

| Variable | Default | Used for |
|----------|---------|----------|
| `--orange-50` | `#ffecda` | — |
| `--orange-100` | `#ffd9b5` | — |
| `--orange-200` | `#ffb063` | — |
| `--orange-300` | `#ff8700` | — |
| `--orange-400` | `#dd7100` | — |
| `--orange-500` | `#b95c00` | — |
| `--orange-600` | `#964800` | — |
| `--orange-700` | `#743500` | — |
| `--orange-800` | `#542300` | — |
| `--orange-900` | `#351300` | — |
| `--orange-950` | `#201004` | — |

### Color — Magenta

Role: avatar colors, syntax highlighting.

| Variable | Default | Used for |
|----------|---------|----------|
| `--magenta-50` | `#fdeafb` | — |
| `--magenta-100` | `#fad5f8` | — |
| `--magenta-200` | `#f2abef` | — |
| `--magenta-300` | `#e77ee5` | — |
| `--magenta-400` | `#db49da` | — |
| `--magenta-500` | `#c800cb` | — |
| `--magenta-600` | `#a100a2` | — |
| `--magenta-700` | `#780978` | — |
| `--magenta-800` | `#511351` | — |
| `--magenta-900` | `#2d122c` | — |
| `--magenta-950` | `#1c0f1b` | — |

### Color — Cyan

Role: avatar colors, syntax highlighting.

| Variable | Default | Used for |
|----------|---------|----------|
| `--cyan-50` | `#dcf8f3` | — |
| `--cyan-100` | `#b7f1e7` | — |
| `--cyan-200` | `#59e1d0` | — |
| `--cyan-300` | `#00cab7` | — |
| `--cyan-400` | `#00ac9c` | — |
| `--cyan-500` | `#008f81` | — |
| `--cyan-600` | `#007367` | — |
| `--cyan-700` | `#00584f` | — |
| `--cyan-800` | `#003f37` | — |
| `--cyan-900` | `#002721` | — |
| `--cyan-950` | `#031916` | — |

### Color — Black and White

| Variable | Default | Used for |
|----------|---------|----------|
| `--black` | `#0b0b0b` | Darkest value in the palette (not pure `#000`) |
| `--white` | `#ffffff` | Default Card background, default tone background |

### Spacing

Used by `padding`, `margin`, `gap`, `space`, and `inset` props (scale 0–9).

| Variable | Default | Prop value | Common use |
|----------|---------|------------|------------|
| `--space-0` | `0px` | `0` | No space |
| `--space-1` | `4px` | `1` | Label + input pairing |
| `--space-2` | `8px` | `2` | Tight grouping, icon + text |
| `--space-3` | `12px` | `3` | Standard form field spacing, Card `density="medium"` padding |
| `--space-4` | `20px` | `4` | Card `density="loose"` padding, content area padding |
| `--space-5` | `32px` | `5` | Section-level breaks |
| `--space-6` | `52px` | `6` | Major content blocks |
| `--space-7` | `84px` | `7` | Page-level sections |
| `--space-8` | `136px` | `8` | Reserved |
| `--space-9` | `220px` | `9` | Reserved |

### Border radius

Used by the `radius` prop on Box, Flex, and Card `density`.

| Variable | Default | Prop value | Used by Card density |
|----------|---------|------------|----------------------|
| `--radius-0` | `0px` | `0` | — |
| `--radius-1` | `1px` | `1` | — |
| `--radius-2` | `3px` | `2` | `density="tight"` |
| `--radius-3` | `7px` | `3` | `density="medium"` |
| `--radius-4` | `11px` | `4` | `density="loose"` |
| `--radius-5` | `15px` | `5` | — |
| `--radius-6` | `19px` | `6` | — |
| `--radius-round` | `9999px` | `"full"` | Pill shapes |

### Shadows

Used by the `shadow` prop on Card and Box.

| Variable | Default | Description |
|----------|---------|-------------|
| `--shadow0` | `0px 0px 0px 0px …` | No shadow |
| `--shadow1` | `0px 0px 0px 0.5px … (outline only)` | Subtle outline — hairline border effect |
| `--shadow2` | `… 2px 3px -1px … 4px 6px …` | Low elevation — raised card, dropdown hint |
| `--shadow3` | `… 7px 8px -4px … 12px 17px …` | Medium elevation — popover, floating panel |
| `--shadow4` | `… 9px 11px -5px … 18px 28px …` | High elevation — modal, dialog |
| `--shadow5` | `… 11px 15px -7px … 24px 38px …` | Highest elevation — dragging surface |

### Typography — Font families

| Variable | Default |
|----------|---------|
| `--sans` | `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Liberation Sans', sans-serif` |
| `--mono` | `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace` |

### Typography — Font weights

| Variable | Default | Text `weight` prop |
|----------|---------|-------------------|
| `--regular` | `400` | `"regular"` |
| `--medium` | `600` | `"medium"` |
| `--semibold` | `600` | `"semibold"` |
| `--bold` | `700` | `"bold"` |

### Typography — Body (Text component)

Shorthand `font` tokens: weight, size/line-height, family. Used by Text `size` prop.

| Variable | Weight | Size | Line height | Text `size` prop |
|----------|--------|------|-------------|------------------|
| `--body-0` | 400 | 10px | 1.5 | `0` |
| `--body-1` | 400 | 13px | 1.5 | `1` |
| `--body-2` | 400 | 16px | 1.5 | `2` (default) |
| `--body-3` | 400 | 18.75px | 1.5 | `3` |
| `--body-4` | 400 | 21.5px | 1.5 | `4` |

### Typography — Heading

Shorthand `font` tokens. Used by Heading `size` prop.

| Variable | Weight | Size | Line height | Heading `size` prop |
|----------|--------|------|-------------|---------------------|
| `--heading-0` | 600 | 13px | 1.25 | `0` |
| `--heading-1` | 600 | 16px | 1.25 | `1` |
| `--heading-2` | 600 | 21px | 1.25 | `2` |
| `--heading-3` | 400 | 27px | 1.25 | `3` |
| `--heading-4` | 400 | 33px | 1.25 | `4` |
| `--heading-5` | 400 | 38px | 1.25 | `5` |
| `--heading-6` | 400 | 48px | 1.25 | — (not exposed as prop) |
| `--heading-7` | 400 | 63px | 1.25 | — |
| `--heading-8` | 400 | 84px | 1.25 | — |
| `--heading-9` | 400 | 112px | 1.25 | — |

### Typography — Label

Shorthand `font` tokens. Used by Label `size` prop.

| Variable | Weight | Size | Line height | Label `size` prop |
|----------|--------|------|-------------|-------------------|
| `--label-0` | 400 | 8.1px | 1.25 | `0` |
| `--label-1` | 400 | 9.5px | 1.25 | `1` |
| `--label-2` | 400 | 10.8px | 1.25 | `2` (default) |
| `--label-3` | 400 | 12.25px | 1.25 | `3` |
| `--label-4` | 400 | 13.6px | 1.25 | `4` |
| `--label-5` | 400 | 15px | 1.25 | `5` |

### Typography — Code

Shorthand `font` tokens. Used by Code `size` prop.

| Variable | Weight | Size | Line height |
|----------|--------|------|-------------|
| `--code-0` | 400 | 10px | 1.5 |
| `--code-1` | 400 | 13px | 1.5 |
| `--code-2` | 400 | 16px | 1.5 |
| `--code-3` | 400 | 18.75px | 1.5 |
| `--code-4` | 400 | 21.5px | 1.5 |

### Container widths

Used by the Container component's `width` prop.

| Variable | Default | Container `width` prop |
|----------|---------|------------------------|
| `--container-0` | `320px` | `0` |
| `--container-1` | `640px` | `1` |
| `--container-2` | `960px` | `2` |
| `--container-3` | `1280px` | `3` |
| `--container-4` | `1600px` | `4` |
| `--container-5` | `1920px` | `5` |

### Card-scoped tokens (set on `.sui-Card`, cascade to descendants)

These are NOT on `:root`. They exist only inside a Card ancestor. Override them on a Card CSS class if needed.

| Variable | Default (light) | Set by |
|----------|-----------------|--------|
| `--card-bg` | `var(--white)` | Card `tone` and `inverted` |
| `--card-border-color` | `var(--gray-100)` | Card `tone` and `inverted` |
| `--card-color` | `inherit` | Card `inverted` (set to e.g. `var(--gray-50)` when inverted) |
| `--card-padding` | `var(--space-3)` | Card `density` |
| `--card-radius` | `var(--radius-3)` | Card `density` |

Card tone and inverted variants override these by referencing palette tokens:

| Card state | `--card-bg` | `--card-border-color` | `--card-color` |
|------------|-------------|----------------------|----------------|
| `tone="default"` | `var(--white)` | `var(--gray-100)` | `inherit` |
| `tone="neutral"` | `var(--gray-50)` | `var(--gray-200)` | `inherit` |
| `tone="primary"` | `var(--blue-50)` | `var(--blue-200)` | `inherit` |
| `tone="suggest"` | `var(--purple-50)` | `var(--purple-200)` | `inherit` |
| `tone="positive"` | `var(--green-50)` | `var(--green-200)` | `inherit` |
| `tone="caution"` | `var(--yellow-50)` | `var(--yellow-200)` | `inherit` |
| `tone="critical"` | `var(--red-50)` | `var(--red-200)` | `inherit` |
| `inverted` + `tone="default"` | `var(--gray-900)` | `var(--gray-800)` | `var(--gray-50)` |
| `inverted` + `tone="neutral"` | `var(--gray-800)` | `var(--gray-700)` | `var(--gray-50)` |
| `inverted` + `tone="primary"` | `var(--blue-900)` | `var(--blue-800)` | `var(--blue-100)` |
| `inverted` + `tone="suggest"` | `var(--purple-900)` | `var(--purple-800)` | `var(--purple-100)` |
| `inverted` + `tone="positive"` | `var(--green-900)` | `var(--green-800)` | `var(--green-100)` |
| `inverted` + `tone="caution"` | `var(--yellow-900)` | `var(--yellow-800)` | `var(--yellow-100)` |
| `inverted` + `tone="critical"` | `var(--red-900)` | `var(--red-800)` | `var(--red-100)` |

Card density variants:

| `density` | `--card-padding` | `--card-radius` |
|-----------|------------------|-----------------|
| `"tight"` | `var(--space-2)` = 8px | `var(--radius-2)` = 3px |
| `"medium"` (default) | `var(--space-3)` = 12px | `var(--radius-3)` = 7px |
| `"loose"` | `var(--space-4)` = 20px | `var(--radius-4)` = 11px |

### Tone classes on Box and Flex

Applied by the `tone` prop. These reference palette tokens — overriding the palette token on `:root` changes the tone.

| Tone | Background | Border color |
|------|------------|-------------|
| `default` | `var(--white)` | `var(--blue-100)` |
| `neutral` | `var(--gray-50)` | `var(--gray-100)` |
| `primary` | `var(--blue-50)` | `var(--blue-100)` |
| `suggest` | `var(--purple-50)` | `var(--purple-100)` |
| `positive` | `var(--green-50)` | `var(--green-100)` |
| `caution` | `var(--yellow-50)` | `var(--yellow-100)` |
| `critical` | `var(--red-50)` | `var(--red-100)` |

### Text color classes

Applied by the Text `color` prop. Normal and muted tint are both shown. The `muted` boolean activates the lighter tint.

| Text `color` | Normal color | Muted tint (with `muted` boolean) |
|-------------|-------------|-----------------------------------|
| `"default"` | `var(--gray-900)` | `var(--gray-500)` |
| `"muted"` | `var(--gray-500)` | `var(--gray-300)` |
| `"primary"` | `var(--blue-600)` | `var(--blue-400)` |
| `"positive"` | `var(--green-600)` | `var(--green-400)` |
| `"caution"` | `var(--yellow-600)` | `var(--yellow-400)` |
| `"critical"` | `var(--red-600)` | `var(--red-400)` |

> ⛔ Card-scoped variables (`--card-bg`, `--card-border-color`, `--card-color`) are undefined outside a Card ancestor. Use palette tokens (`var(--gray-200)`, etc.) for elements outside Card. See `silent-failures.md` #9.

---

## Rules for agents

1. **Never set `background`, `color`, `borderColor`, or `backgroundColor` as inline styles on Sanity UI components.** Override the palette tokens in `global.css` instead.
2. **For dark regions, use `Card inverted`.** Do not use `style={{ background: '#334155' }}` on Box or Flex.
3. **For brand palette shifts, override existing `--gray-*` and/or `--blue-*` tokens on `:root` in CSS.** This changes every component globally with zero inline styles.
4. **For scoped color regions, override palette tokens on a CSS class** and apply that class to the container element.
5. **For table and native element styling, write CSS rules that reference existing palette tokens** like `var(--gray-200)` and `var(--space-3)`. Do not inline `style={{ borderBottom: '1px solid #e5e5e5' }}` on every `<td>`.
6. **`tone` on Box/Flex is for semantic background tints only.** If children need contrasting text, use Card instead — Card sets `--card-bg`, `--card-border-color`, and `--card-color`.
7. **The only acceptable inline style colors are on elements completely outside the design system** — such as a third-party chart library or an SVG illustration.

---

## Cross-references

- `theming-guidelines.md` — Full theme architecture, `buildTheme`, schemes, tones, dark mode
- `foundations-color.md` — Color principles and the hierarchy of color decisions
- `style-overrides.md` — When inline styles are and aren't acceptable
- `silent-failures.md` #9 — `--card-border-color` outside Card
- `card.md` — Card as a color context provider, tone, inverted

# Layout guidelines

## General structure

Layouts consist of three main sections:

1. Navigation sidebar (optional): An inline-start aligned column used to navigate through the application and perform critical application-level actions. Present only when the application has multiple pages or views.
1. Content: The main window used to present the application's content and data. This is the only required section and is present in every layout type. It is subdivided into Content toolbar (a block-start bar for title and actions) and Content display (the primary content area).
1. Inspection sidebar (optional): An inline-end aligned column used to view and edit metadata for content presented in the Content window.

Layouts follow these rules:

> **Color scheme.** All structural layout regions — Navigation sidebar, Content area, Content toolbar, and Inspection sidebar — use the default light color scheme. Sanity UI does not support dark or inverted structural regions. Do not use `Card inverted`, dark background inline styles (`style={{ background: '#1a1d23' }}`), or `scheme="dark"` wrappers on any structural layout element. If your design calls for a dark sidebar or dark header, this falls outside the supported Sanity UI interface pattern and will require a fully custom implementation outside the component system.


- Layouts take up the full width and height of the viewport. Each section (Navigation, Content, and Inspection) manages its own scroll independently.
- The three sections sit side by side along the inline axis. Navigation is always inline-start, Content is always in the center, and Inspection is always inline-end. This order never changes.
- Each sidebar uses the `<Column />` component, takes up 20% of the screen width on desktop and tablet (minimum 240px, maximum 320px), fills the full height of its parent, and is separated from the Content section by a 1px border on its inner edge.
- The Content section fills all remaining horizontal space not occupied by sidebars.
- Content controls aims for a height of 50px but grows when necessary. It has a block-end border separating it from Content display.
- Layouts accept elements from any UI library as children. Any UI library or simple HTML can be added to Sanity layouts.
- Layouts adapt to three device classes:
  1. **Desktop**: All sidebars are visible when present in the layout type.
  1. **Tablet**: The Navigation sidebar transforms into a fixed top bar spanning the full width. The inspection sidebar remains as a sidebar. Navigation between views is accessed through a `<MenuButton />` in the Content controls bar.
  1. **Mobile**: Only the Content section is displayed by default. Application controls are accessed through a popover menu triggered by a `<MenuButton />`. Content inspector is displayed as a sheet when an item is selected.

## Layout compositions

A layout can be as simple as a single page or a full-blown multi-view interface. Sanity’s layout components allow you to compose the level of complexity that’s needed. Below are common compositions:

### Shell

This layout consists of a single view application with no toolbar for title/actions. It’s ideal for single-use applications such as an asset uploader.

[https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/c1264755dfc794920bb98f0f5ee8b68227b51691-2460x1664.png](https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/c1264755dfc794920bb98f0f5ee8b68227b51691-2460x1664.png)

`<AppShell>`

`<AppShell.Main>`

`{content}`

`</AppShell.Main>`

`</AppShell>`

#### When to use

- The application consists of one view/page and all content, logic, and actions are contained within the main content window. Example: A single form with a submit action.

#### When NOT to use

- When critical actions need to be persistent, regardless of scroll position. Use Shell with Toolbar instead.
- When an application has multiple pages/views to navigate across. Use Shell with Navigation instead.
- When one or more items in the application need a dedicated area to view/edit metadata.  Use Shell with Inspector instead.

### Shell with Toolbar

This layout supports a single view application with persistent actions. It’s ideal for simple management of content.

[https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/7a1ac4bcc6e9058cb9fa1061c573de9c1129d2e6-2460x1664.png](https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/7a1ac4bcc6e9058cb9fa1061c573de9c1129d2e6-2460x1664.png)





#### When to use

- The application consists of one view/page with important actions and filtering needing easy access. Example: A read-only content navigator.

#### When NOT to use

- When an application has multiple pages/views to navigate across. Use Shell with Navigation instead.
- When one or more items in the application needs a dedicated area to view/edit metadata. Use Shell with Inspector instead.

### Shell with Inspector

This layout supports a single view application with persistent actions and viewing/editing of content metadata. It’s ideal for simple management of content and its metadata.

[https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/657db2d89170b0d29b1b29d7a53c632b664af245-2460x1684.png](https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/657db2d89170b0d29b1b29d7a53c632b664af245-2460x1684.png)





#### When to use

- When one or more items in the application needs a dedicated area to view/edit metadata.

#### When NOT to use

- When an application has multiple pages/views to navigate across. Use Shell with Navigation and Inspector instead.
- When all editing of content metadata can be handled in the main content window. Use Shell or Shell with Toolbar instead.

### Shell with Navigation

This layout supports a multi-vew application with persistent navigation and actions. It’s ideal for more organized and fine-grained management of content.

[https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/52929b4932b2ce4220010c04a152f45ec8968d98-2460x1684.png](https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/52929b4932b2ce4220010c04a152f45ec8968d98-2460x1684.png)





#### When to use

- When an application has more than one page/view to navigate across.

#### When NOT to use

- When an application has only one view and requires no navigation. Use Shell, Shell with Toolbar, or Shell with Inspector instead.
- When at least one page/view in the application needs a dedicated area to view/edit metadata. Use Shell with Navigation and Inspector instead.

### Shell with Navigation and Inspector

This layout supports a multi-vew application with persistent navigation, actions and viewing/editing of content metadata. It’s ideal for more organized and fine-grained management of content and its metadata. **Note:** It’s recommended to hide the Inspector sidebar on pages/views where it’s not used.

[https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/d7ac09129bd1fd904410122297e346ef8d947a57-2460x1684.png](https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/d7ac09129bd1fd904410122297e346ef8d947a57-2460x1684.png)





#### When to use

- When an application has more than one page/view to navigate across and at least one page/view in the application needs a dedicated area to view/edit metadata.

#### When NOT to use

- When an application has only one view and requires no navigation. Use Shell with Inspector instead.
- When all editing of content metadata can be handled in the main content window. Use Shell with Navigation instead.

## Layout components

### Navigation sidebar

The Navigation sidebar’s purpose is to orient the user, navigate through key views and perform critical application-level actions. It should only be used when the application has multiple pages/views that require navigation.

- Navigation sidebar utilizes the `<Column />` component and it always inline-start aligned within the layout
- It should take up 20% of the screen width in desktop/tablet devices–with a minimum width of 240px and a maximum width of 320px
- It should fill the full height of its parent
- It should have an inline-end border to act as a visual break between it and the main content window

It is comprised of three sub-components:

1. Navigation Header: Provides context for the application being displayed and displays critical global actions. The slot should be fixed at the top position and remain in place when scrolling through menu items.
1. Navigation Content: Enables users to move through different views of the application and/or filter across all application content.
1. Navigation Footer: Provides information related to an application’s status as well as ancillary actions.

Controls should be global in nature. Example: A search affordance at the application controls level would search content across all views in the application.

Third-party applications should bias towards actions with labels instead of icons when space permits.

The application’s title should be fully displayed whenever possible. Truncation should be a last resort.

No more than two actions should be displayed in the Control slot at one time. When more than two actions exist, the primary action (`mode="default"`) should be displayed with all other actions added to an overflow menu triggered by a `<MenuButton />`.

#### Navigation Header

The Navigation header is comprised of two sub-components

1. Navigation Header Title: An inline-start aligned slot that contains the title of the application.
1. Navigation Header Actions: An inline-end aligned slot containing horizontally-stacked buttons that allow the user to perform application-level actions.

##### Best practices

- The Navigation Header Title should be fully displayed whenever possible. Truncation should be a last resort.
- Navigation Header Actions should be focused on actions that impactapplication-. Examples include:
  - Managing application settings, configurations, or permissions
  - Adding, editing, or removing navigation items
  - Sorting/filtering of navigation items
- No more than two actions should be displayed in the Navigation Header Actions at one time. When more than two actions exist, the primary action (`mode="default"`) should be displayed with all other actions added to an overflow menu triggered by a `<MenuButton />`. Do not use a plain `<Button />` to activate the overflow menu.

#### Navigation Content

Navigation content displays all navigation options or filters for content. Navigation/filters should ONLY use Sanity UI's `<MenuItem />`' component. The content section should be able to scroll independently to accommodate for overflow.

#### Navigation Footer

The Navigation footer is for ancillary actions, such as:

- Help/support/feedback
- Light/dark mode toggle
- Settings

### Content

The main Content window is comprised of two sub-components

1. Content Toolbar: A block-start bar that orients the user to provide actions for editing/managing the presented content.
2. Content Display: The main content area to present information.

#### Content Toolbar

- The toolbar should have a block-end border to act as a visual break between it and Content display.
- The controls should aim for a height of 50px, but grow in height when necessary.

The Content Controls block-start bar is comprised of two sub-components

1. Content Toolbar Title: Content title is an inline-start aligned slot that contains the title of what's being presented. When the Navigation sidebar does not exist, the title should display the name of the application. Otherwise, the title should display the name of the current page or view being presented to the user.
2. Content Toolbar Actions: An inline-end aligned slot containing horizontally-stacked buttons that allow the user to perform actions on the content.

##### Content Toolbar Title

The Content Toolbar Title anchors the collection of content being viewed. The title should be given priority in spacing to avoid truncation at all costs. Actions related to organizing and finding, such as favoriting, can be paired with the title. Actions should be inline-end-aligned with the title

##### Content Toolbar Actions

Content Toolbar Actions contains all actions related to editing/managing/manipulating the content presented to the user. Content controls actions acts as the de-facto location for presenting all application-level actions in cases where a layout doesn't use an Navigation sidebar.

###### Best practices

- Aim for as few actions as possible to avoid congestion.
- All actions should use Sanity UI's `<Button />` component. Button labels should be verb-led, use sentence case, and aim for two words or less (examples: "New document", "Export", "Delete").
- Do not use `<Button />` to activate a menu. Use Sanity UI's `<MenuButton />` instead. `<MenuButton />` handles placement and display details that ensure consistency.
- All buttons should be accompanied with a tooltip that describes what action the button does in greater detail (example: "Sort items by most recent", "Close comments pane", etc.). The contents of a tooltip should be detectable and useful for screen readers.
- The primary action should be first in the stack of buttons and use `mode="default"`. Secondary actions should use `mode="ghost"`. There should be only one `mode="default"` button per action area.
- Content actions should present no more than three buttons. When more actions exist, they should be contained in a menu triggered by a `<MenuButton />` with an ellipsis icon.
- Actions within a menu should not have an accompanied tooltip.
- Destructive actions should use `tone="critical"` and include an icon (`<ErrorOutlineIcon />`) to reinforce the action's nature for people with color vision issues. Do not rely on color alone to convey destructive intent.

#### Content display

The Content display section is the main section of the application. It's where pertinent content is presented and how users interact with it. There are two variants of Content display based on the type of content being presented. The section should be able to scroll independently to accommodate for overflow.

1. **Document width:** Document width is used for content such as forms or content with long-form text. The width should optimize for ~50-70 characters per line.
2. **Full width: **Full width is used to display grids of content, tabular data or any other content that requires as much horizontal space as possible.

###### Best practices

- In cases where minimal information or content is being presented and no scrolling is necessary, the content should be placed in the horizontal and vertical center of the Content display viewport.
- Content display should always present something to the user. In cases where no content exists, an empty state should be displayed. This empty state should explain why no content is being displayed and provide an action to add content if such an option exists.

#### Inspection sidebar

The Inspection sidebar is for viewing/editing metadata for collections of content (examples: images within a media library or people in a profile collection).

- The inspection sidebar utilizes the `<Column />` component and is always inline-start aligned within the layout.
- The sidebar should take up 20% of the screen width in desktop/tablet devices–with a minimum width of 240px and a maximum width of 320px;
- The sidebar should have an inline-start border to act as a visual break between it and the main content window.

##### Display logic

The inspection column should display context-specific information based on a selection of content within the content display section.

- If no items are selected, the inspection column should either display metadata about the parent of the items or an empty state.
- If one item is selected, the inspection column should display actions and metadata for that specific item.
- If two or more items are selected, the inspection column should display actions and metadata for all selected items. Fields where all items have the same value should display the value. Otherwise, fields should be marked as “Mixed”. Uncommon fields should be hidden from view.

##### Content inspector best practices

- The inspection sidebar should only be used when the user must view/edit multiple pieces of content at once.
- Toggling visibility of the inspector sidebar should only be used in cases where horizontal space is absolutely critical. Hiding the inspection column by default risks hiding critical information/functionality from new users.
- Key actions on an item should be available in the main content pane in cases where the inspection column can be hidden.
- Avoid adding complex layouts within the content inspection column whenever possible. Fields ideally should span the entire column. Use no more than two columns.

##### Inspection sidebar sub-components:

1. Content inspector header
2. Content inspector properties
3. Content inspector footer (optional)

###### Content inspector header

The content inspector header orients the user on what content is selected and allows them to perform bulk actions on that content.

This section follows the same patterns as the application control header. Inspection controls should be fixed and remain in place when scrolling through properties. The title should be aligned to the start of the inline axis with actions at the end of the axis. Controls with three or more actions should only display one action with a `<MenuButton />` overflow menu for all remaining actions.

###### Content inspector properties

The content inspector properties provide the ability to view/edit an item’s (or multiple items’) metadata. The properties section should be able to scroll independently to accommodate for overflow.

###### Content inspector properties best practices

- Properties should flow vertically and be ordered by importance.
- Consider grouping when logical categorization exists.
- Consider adding group labels if 3 or more groups exist or groupings are not immediately intuitive.
- Groups can be collapsible in cases of extreme scrolling. It’s advised to only make non-essential groups collapsible to avoid “fiddliness”.

##### Content inspector footer

The content inspector footer provides information related to an item’s (or multiple items’) status/availability. Examples include:

- Time since last updated
- Time since published

## Navigation

All application navigation lives in the Navigation sidebar. There are no secondary navigation bars, no in-content navigation panels, and no additional sidebars dedicated to navigation. The Navigation sidebar is the single, persistent location where users move between views. This constraint exists for three reasons:

1. **Predictability**: Users always know where to go to navigate. There is no ambiguity about which part of the interface controls where they are.
2. **Simplicity**: A single navigation surface eliminates the cognitive overhead of understanding multiple navigation models on the same screen.
3. **Scalability**: One well-structured sidebar can accommodate simple and complex information architectures without introducing new layout patterns.

Each pattern is designed for a specific purpose. Navigational patterns should not be mixed. When an application has hierarchical content—such as categories containing subcategories containing items—that hierarchy is represented _within_ the sidebar. It is not split across multiple panels or surfaces. The sidebar adapts to show depth. The layout does not grow new navigation regions.

### Flat navigation

Flat navigation is the default. Flat navigation should be used when there is no meaningful parent-child relationship between views. When all views exist at the same level of hierarchy, the sidebar displays them as a single list of menu items. Each item navigates the user to a distinct view. The active view is visually indicated with a selected state.

### Nested navigation via tree view

A tree view allows users to expand and collapse sections to reveal child items without leaving the sidebar.

#### Use the tree view in the following cases:

- When content has a parent-child hierarchy no more than three levels deep
- When the number of descendants in parent-child hierarchy is relatively low–typically less than 100
- When navigation menu items need to display more than a title (such as a caption or additional metadata below the title)

#### Tree view guidelines:

- Only the currently relevant branch should be expanded by default. All other branches should be collapsed.
- Expanding a branch does not navigate the user. Navigation occurs when a leaf item (or a branch that is also a destination) is selected.
- The tree should not exceed three levels of depth. If the information architecture requires more than three levels, use hierarchical drill-in navigation instead.
- Expanded/collapsed states should persist within a session so users don't lose their place when navigating between views.
- Parent items that are also navigable destinations should be visually distinct from parents that only act as grouping containers. A parent that is a destination should respond to selection like any other menu item. A parent that is only a container should only expand/collapse on interaction.

### Nested navigation via hierarchical drill-in

In this pattern, the sidebar displays one level of the hierarchy at a time. Selecting a parent replaces the current list with that parent's children, and a back affordance allows the user to return to the previous level.

Use the hierarchical drill-in view in the following cases:

- When content hierarchies exceed three levels
- When the number of child items at any level is large enough to create excessive scrolling, the sidebar should use a hierarchical drill-in pattern
- When navigational menu items need to show secondary information, such as captions or metadata

#### Hierarchical drill-in guidelines:

- A back button must be visible at the block-start of the sidebar content area when the user is at any level deeper than the root. The back button label should display the name of the parent level being returned to (example: "← Projects" rather than "← Back").
- The current level's title should be displayed directly below the back button to orient the user.
- Breadcrumbs are not used. The back button and level title provide sufficient orientation without consuming vertical space. Breadcrumbs also degrade quickly when labels are long or levels are deep.

### Navigation and content relationship

Selecting a navigation item updates the Content display area. The sidebar remains visible and in place. The content transition should be immediate—no full-page reload or layout shift.

When a navigation item is selected:

- The selected item receives a visually distinct active state
- The Content controls title updates to reflect the name of the selected view
- The Content display area renders the content for that view
- The URL should update to reflect the selected view to support direct linking and browser history

### What navigation is not

Navigation is the act of moving between distinct views of content. The following are not navigation and should not live in the Navigation sidebar:

- **Filtering**: Narrowing content within a single view belongs in the Content controls bar or within the Content display area itself.
- **Sorting**: Reordering content within a view belongs in the Content controls bar.
- **Searching**: Application-wide search belongs in the Navigation header as an action. View-specific search belongs in the Content controls bar.
- **Tabs**: In-view tabs that switch between sub-views of a single piece of content (such as "Details" and "Activity" tabs on a document) belong in the Content display area.

## Navigation menu display

### Ordering

Menu items should be ordered intentionally. The order should reflect one of the following logic–in order of priority:

1. **Logical ordering:** Items should be sorted to match the typical order in which a user moves through them (example: "Drafts" → "In Review" → "Published"). In cases where there is a known and well-established order for content, that should be mirrored in the navigation.
1. **Frequency of use: **In cases where no logical order exists, the items which are most commonly used should be ordered first.
1. **Alphabetically**: Used when items have no meaningful priority or workflow relationship. Alphabetical ordering reduces the time users spend scanning long lists.

Do not mix ordering strategies within a single group. If one group is ordered by frequency, all items within that group follow that rule.

### Grouping

Related menu items should be visually grouped. Grouping reduces scanning time and helps users build a mental model of the application's structure.

Grouping guidelines:

- Separate groups with a horizontal divider and appropriate vertical spacing. Dividers are the only visual separator between groups—do not use background colors, cards or indentation to distinguish groups.
- Each group should contain between 2 and 7 items. A group with a single item should be merged with an adjacent group or left ungrouped. A group exceeding 7 items should be considered for splitting into smaller, more specific groups.
- Aim for no more than 5 groups visible in the sidebar at one time. More than 5 groups creates visual noise and undermines the benefit of grouping in the first place. In such cases, consider hierarchical navigation.
- The order of groups should follow the same principles as the order of items within a group: by logical ordering, frequency, or alphabetically.

### Labeling groups

Groups of 3 or more items should have a visible label. A label may be omitted if the grouping is self-evident (example: "Inbox" and "Sent" next to each other do not require a "Messages" label). Be cautious of omitting labels–a self-evident grouping for a power user may not be so for a first-time user.

Group label guidelines:

- Labels should be short—ideally one or two words (examples: "Content", "Settings", "Media library").
- Labels should describe the _category_ of the items, not the action performed on them. Use "Documents" instead of "Manage documents". Use "Team" instead of "View team members".
- Labels should use sentence case (example: "Media library", not "Media Library" or "MEDIA LIBRARY").
- Labels should be visually understated relative to the menu items they describe. They orient—they do not compete for attention. Use a smaller font size, muted color, or lighter weight to achieve this.
- Labels are not interactive. They do not expand, collapse, or navigate.

### Ideal number of menu items

The total number of visible menu items in the sidebar (across all groups) should not exceed 20. This is not a suggestion—exceeding 20 items produces a navigation experience that is functionally equivalent to no organization at all.

For applications that require more than 20 navigable views, use one of the following strategies:

1. **Consolidate views**: Combine related views into a single view with in-content filtering. Five separate status-based views ("Draft", "In review", "Approved", "Published", "Archived") can often be replaced with a single "Documents" view and a status filter.
1. **Use nested navigation**: Move lower-priority items into collapsible tree branches or hierarchical drill-in levels, reducing the number of items visible at the root level.

If the total number of root-level items still exceeds 20 after applying these strategies, the application's information architecture should be revisited.

## Actions in layouts

Actions are how users create, edit, manipulate and manage content. The layout system defines specific locations for actions based on their scope and importance. Placing actions in the correct location ensures users can predict where to find them and reduces the likelihood of destructive or unintended actions.

### Action scope

Every action has a scope. Scope determines where the action is placed in the layout.

| **Scope** | **Definition** | **Placement** |
| --- | --- | --- |
| Application | Affects the entire application or spans all views (examples: global search, creating a new top-level item, application settings) | Navigation header actions |
| View | Affects the currently displayed collection of content (examples: sorting items, bulk export, toggling view mode between grid and list) | Content controls actions |
| Item | Affects a single selected piece of content (examples: editing metadata, duplicating, deleting) | Content inspector header actions (when inspector exists) or inline with the item in Content display |
| Bulk | Affects multiple selected items (examples: bulk delete, bulk status change, bulk tag assignment) | Content inspector header actions (when inspector exists) or Content controls actions (when inspector does not exist) |

When the layout does not include an Navigation sidebar, Application-scope actions move to the Content controls actions area. This is the only case where scope placement shifts between layout regions.

### Action hierarchy

Not all actions are equal. Each action location should establish a clear visual hierarchy using the Button component's `mode` prop:

1. **Primary action** (`mode="default"`): The single most important action in a given section. It uses a solid background with full visual weight. There should be only one primary action per action area. If no action is clearly more important than the others, no action should be styled as primary.
1. **Secondary actions** (`mode="ghost"`): Supporting actions that are used regularly but are not the main task. They use an outlined/bordered appearance.
1. **Tertiary actions** (`mode="bleed"`): Infrequent or background actions with minimal visual weight—no background, just text and/or icon. When visible in the interface, tertiary actions use `mode="bleed"`. When space is limited, tertiary actions should be moved into an overflow menu triggered by a `<MenuButton />` with an ellipsis (⋯) icon.
1. **Destructive actions** (`tone="critical"`): Actions that delete, remove, or irreversibly alter content. They use `tone="critical"` and should include an `<ErrorOutlineIcon />` via the `icon` prop to reinforce the action for people with color vision issues. A destructive action can be secondary or tertiary, but should never be the primary action (`mode="default"`) in a given area.

As a rule of thumb, `mode="bleed"` should represent the majority of visible actions, followed by `mode="ghost"`, with `mode="default"` being the least used. A common ratio across a surface is roughly 6:3:1 (bleed : ghost : default).

### Action placement rules

#### Navigation header actions

- Maximum of 2 visible actions. When more than 2 exist, display the primary action and place the rest in an overflow menu triggered by a `<MenuButton />`.
- Actions should be global in nature. An action here should apply across all views.
- Common application-level actions include: global search, creating a new item, notifications, and application settings.

#### Content controls actions

- Maximum of 3 visible actions. When more than 3 exist, display up to 3 (starting with the primary) and place the rest in an overflow menu triggered by a `<MenuButton />`.
- The primary action (`mode="default"`) should be positioned first (inline-start) in the row of buttons.
- Actions should relate to the current view's content. They should not duplicate application-level actions that already exist in the Navigation header.
- When no Navigation sidebar exists, this area absorbs application-level actions. In that case, application-level actions should be visually separated from view-level actions using a divider or spacing.

#### Content inspector header actions

- Maximum of 2 visible actions. When more than 2 exist, display the primary action and place the rest in an overflow menu triggered by a `<MenuButton />`.
- Actions should relate to the selected item(s) only.
- When multiple items are selected, only actions that can be applied to all selected items should be visible. Actions that cannot be applied to the full selection should be hidden rather than disabled. If hiding would cause confusion (example: a user expects to see a familiar action but it's absent), a disabled state may be used—but provide context through an adjacent status message or info icon explaining why the action is unavailable and what steps the user can take to enable it. Do not rely on a tooltip for this context, as disabled buttons are removed from the tab order and tooltips on them are inaccessible to keyboard users.

#### Inline actions within Content display

- Inline actions appear directly on or adjacent to content items (examples: a delete icon on a card, a quick-edit button on a table row).
- Inline actions should be limited to 1–2 per item. More than 2 inline actions per item creates clutter and competes with the content itself.
- Inline actions are typically icon-only buttons using `mode="bleed"`. Every icon-only button must have an `aria-label` that describes the action (example: `aria-label="Delete item"`) and a paired tooltip for sighted users.
- Inline actions may be revealed on hover for desktop interfaces. On touch devices, inline actions should be persistently visible or accessible through a long-press/context menu.
- Inline actions should be redundant—meaning the same action is available through the inspector or content controls. Inline actions are a shortcut, not the only path.

### Action button guidelines

All actions should use Sanity UI's `<Button />` component and follow these rules:

- **Labels**: Button labels should be verb-led, use sentence case, and aim for two words or less (examples: "New document", "Export", "Delete", "Save draft"). Avoid vague labels like "Click here", "Submit", "Go", or "OK". The label should communicate what will happen.
- **Tooltips**: Every action button should have a tooltip that describes the action in greater detail (example: button label "Export" → tooltip "Export all items as a CSV file"). Tooltip text should be accessible to screen readers. Do not add tooltips to disabled buttons—keyboard users cannot access them since disabled buttons are removed from the tab order.
- **Icons in buttons**: Icons should not be combined with text labels except in two specific cases. First, to visually reinforce buttons with `tone="positive"`, `tone="caution"`, or `tone="critical"`—pair with `<CheckmarkIcon />`, `<WarningOutlineIcon />`, or `<ErrorOutlineIcon />` respectively. Second, to create additional emphasis on a primary action—this should be reserved for only the most critical use cases. Icons should not replace labels except in high-density spaces (such as toolbars) where the icon is universally understood (example: a magnifying glass for search) _and_ space is constrained. Every icon-only button must have an `aria-label` and a paired tooltip.
- **Loading states**: Use `loading={true}` only for processes that consistently take longer than 500ms. The button should be `disabled` while loading and the label should not change. For processes that take over three seconds, trigger a Toast notification when the action completes to reinforce that the operation finished.
- **Confirmation for destructive actions**: Destructive actions should use `tone="critical"` with an `<ErrorOutlineIcon />` and require explicit confirmation before executing. Use a confirmation dialog that clearly states what will happen and provides a cancel option. The confirmation button should repeat the destructive action's name (example: "Delete 3 items") rather than a generic "Confirm" or "Yes". The confirmation button should also use `tone="critical"`.
- **Buttons are not for navigation**: Do not use `<Button />` to navigate to a new view or URL—use `<Link />` instead. Do not use `<Button />` to switch between views within a surface—use `<Tab />` instead. Users of assistive technology expect buttons to perform actions and links to navigate.
- **Buttons are not for menus**: Do not use `<Button />` as an activator for displaying a menu. Use `<MenuButton />` instead. `<MenuButton />` handles placement and display details that ensure consistency.

### Overflow menus

When actions exceed the maximum count for a given area, they move into an overflow menu.

- The overflow trigger should use Sanity UI's `<MenuButton />` with an ellipsis (⋯) icon. Do not use a plain `<Button />` for this purpose—`<MenuButton />` handles menu placement and display consistently.
- Menu items within the overflow should be ordered by frequency of use—most common at the top.
- Destructive actions within an overflow menu should be placed at the bottom, separated from other items by a divider. Destructive menu items should use `tone="critical"`.
- Overflow menu items should use a label only—no tooltips, no icons. The label should be descriptive enough to stand on its own (example: "Export as CSV" instead of "Export").
- Overflow menus should contain no more than 8 items. If more than 8 actions exist, group them into labeled sections within the menu using the same grouping guidelines defined in the Navigation menu display section.

### Empty states and disabled actions

- Do not disable buttons as a blocking mechanism (example: disabling a submit button until all required fields are filled). People may not understand what is preventing the action. Instead, allow the button to be pressed and provide appropriate feedback in response.
- Actions that cannot be performed in the current context should be hidden rather than disabled when the reason for the disabled state would not be obvious to the user. A button that is permanently disabled with no explanation is worse than no button at all.
- Primary actions (`mode="default"`) that represent critical workflows should never be hidden. They should remain visible at all times.
- When a disabled state _is_ used, provide context through an adjacent info icon or inline status message that explains why the action is unavailable and what steps the user can take to enable it (example: "Select at least one item to export"). Do not rely on tooltips for this—disabled buttons are removed from the tab order, making tooltips inaccessible to keyboard users.
- In empty states where no content exists, a single prominent call-to-action should be placed in the center of the Content display area. This action should directly address the empty state (example: "Create your first document" rather than "Get started").

## Inspection

## Showing and hiding sidebars

Both the Navigation sidebar and the Inspection sidebar can be shown or hidden within desktop and tablet breakpoints. This section defines the rules for when and how sidebars appear and disappear.

### Default visibility

Each layout type implies a default sidebar configuration. The default state is what users see on first load before any interaction.

| **Layout type** | **Navigation sidebar** | **Inspection sidebar** |
| --- | --- | --- |
| Pane | Hidden (not available) | Hidden (not available) |
| Shell | Hidden (not available) | Hidden (not available) |
| Shell with Inspector | Hidden (not available) | Visible |
| Shell with Navigation | Visible | Hidden (not available) |
| Shell with Navigation and Inspector | Visible | Visible |

"Not available" means the layout does not support that sidebar at all—there is no toggle and no way for the user to summon it. "Visible" and "Hidden" refer to sidebars that exist within the layout and can be toggled.

### Toggling sidebars

When a layout supports a sidebar, users should be able to show and hide it. Toggling follows these rules:

- **Toggle affordance**: Each toggleable sidebar should have a clearly labeled button that controls its visibility. The button should use `mode="bleed"` and include both an icon and an `aria-label` describing the action (example: `aria-label="Show navigation"` or `aria-label="Hide inspector"`).
- **Toggle placement for Navigation sidebar**: The toggle button should be placed in the Content controls bar, inline-start aligned before the Content controls title. When the sidebar is hidden, the button displays a menu/hamburger icon. When the sidebar is visible, the button displays a close icon or the same menu icon in an active/selected state using `selected={true}`.
- **Toggle placement for Inspection sidebar**: The toggle button should be placed in the Content controls actions area. When the inspector is hidden, the button displays an inspector/panel icon. When the inspector is visible, the button should use `selected={true}` to indicate the active state.
- **Label change on toggle**: The button's `aria-label` and tooltip should update to reflect the available action. When the sidebar is visible, the label should say "Hide [sidebar name]". When hidden, "Show [sidebar name]".
- **Only one toggle per sidebar**: There should be exactly one toggle per sidebar. Do not place duplicate toggle buttons in multiple locations.

### Sidebar transitions

- **Animation**: Sidebars should animate in and out with a horizontal slide transition. The transition should be fast (150–200ms) and use an ease-out curve for opening and ease-in for closing.
- **Content reflow**: When a sidebar is shown or hidden, the Content area should smoothly resize to fill the available space. Content should not jump or reflow abruptly. Avoid layout shifts that would cause the user to lose their place in the content.
- **Reduced motion**: When the user's operating system has "Reduce motion" enabled, sidebars should appear and disappear instantly without animation. Do not override this preference.

### Persistence

- **User preference should persist**: When a user explicitly shows or hides a sidebar, that preference should be remembered for the duration of the session. If technically feasible, persist the preference across sessions (using local storage or a similar mechanism) so the layout appears the same way on return.
- **Context-driven overrides**: In some cases, the application may override the user's preference in response to a user action. For example, selecting an item in the Content display area may automatically open the Inspection sidebar to show that item's metadata. This is acceptable only when the user's action directly implies they need the sidebar. The user should still be able to dismiss the sidebar manually after it opens.
- **Do not auto-hide on interaction**: Sidebars should not collapse automatically when the user clicks or interacts with the Content area. Hiding a sidebar should always be an explicit user action via the toggle button or a keyboard shortcut.

### Keyboard interaction

- **Keyboard shortcut**: Provide a keyboard shortcut to toggle each sidebar. Use bracket-based shortcuts when possible (example: `[` for the Navigation sidebar, `]` for the Inspection sidebar). The shortcut should be discoverable via the toggle button's tooltip.
- **Focus management on open**: When a sidebar is shown via its toggle, focus should move to the first focusable element inside the sidebar. This ensures keyboard users do not have to tab through the entire layout to reach the newly visible content.
- **Focus management on close**: When a sidebar is hidden, focus should return to the toggle button that triggered the close. Do not leave focus on a hidden or removed element.
- **Tab order**: When a sidebar is hidden, its contents should be completely removed from the tab order. Hidden sidebars should not contain focusable elements that keyboard users can accidentally reach.

### Best practices

- **Bias towards keeping sidebars visible on desktop**: Hiding sidebars by default saves space but risks hiding critical functionality from new users who do not know the sidebar exists. Default to visible on desktop-sized screens unless the application's primary use case demands maximum content area.
- **Do not use sidebars as progressive disclosure**: Sidebars are persistent layout regions, not reveal panels for secondary content. If content only needs to appear temporarily in response to a specific action, use a Popover or Dialog instead.
- **Avoid dual-hidden states**: In layouts that support both sidebars (Shell with Navigation and Inspector), avoid a state where both sidebars are hidden simultaneously on desktop. This creates an interface that looks like a Pane or Shell layout, which is disorienting for users who expect navigation and inspection to be available. If both sidebars must be hideable, at least one should be visible by default.
- **Mobile and tablet behavior**: On smaller screens, sidebar visibility follows the responsive rules defined in the Responsiveness section. The toggle patterns described here apply to desktop-sized viewports. On tablets, the Navigation sidebar collapses into a top bar. On mobile, both sidebars are hidden by default and accessed through overlay patterns (popover menu for navigation, sheet for inspector).

## Responsiveness

Layouts should elegantly adapt to the device it's rendered on–from phone to tablet to desktop.

### General responsiveness for mobile devices

- Desktop-oriented components should be displayed in a mobile equivalent (example: Modals on desktop should typically be displayed as a Sheet on mobile devices)
- Bias towards text-based actions over icons when space permits
- Bias towards displaying less information broken across multiple surfaces

### General responsiveness for touch-based interfaces

- All UI controls that take user interaction/input should be no smaller than 24x24 pixels in size
- Critical interactions that relied on hover need to have a mobile-friendly fallback

### Responsiveness for tablets

#### Application controls

Application controls should appear as a fixed top bar above the main Content window. It should span the entire width of the layout. Application controls should contain the name of the application and application-level actions.

### Content controls

Content controls should appear as a fixed top bar above the Content display pane. Navigation between pages/views is available through a `<MenuButton />` with a menu icon, inline-start aligned to the title in the Content controls bar.

#### Content inspector

The Content inspection sidebar should function exactly the same as it does on desktop devices.

### Responsiveness for mobile devices

Mobile phones should only display the content section by default. Both the Navigation sidebar and Inspection sidebar should be hidden. The content controls bar is fixed at the top of the screen and acts as the main section for actions and controls.

#### Application controls

Accessing the application controls should happen through a `<MenuButton />` with a menu icon, inline-start aligned to the title in the Content controls bar. Activating the `<MenuButton />` should display the application controls as a popover menu. Do not use a plain `<Button />` for this purpose.

#### Content inspector

The Content inspector should be displayed as a sheet when an item is tapped/selected in the main content view. The sheet should function like a standard mobile sheet component and have an explicit dismiss button that is block-start and inline-end aligned.

### Content

The layouts doc covers content rules across several subsections. This section collects the system-level standards that apply.

- **Action labels (P1).** Button labels in toolbars and action bars start with a verb. Keep labels at 1–3 words. Use sentence case. See product-content-standards.md P1.
- **Empty states (P4).** When a layout region has no content, show empty state text. State what is missing and offer a path forward. See product-content-standards.md P4.
- **Confirm dialogs (P5).** Destructive actions in layouts should open a confirm dialog. The confirm button repeats the action verb. See product-content-standards.md P5.
- **Status messages (P7).** Toast messages and inline status text lead with the outcome. Use past tense for completed actions. Include a next step when applicable. See product-content-standards.md P7.
- **Casing (P8).** Use sentence case for all labels, group names, and status text in layouts.

### Accessibility

- **Landmark structure.** Map layout regions to HTML landmark elements (WCAG 1.3.1 A, 2.4.1 A):

  | Layout region | Landmark element | Labeling |
  | --- | --- | --- |
  | Navigation sidebar | `<nav>` | `aria-label` required (e.g. "Main navigation") |
  | Content area | `<main>` | One per page. No extra labeling needed. |
  | Inspection sidebar | `<aside>` | `aria-label` required (e.g. "Document inspector") |
  | Content toolbar | `<header>` within `<main>` | Scoped to `<main>`, not a separate page landmark. |

  Without landmarks, screen reader users experience the layout as a flat list of elements with no structural cues.

- **Visual-to-DOM order.** The inline-start → center → inline-end layout order must match DOM order. Do not use CSS `order`, `flex-direction: row-reverse`, or grid placement to reorder layout columns. Screen readers and keyboard navigation follow DOM order (WCAG 1.3.2 A, 2.4.3 A).
- **Reflow at 320px.** Layouts must work at 320px viewport width without horizontal scrolling (WCAG 1.4.10 AA). A three-column layout that does not collapse will overflow. Hide sidebars behind toggle buttons at narrow widths, or stack the layout into a single column. Use `Flex` with `wrap="wrap"` and avoid fixed `px` widths on layout columns.
- **Sidebar focus management.** When a sidebar opens, move focus to the first focusable element inside it. When it closes, return focus to the toggle button. Hidden sidebar content must be removed from tab order (WCAG 2.4.3 A).
- **Heading hierarchy.** Each layout region should use headings that fit the page hierarchy. The content area heading should be `<h1>`. Sidebar headings should be `<h2>` or lower. Do not skip heading levels across regions (WCAG 2.4.6 AA).

## Scrollable regions

Box and Flex both accept `overflow`, `overflowX`, and `overflowY` as props. Do not use inline styles for scroll behavior.

Valid values: `'auto'`, `'hidden'`, `'scroll'`, `'clip'`, `'visible'`.

```jsx
// ✗ Inline style for scroll
<Box style={{ overflowY: 'auto', maxHeight: '400px' }}>
  {/* long content */}
</Box>

// ✓ Props handle scroll
<Box overflowY="auto" maxHeight="400px">
  {/* long content */}
</Box>
```

### Full-height scrollable panel

A common pattern for app shells: the outer container sets the height, the inner content area scrolls.

```jsx
<Flex minHeight="100vh">
  <Box as="nav" width="260px" flexShrink={0} overflowY="auto">
    {/* sidebar scrolls on its own */}
  </Box>
  <Flex as="main" flexDirection="column" flexGrow={1} minWidth="0" overflow="hidden">
    <Box padding={3} borderBottom>{/* toolbar — fixed */}</Box>
    <Box flexGrow={1} overflowY="auto" padding={4}>
      {/* content scrolls */}
    </Box>
  </Flex>
</Flex>
```

Key details:
- `overflow="hidden"` on the main Flex prevents long content from pushing the page wider.
- `overflowY="auto"` on the content Box lets it scroll.
- `minWidth="0"` on the main Flex prevents flex children from overflowing.
- No inline styles are needed. Every value is a prop.

# Sidebar navigation pattern

Sanity UI has no built-in `NavItem` or `SidebarLink` component. This page shows the canonical pattern for building keyboard-accessible sidebar navigation.

## When to use this pattern

- Persistent sidebar links (not inside a `MenuButton` dropdown)
- Navigation items with icon + label + trailing badge/count
- Items that show an active/selected state

---

## Do not build nav items from scratch

> ⛔ **Never use a native `<button>` or `<Box as="button">` with inline styles for navigation items.** This is the single most common source of unnecessary inline styles in test runs — agents create 10–12 CSS properties per nav item to replicate what Sanity UI components already provide.

```tsx
{/* ✗ — 12 inline CSS properties to build something that already exists */}
<button
  onClick={() => setActive('recipes')}
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '8px 10px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    background: active ? 'var(--blue-50)' : 'transparent',
    color: active ? 'var(--blue-600)' : 'inherit',
    fontFamily: 'inherit',
    textAlign: 'left',
  }}
>
  <span>Recipes</span>
</button>

{/* ✗ — Same problem with Box as="button" — 8 inline CSS properties */}
<Box
  as="button"
  onClick={() => setActive('recipes')}
  style={{
    display: 'flex', alignItems: 'center', gap: '8px',
    width: '100%', cursor: 'pointer', border: 'none',
    background: active ? 'var(--blue-50)' : 'transparent',
    textAlign: 'left',
  }}
>
  <Text size={1}>Recipes</Text>
</Box>

{/* ✗ — Hand-rolled <span> badge instead of Badge component */}
<span style={{
  background: 'var(--gray-200)', borderRadius: '10px',
  padding: '1px 7px', fontSize: '11px', fontWeight: 600,
}}>
  {count}
</span>
```

Use `Menu` + `MenuItem` (Option 1) or `Button mode="bleed"` (Option 2) instead. Both handle keyboard interaction, focus, ARIA roles, and visual states with zero inline styles.

---

## Option 1: Menu + MenuItem (recommended)

`Menu` rendered directly in the sidebar (not inside a `MenuButton` popover) gives you arrow-key navigation, focus management, and correct ARIA roles for free. Use `MenuItem` for each navigation entry.

```tsx
import { Menu, MenuItem, Badge, Stack, Label } from '@sanity/ui'
import { Box, Flex, Text } from 'ui'
import { DocumentTextIcon, CodeIcon, ClockIcon } from '@sanity/icons'

function Sidebar({
  activeSection,
  setActiveSection,
}: {
  activeSection: string
  setActiveSection: (section: string) => void
}) {
  return (
    <Box as="nav" aria-label="Main navigation" padding={3}>
      <Stack space={4}>
        <Label size={0} muted>Content</Label>
        <Menu>
          <MenuItem
            icon={DocumentTextIcon}
            text="Guides"
            selected={activeSection === 'guides'}
            onClick={() => setActiveSection('guides')}
          />
          <MenuItem
            icon={CodeIcon}
            text="API References"
            selected={activeSection === 'api'}
            onClick={() => setActiveSection('api')}
          />
          <MenuItem
            icon={ClockIcon}
            text="Changelogs"
            selected={activeSection === 'changelogs'}
            onClick={() => setActiveSection('changelogs')}
          />
        </Menu>
      </Stack>
    </Box>
  )
}
```

**What Menu provides automatically:**
- `role="menu"` on the container, `role="menuitem"` on each item
- Arrow Up / Arrow Down to move between items
- Enter / Space to activate the focused item
- Focus trapping within the menu while navigating

### Adding trailing badges or counts

`MenuItem` does not support trailing content out of the box. To add a count badge, compose the item manually:

```tsx
<Menu>
  <MenuItem
    icon={DocumentTextIcon}
    selected={activeSection === 'guides'}
    onClick={() => setActiveSection('guides')}
  >
    <Flex alignItems="center" justifyContent="space-between" gap={2}>
      <Text size={1}>Guides</Text>
      <Badge tone="default" fontSize={0}>12</Badge>
    </Flex>
  </MenuItem>
</Menu>
```

### Selected state contrast warning

> ⚠️ **The default `selected` style uses `tone="primary"` (4.29:1 contrast) — below WCAG AA.** For navigation menus where one item stays selected, the `menu.md` docs recommend marking the active item with a bold label or left border accent instead of relying on the default selected background. If you do use `selected`, verify contrast in your theme.

## Option 2: Button mode="bleed" (simpler, less keyboard refinement)

For simple nav items without arrow-key navigation between siblings, use `Button` with `mode="bleed"` inside a `Stack`:

```tsx
import { Button, Stack } from '@sanity/ui'
import { Box } from 'ui'
import { DocumentTextIcon, CodeIcon } from '@sanity/icons'

<Box as="nav" aria-label="Main navigation" padding={3}>
  <Stack space={1}>
    <Button
      mode="bleed"
      icon={DocumentTextIcon}
      text="Guides"
      selected={activeSection === 'guides'}
      aria-pressed={activeSection === 'guides'}
      onClick={() => setActiveSection('guides')}
    />
    <Button
      mode="bleed"
      icon={CodeIcon}
      text="API References"
      selected={activeSection === 'api'}
      aria-pressed={activeSection === 'api'}
      onClick={() => setActiveSection('api')}
    />
  </Stack>
</Box>
```

**Limitations of the Button approach:**
- No arrow-key navigation between items — each button is a separate Tab stop
- No trailing badge/count without custom children (Button clips complex children)
- No `fullWidth` prop — wrap in `<Box display="flex">` for full-width items
- `selected` sets `data-selected` only — you must add `aria-pressed` yourself

## Choosing between the two

| Need | Use Menu + MenuItem | Use Button |
|------|---------------------|------------|
| Icon + label only | Either works | ✓ Simpler |
| Icon + label + trailing badge | ✓ Via children composition | ✗ Clips children |
| Arrow-key navigation between items | ✓ Built in | ✗ Tab only |
| ARIA menu roles | ✓ Automatic | ✗ Manual |
| Keyboard accessible | ✓ | ✓ |
| Toggle state | `selected` prop | `aria-pressed` (manual) |

## Do not use

- **`Box as="button"`** — inherits browser button defaults (border, background, cursor). No prop-based reset exists. See `style-overrides.md`.
- **`<a>` without `href`** — an anchor without `href` is not keyboard-focusable.
- **`tone` on navigation MenuItems** — navigation items should not use tone. Reserve tone for action menus (`tone="critical"` for destructive actions).
- **`hotkeys` on navigation MenuItems** — hotkeys are for action shortcuts, not navigation.

## Accessibility checklist

- [ ] Navigation container uses `<Box as="nav" aria-label="...">`
- [ ] Each item is keyboard-reachable and activatable (`Enter`/`Space`)
- [ ] Active item has `selected={true}` (MenuItem) or `aria-pressed="true"` (Button)
- [ ] Icon-only items have `aria-label` (not needed if text label is present)
- [ ] Navigation group uses `Stack space={1}` or `space={2}` for touch target spacing
- [ ] Selected state meets WCAG AA contrast (4.5:1) — test in your theme

## Cross-references

- `menu.md` — Full Menu/MenuItem API, keyboard behavior, and accessibility docs
- `button.md` — Button modes, tones, and states
- `style-overrides.md` — Full-width button pattern
- `silent-failures.md` — Common pitfalls

# Core component props

Under review

**Note: The following components currently only apply to the new Sanity UI POC library–specifically Box, Flex, and Grid components.**

## Shared Props

Props shared across **all three** components (Box, Flex, Grid).

### Base

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| as | React.ElementType | Element or component to render — valid values differ per component | Any valid HTML tag or component | No | 'div' |
| display | Responsive\<...\> | CSS display property — valid values differ per component | See component-specific tables | No | — |
| className | string | Additional CSS class names | Any string | No | — |
| style | React.CSSProperties | Inline styles | Any valid CSS | No | — |

### Tone (background)

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| tone | Responsive\<Tone\> | Applies a semantic background color | default, neutral, primary, suggest, positive, caution, critical | No | — |

### Width

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| width | Responsive\<string\> | CSS width | Any valid CSS value | No | — |
| minWidth | Responsive\<string\> | CSS min-width | Any valid CSS value | No | — |
| maxWidth | Responsive\<string\> | CSS max-width | Any valid CSS value | No | — |

### Height

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| height | Responsive\<string\> | CSS height | Any valid CSS value | No | — |
| minHeight | Responsive\<string\> | CSS min-height | Any valid CSS value | No | — |
| maxHeight | Responsive\<string\> | CSS max-height | Any valid CSS value | No | — |

### Margin

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| margin | Responsive\<SpaceAuto\> | Margin on all sides | 0–9, auto | No | — |
| marginX | Responsive\<SpaceAuto\> | Margin on left and right | 0–9, auto | No | — |
| marginY | Responsive\<SpaceAuto\> | Margin on top and bottom | 0–9, auto | No | — |
| marginTop | Responsive\<SpaceAuto\> | Margin on top side | 0–9, auto | No | — |
| marginRight | Responsive\<SpaceAuto\> | Margin on right side | 0–9, auto | No | — |
| marginBottom | Responsive\<SpaceAuto\> | Margin on bottom side | 0–9, auto | No | — |
| marginLeft | Responsive\<SpaceAuto\> | Margin on left side | 0–9, auto | No | — |

### Padding

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| padding | Responsive\<Space\> | Padding on all sides | 0–9 | No | — |
| paddingX | Responsive\<Space\> | Padding on left and right | 0–9 | No | — |
| paddingY | Responsive\<Space\> | Padding on top and bottom | 0–9 | No | — |
| paddingTop | Responsive\<Space\> | Padding on top side | 0–9 | No | — |
| paddingRight | Responsive\<Space\> | Padding on right side | 0–9 | No | — |
| paddingBottom | Responsive\<Space\> | Padding on bottom side | 0–9 | No | — |
| paddingLeft | Responsive\<Space\> | Padding on left side | 0–9 | No | — |

### Border

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| border | boolean | Applies a border on all sides. Borders inherit color styling from the `tone` prop. | true, false | No | — |
| borderTop | boolean | Applies a border on the top side | true, false | No | — |
| borderRight | boolean | Applies a border on the right side | true, false | No | — |
| borderBottom | boolean | Applies a border on the bottom side | true, false | No | — |
| borderLeft | boolean | Applies a border on the left side | true, false | No | — |
| radius | Responsive\<Radius\> | CSS border-radius using the design scale | 0–6, full | No | — |

### Position

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| position | Responsive\<Position\> | CSS position | absolute, fixed, relative, static, sticky | No | — |
| inset | Responsive\<SpaceAuto\> | CSS inset — all sides simultaneously | 0–9, auto | No | — |
| top | Responsive\<SpaceAuto\> | CSS top offset | 0–9, auto | No | — |
| right | Responsive\<SpaceAuto\> | CSS right offset | 0–9, auto | No | — |
| bottom | Responsive\<SpaceAuto\> | CSS bottom offset | 0–9, auto | No | — |
| left | Responsive\<SpaceAuto\> | CSS left offset | 0–9, auto | No | — |

### Overflow

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| overflow | Responsive\<Overflow\> | CSS overflow on both axes | visible, hidden, auto, scroll, clip | No | — |
| overflowX | Responsive\<Overflow\> | CSS overflow-x | visible, hidden, auto, scroll, clip | No | — |
| overflowY | Responsive\<Overflow\> | CSS overflow-y | visible, hidden, auto, scroll, clip | No | — |

### Flex Child (self-alignment inside a Flex parent)

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| flexBasis | Responsive\<string\> | CSS flex-basis — initial main-axis size of the item | Any valid CSS value | No | — |
| flexGrow | Responsive\<number\> | CSS flex-grow — how much the item grows relative to siblings | Any number | No | — |
| flexShrink | Responsive\<number\> | CSS flex-shrink — how much the item shrinks relative to siblings | Any number | No | — |

### Grid Child (self-placement inside a Grid parent)

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| gridColumn | Responsive\<string\> | CSS grid-column shorthand | Any valid CSS value | No | — |
| gridColumnStart | Responsive\<string\> | CSS grid-column-start | Any valid CSS value | No | — |
| gridColumnEnd | Responsive\<string\> | CSS grid-column-end | Any valid CSS value | No | — |
| gridRow | Responsive\<string\> | CSS grid-row shorthand | Any valid CSS value | No | — |
| gridRowStart | Responsive\<string\> | CSS grid-row-start | Any valid CSS value | No | — |
| gridRowEnd | Responsive\<string\> | CSS grid-row-end | Any valid CSS value | No | — |

## Shared Between Flex and Grid Only

### Gap

| Prop | Type | Description | Values | Required | Default |
| :---- | :---- | :---- | :---- | :---: | :---- |
| gap | Responsive\<Space\> | CSS gap — spacing between all children | 0–9 | No | — |
| columnGap | Responsive\<Space\> | CSS column-gap — horizontal spacing between children | 0–9 | No | — |
| rowGap | Responsive\<Space\> | CSS row-gap — vertical spacing between children | 0–9 | No | — |

---

## Components that reject layout props

Not every component accepts the props above. Card, Stack, and Button ignore flex-child, overflow, and sizing props. No error is thrown. The prop has no effect.

| Component | Rejects these props | Fix |
|---|---|---|
| Card | `flexGrow`, `flexShrink`, `flexBasis`, `minWidth`, `overflow`, `overflowY`, `width`, `height` | Wrap Card in a Box or Flex. Put layout props on the wrapper. |
| Stack | `flexGrow`, `flexShrink`, `flexBasis`, `overflow` | Wrap Stack in a Box or Flex. Put layout props on the wrapper. |
| Button | `flexGrow`, `flexShrink`, `width` (no `fullWidth` prop) | Wrap Button in a Box. Set `width="100%"` on the Box. |

See `style-overrides.md` for full examples and canonical workarounds.

# Box

Used as the lowest-level building block for containing UI elements.

### API

Box's own props are `as` and `display`. Everything else it accepts comes from shared layout props.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | React element type | `'div'` | HTML element to render (e.g. `as="nav"`, `as="section"`, `as="main"`) |
| `display` | `'block'`, `'inline-block'`, `'none'` | — | CSS `display` property. **Does not include `'flex'` or `'grid'`** — use the `Flex` or `Grid` components for those. |

Box also inherits shared layout props (padding, margin, sizing, border, overflow, position, tone, flex-child, grid-child). See "All available props" at the bottom of this document for the complete reference.

### **Usage guidelines**

#### **When to use:**

- As a container for child elements  
- To  apply padding or margin to a group of elements  
- To create basic visual styling (such as background, border, shadow, etc.) for the purposes of composing a custom component

#### **When not to use:**

- As an interactive element  
- As a way to stack or align one of more child elements. Use Flex, Stack, or Inline instead.  
- When you want to render an element with `display: flex`. Don't use inline styles to render a Box with flex styles. Use Flex instead.
- As a way to display children in a grid layout. Use Grid instead.  
- To act as a container for content that would otherwise be reserved for Card.  
- To center content at a max width. Use **Container** instead — it sets `max-width` and centers itself.
- 
#### **Choosing between Box, Flex, Grid, Stack, Inline, and Container:**

| Component | Dimensions | Adds visual styling | Use case |
| :---- | :---- | :---- | :---- |
| Box | Spacing and structure | Yes (background and, border) | Wrapping elements with padding or margin |
| Flex | One-dimensional (row or column) | Yes (background and, border) | Toolbars, split layouts, aligned groups of elements |
| Grid | Two-dimensional (rows \+ columns) | Yes (background and, border) | Card grids, dashboards, aligned column layouts |
| Stack | One-dimensional (column only) | No | Vertical sequences of elements with uniform spacing |
| Inline | One-dimensional (wrapping row) | No | Badges, Buttons, or any set of variable-width items that wrap |
| Container | Centered column | No | Constraining content width and centering it |

### **Best practices**

#### **Do**

- Use Box's styling props, such as `tone`, `padding`, `width`, etc. to adjust the visual appearance of the component. Refer to **core component props** to review available styling props. 
- Use padding over margin when possible to avoid spacing issues related to margin collapse

#### **Don't**
- **Never use `as="button"`.** `Box as="button"` does not reset browser defaults — the result has a visible border, background color, padding, and an inappropriate cursor. Correcting these requires inline style overrides that directly contradict the library's anti-inline-style guidance. There is no prop-based reset escape hatch. **Use the `Button` component instead.**
- Don't use `style` to adjust visual attributes of `Box` when a style prop exists. Avoid inline styles for `width`, `height`, `borderRadius`, `background`, `color`, `fontSize`, `fontWeight`, and `cursor` on `Flex` or `Box`. Use the matching style prop instead. Check whether `Avatar`, `Badge`, `Button`, or `Card` with appropriate props covers your use case before writing a custom element. See "All available props" at the bottom of this document for the complete reference.
- Don't give Box inline styles to display as flex. Sanity UI components are meant to be modular, single purpose and composable. If you need a container with a background and flex display, use wrap Flex with Box that uses `tone`: `<Box tone="neutral" ... ><Flex ... > ... </Flex></Box>`
- Avoid adding margin/padding to individual elements like Buttons or Text to set placement.  Instead, wrap elements in Box with margin/padding.  
- Don't add onClick to Box

### Accessibility

- **Layout only.** Box provides spacing and structure. It does not add keyboard handling, focus management, or ARIA state. If you render Box as a semantic element via `as`, you are responsible for the behavior that element requires.  
- **Semantic elements via `as`.** Box accepts an `as` prop. Use it to render semantic HTML when the content requires it:  
  - `as="nav"` — requires `aria-label` when more than one `<nav>` exists on the page (WCAG 1.3.1 A).  
  - `as="section"` — requires a heading child or `aria-label` to register as a landmark (WCAG 1.3.1 A).  
  - `as="form"` — requires an accessible name via `aria-label`, `aria-labelledby`, or `<legend>` (WCAG 1.3.1 A).  
  - `as="main"` — should appear once per page.  
  - `as="aside"` — should have `aria-label` when the role is not clear from context.  
- **Behavioral elements.** Do not use `as` to render `<button>`, `<dialog>`, `<select>`, `<details>`, `<summary>`, or `<fieldset>`. Box does not fulfil the keyboard, focus, or ARIA contracts those elements require (WCAG 4.1.2 A). Use the matching Sanity UI component instead.  
- **Lists.** When rendering `as="ul"` or `as="ol"`, add `role="list"` if `list-style: none` is applied. WebKit strips list semantics without it (WCAG 1.3.1 A). Children must be `<li>` elements.  
- **Visual-to-DOM order.** Do not use CSS `order` or grid placement on Box children to reorder them from source order. Screen readers and keyboard navigation follow DOM order, not visual order (WCAG 1.3.2 A).  
- **Spacing and reflow.** Box spacing tokens use `rem` units and scale with user font-size settings. Content inside Box must reflow at 320px viewport width without horizontal scrolling (WCAG 1.4.10 AA).  
- 

### Content

- **Box does not set text styles.** Box provides spacing and structure. It does not set font size, line height, weight, or color. Use Text, Heading, or Label for text styling.

### CSS custom properties — do not use them

⛔ **Never reference `--card-*` CSS custom properties directly. These are internal implementation details of the Card component, not a public API.**
Outside a `Card` ancestor they silently resolve to `undefined`. The browser swallows undefined CSS custom properties with no warning.
**Use `tone` instead.** The `tone` prop on `Box`, `Flex`, `Grid`, and `Card` is the public API for semantic background color:
```tsx
{/* ✗ — silently does nothing outside a Card ancestor */}
<Box style={{ background: 'var(--card-bg)' }} />
{/* ✓ */}
<Box tone="neutral" />
{/* ✗ — silently fails outside Card */}
<Box style={{ borderTop: '1px solid var(--card-border-color)' }} />
{/* ✓ */}
<Divider />
```


### Code examples 

#### Anti-patterns
```jsx
{/* ✗ Don't use inline styles or reference --card-* CSS variables */}
<Box
  padding={2}
  radius={2}
  
  style={{ background: 'var(--card-bg)', flexShrink: 0, width: '260px' }}
>
  <Text size={1} color="muted">
    <DocumentTextIcon />
  </Text>
</Box>

{* ✓ Use Box's style props instead *}
<Box
  padding={2}
  radius={2}
  tone="neutral"
  flexShrink={0}
  width="260px"
>
  <Text size={1} color="muted">
    <DocumentTextIcon />
  </Text>
</Box>
```

```jsx
{/* ✗ Don't use inline styles for flex-shrink rules */}
<Box style={{ flexShrink: 0, width: 32, height: 32 }}>
  <SomeIcon />
</Box>

{/* ✓ Use flexShrink prop — no inline style needed */}
<Box flexShrink={0} width="32px" height="32px">
   <DocumentTextIcon />
</Box>
```

```jsx
{/* ✗ Don't use tokens for unintended purposes to get a desired style */}
<Box
  padding={1}
  radius={2}
  style={{ background: 'var(--blue-600)' }}
>
  <Text size={1} style={{ color: '#fff', lineHeight: 1 }}>
    <DocumentsIcon />
  </Text>
</Box>

{/* ✓ Work within the system's intentional constraints */}
<Box
  padding={1}
  radius={2}
  tone="primary"
>
  <Text size={1} color="primary">
    <DocumentsIcon />
  </Text>
</Box>
```


```jsx
{/* ✗ Don't use Box as a flex container via inline styles */}
<Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32 }}>
  <Icon />
</Box>

{/* ✓ Use Flex directly */}
<Flex alignItems="center" justifyContent="center" width="32px" height="32px">
  <Icon />
</Flex>
```

```jsx
{/* ✗ Don't use styling to mimic components that already exist, such as Avatar */}
<Box style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#556bfc',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
  <Text>AJ</Text>
</Box>

{/* ✓ Use the Avatar component */}
<Avatar>AJ</Avatar>
```

```jsx
{/* ✗ Don't build a divider from scratch */ }
<Box style={{ borderTop: '1px solid var(--card-border-color)', marginTop: '4px', marginBottom: '4px' }} />

{/* ✓ Use the Divider component */ }
<Divider />
```

## All available props

Every prop available on Box. All props are optional and support responsive arrays (e.g. `padding={[2, null, 4]}`).

### Component

| Prop | Type | Default | CSS equivalent |
|------|------|---------|----------------|
| `as` | React element type | `'div'` | — |
| `display` | `'block'`, `'inline-block'`, `'none'` | — | `display` |

### Tone

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `tone` | `'default'`, `'neutral'`, `'primary'`, `'suggest'`, `'positive'`, `'caution'`, `'critical'` | background tint |

**Tone background tokens (light mode):**

| Value | Background token | Approx. colour |
|-------|-----------------|----------------|
| `'default'` | `var(--gray-50)` | Near-white |
| `'neutral'` | `var(--gray-100)` | Light gray |
| `'primary'` | `var(--blue-50)` | Light blue |
| `'suggest'` | `var(--purple-50)` | Light purple |
| `'positive'` | `var(--green-50)` | Light green |
| `'caution'` | `var(--yellow-50)` | Light yellow |
| `'critical'` | `var(--red-50)` | Light red |

### Padding

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `padding` | `0`–`9` | `padding` |
| `paddingX` | `0`–`9` | `padding-left` + `padding-right` |
| `paddingY` | `0`–`9` | `padding-top` + `padding-bottom` |
| `paddingTop` | `0`–`9` | `padding-top` |
| `paddingRight` | `0`–`9` | `padding-right` |
| `paddingBottom` | `0`–`9` | `padding-bottom` |
| `paddingLeft` | `0`–`9` | `padding-left` |

### Margin

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `margin` | `0`–`9` or `'auto'` | `margin` |
| `marginX` | `0`–`9` or `'auto'` | `margin-left` + `margin-right` |
| `marginY` | `0`–`9` or `'auto'` | `margin-top` + `margin-bottom` |
| `marginTop` | `0`–`9` or `'auto'` | `margin-top` |
| `marginRight` | `0`–`9` or `'auto'` | `margin-right` |
| `marginBottom` | `0`–`9` or `'auto'` | `margin-bottom` |
| `marginLeft` | `0`–`9` or `'auto'` | `margin-left` |

### Sizing

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `width` | string | `width` |
| `minWidth` | string | `min-width` |
| `maxWidth` | string | `max-width` |
| `height` | string | `height` |
| `minHeight` | string | `min-height` |
| `maxHeight` | string | `max-height` |

### Border

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `border` | boolean | 1px border on all sides |
| `borderTop` | boolean | `border-top` |
| `borderRight` | boolean | `border-right` |
| `borderBottom` | boolean | `border-bottom` |
| `borderLeft` | boolean | `border-left` |
| `radius` | `0`–`6` or `'full'` | `border-radius` |

> **Border color.** The `border` prop uses `1px solid var(--border-color, var(--gray-200))`. Inside a Card ancestor, `--border-color` is set by the Card's tone context. Outside any Card, it falls back to `var(--gray-200)` — this is the expected global default and will match table cell borders and Divider color.

### Position

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `position` | `'absolute'`, `'fixed'`, `'relative'`, `'static'`, `'sticky'` | `position` |
| `inset` | `0`–`9` or `'auto'` | `inset` |
| `top` | `0`–`9` or `'auto'` | `top` |
| `right` | `0`–`9` or `'auto'` | `right` |
| `bottom` | `0`–`9` or `'auto'` | `bottom` |
| `left` | `0`–`9` or `'auto'` | `left` |

### Overflow

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `overflow` | `'visible'`, `'hidden'`, `'auto'`, `'scroll'`, `'clip'` | `overflow` |
| `overflowX` | `'visible'`, `'hidden'`, `'auto'`, `'scroll'`, `'clip'` | `overflow-x` |
| `overflowY` | `'visible'`, `'hidden'`, `'auto'`, `'scroll'`, `'clip'` | `overflow-y` |

### Flex child

Use these when Box is a direct child of Flex.

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `flexGrow` | number | `flex-grow` |
| `flexShrink` | number | `flex-shrink` |
| `flexBasis` | string | `flex-basis` |

### Grid child

Use these when Box is a direct child of Grid.

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `gridColumn` | string | `grid-column` |
| `gridColumnStart` | string | `grid-column-start` |
| `gridColumnEnd` | string | `grid-column-end` |
| `gridRow` | string | `grid-row` |
| `gridRowStart` | string | `grid-row-start` |
| `gridRowEnd` | string | `grid-row-end` |

> See the "Inline style overrides" section for the full inline style lookup guide, including workarounds for Card, Stack, and Button.

## Inline style alternatives

Most inline styles are not needed for Box. Use the alternatives below when considering an inline style.

| Inline style | Alternative |
|--------------|-----------------|
| `<Box style={{ width: '100%' }} ... >` | Use `<Box width="100%" ... >` |
| `<Box style={{ minWidth: '100%' }} ... >` | Use `<Box minWidth="100%" ... >` |
| `<Box style={{ maxWidth: '260px' }} ... >` | Use `<Box maxWidth="260px" ... >` |
| `<Box style={{ height: '100%' }} ... >` | Use `<Box height="100% ... >` |
| `<Box style={{ minHeight: '0' }} ... >` | Use `<Box minHeight="0" ... >` |
| `<Box style={{ maxHeight: '100vh' }} ... >` | Use `<Box maxHeight="100vh" ... >` |
| `<Box style={{ overflow: 'hidden' }} ... >` | Use `<Box overflow="hidden ... >` |
| `<Box style={{ flexShrink: 0 }} ... >` | Use `<Box flexShrink={0} ... >` |
| `<Box style={{ flexGrow: 0 }} ... >` | Use `<Box flexGrow={1} ... >` |
| `<Box style={{ borderRadius: '50%'}} ... >` | Use <Box radius="full" ... >` |
| `<Box style={{ flex: 1 }} ... >` | Use `<Box flexGrow={1} flexShrink={1} flexBasis="0%"  ... >` |
| `<Box style={{ margin: '0 16px' }} ... >` | Use `<Box marginY={0} marginX={4} ... >` |
| `<Box style={{ flex: 0 0 260px }} ... >` | Use `<Box flexGrow={0} flexShrink={0} flexBasis="260px"  ... >` |
| `<Box style={{ position: "sticky" }} ... >` | `<Box position="sticky" ... >` |
| `<Box style={{ background: '#f5f5f5' }} ... >` | Use `<Box tone="neutral" ... >` |
| `<Box style={{ textAlign: 'center' }} ...>` | Use `<Flex justifyContent="center ... >` |
| `<Box style={{ display: 'flex' }} ...> | Use `<Flex ... >` |
| `<Box tone="primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} ...>` | Use `<Box tone="primary"><Flex alignItems="center" justifyContent="center">` |
| `<Box style={{ color: 'var(--card-fg-color)' }} ... ><HomeIcon /></Box>` | Use `<Text color="neutral"><HomeIcon /</Text>` |

# Flex

Under review

Used as the lowest-level building block for laying out UI elements.

Warning:  `Flex` uses `gap`. `Stack` uses `space`. These are not the same prop. Using `space` on `Flex` silently does nothing.

### API

Flex's own props are `as`, `display`, and the flex-parent + gap props below. Everything else it accepts comes from shared layout props inherited from Box.

**Component props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | React element type | `'div'` | HTML element to render (e.g. `as="main"`, `as="nav"`) |
| `display` | `'flex'`, `'inline-flex'`, `'none'` | — | CSS `display` property |

**Flex-specific props:**

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `flexDirection` | `'row'`, `'row-reverse'`, `'column'`, `'column-reverse'` | `flex-direction` |
| `flexWrap` | `'wrap'`, `'wrap-reverse'`, `'nowrap'` | `flex-wrap` |
| `alignItems` | `'baseline'`, `'center'`, `'flex-end'`, `'flex-start'`, `'stretch'` | `align-items` |
| `justifyContent` | `'flex-start'`, `'flex-end'`, `'center'`, `'space-between'`, `'space-around'`, `'space-evenly'` | `justify-content` |
| `gap` | `0`–`9` | `gap` |
| `rowGap` | `0`–`9` | `row-gap` |
| `columnGap` | `0`–`9` | `column-gap` |

All props support responsive arrays (e.g. `flexDirection={['column', null, 'row']}`). Flex also inherits shared layout props — see **All available props** at the bottom for the full list.

### **Usage guidelines**

**When to use:**

- To stack items vertically or horizontally. Flex defaults to horizontal direction.  
- To control alignment: center children, space them apart, or push one to the end.  
- To lay items in a column with alignment or wrap control. Use `direction="column"` when you need more control than Stack provides.  
- To create responsive layouts that change direction at breakpoints: `direction={['column', , 'row']}`.

**When not to use:**

- To stack items in a simple vertical column with even spacing. Use **Stack** instead — it is simpler and locks direction to vertical.  
- To create a two-axis grid. Use **Grid** instead.  
- To wrap a single child with spacing or visual styling. Use **Box** instead.  
- To flow inline items that wrap to the next line. Use **Inline** instead.

#### **Choosing between Box, Flex, Grid, Stack, Inline, and Container:**

| Component | Dimensions | Adds visual styling | Use case |
| :---- | :---- | :---- | :---- |
| Box | Spacing and structure | Yes (background and, border) | Wrapping elements with padding or margin |
| Flex | One-dimensional (row or column) | Yes (background and, border) | Toolbars, split layouts, aligned groups of elements |
| Grid | Two-dimensional (rows \+ columns) | Yes (background and, border) | Card grids, dashboards, aligned column layouts |
| Stack | One-dimensional (column only) | No | Vertical sequences of elements with uniform spacing |
| Inline | One-dimensional (wrapping row) | No | Badges, Buttons, or any set of variable-width items that wrap |
| Container | Centered column | No | Constraining content width and centering it |

### **Best practices**

**Do**

- **Set `flexWrap="wrap"` on every Flex with two or more children.** This is required for WCAG 1.4.10 AA (Reflow at 320px). A single non-wrapping Flex causes the page to overflow on narrow viewports. This includes outer layout containers, toolbar rows, and action rows inside cards.
- Bias towards horizontally start-aligned content over center alignment. Most interface elements with Sanity are start aligned–most notably menus and navigational elements. Only use center alignment to create visual distinction/emphasis–such as an empty state.
- Consider responsive breakpoints when stacking items horizontally. If the number of items can vary, pair `flexWrap="wrap"` with `gap={2}` to prevent clipping and maintain spacing.

**Don't**
- Don't use inline styles to create specific UI elements. If you find yourself setting `width`, `height`, `borderRadius`, `background`, `color`, `fontSize`, `fontWeight`, or `cursor` as inline styles on a `Flex` or `Box`, stop. You're likely reinventing a component that already exists. Check whether `Avatar`, `Badge`, `Button`, or `Card` with appropriate props covers your use case. See "All available props" at the bottom for the complete reference.
- Don't rely on `row-reverse` or `column-reverse` as a way to change sort order or logical order of items. These direction settings only change the visual layer. They will not impact tab index or how screen readers interpret Flex items.  
- Don’t add onClick to Flex. Flex is not intended to be an interactive element.

### Content

- **Flex does not set text styles.** Flex provides layout along an axis. It does not set font size, line height, weight, or color. Use Text, Heading, or Label for text styling.

### Accessibility

- **Layout only.** Flex provides layout along an axis. It does not add keyboard handling, focus management, or ARIA state. If you render Flex as a semantic element via `as`, you are responsible for the behavior that element requires.  
- **Semantic elements via `as`.** Flex accepts an `as` prop. Use it to render semantic HTML when the content requires it:  
  - `as="nav"` — requires `aria-label` when more than one `<nav>` exists on the page (WCAG 1.3.1 A).  
  - `as="section"` — requires a heading child or `aria-label` to register as a landmark (WCAG 1.3.1 A).  
  - `as="form"` — requires an accessible name via `aria-label`, `aria-labelledby`, or `<legend>` (WCAG 1.3.1 A).  
  - `as="main"` — should appear once per page.  
  - `as="aside"` — should have `aria-label` when the role is not clear from context.  
- **Behavioral elements.** Do not use `as` to render `<button>`, `<dialog>`, `<select>`, `<details>`, `<summary>`, or `<fieldset>`. Flex does not fulfill the keyboard, focus, or ARIA contracts those elements require (WCAG 4.1.2 A). Use the matching Sanity UI component instead.  
- **Lists.** When rendering `as="ul"` or `as="ol"`, add `role="list"` if `list-style: none` is applied. WebKit strips list semantics without it (WCAG 1.3.1 A). Children must be `<li>` elements.  
- **Visual-to-DOM order.** Do not use `flex-direction: row-reverse` or `flex-direction: column-reverse` when children contain interactive or readable content. Do not use CSS `order` on Flex children. Screen readers and keyboard navigation follow DOM order, not visual order (WCAG 1.3.2 A, WCAG 2.4.3 A). If visual reordering cannot be avoided, confirm the DOM order produces a logical reading sequence.  
- **Reflow at 320px.** Layouts built with Flex must work at 320px viewport width without horizontal scrolling (WCAG 1.4.10 AA). **Every Flex with more than one child must have `flexWrap="wrap"`.** This includes the outer layout Flex, toolbar rows, action rows inside cards, and any other horizontal grouping. A single non-wrapping Flex causes the page to overflow. Avoid fixed `px` widths on Flex children — use percentage-based or `flex-grow` sizing. Flex spacing tokens use `rem` and scale with user font-size settings (WCAG 1.4.12 AA).  
    
  **Reflow checklist** — confirm each before shipping:  
    
  - [ ] Outer layout Flex has `flexWrap="wrap"`  
  - [ ] Toolbar Flex (heading \+ buttons) has `flexWrap="wrap"` and `gap={2}`  
  - [ ] Actions row inside each Card has `flexWrap="wrap"`  
  - [ ] No Flex child uses a fixed `px` width without a `maxWidth` fallback  
  - [ ] Outer Flex uses `minHeight`, not `height`

### Code examples

#### General layout patterns
```jsx
{/* Horizontal row — space between */}
<Flex alignItems="center" justifyContent="space-between" gap={3}>
  <Heading level={1}>Title</Heading>
  <Button text="Action" />
</Flex>

{/* Wrapping toolbar row (for responsive reflow) */}
<Flex alignItems="center" flexWrap="wrap" gap={2}>
  {/* items wrap to next line at narrow widths */}
</Flex>

{/* Vertical column (sidebar, main area) */}
<Flex flexDirection="column" flexGrow={1} overflow="hidden">
  <Box padding={3} borderBottom>{/* toolbar */}</Box>
  <Box flexGrow={1} overflowY="auto">{/* scrollable content */}</Box>
</Flex>

{/* Full-height two-panel layout */}
<Flex minHeight="100vh">
  <Box as="nav" aria-label="Main navigation" borderRight flexGrow={0} flexShrink={0} flexBasis="260px">{/* sidebar */}</Box>
  <Flex flexDirection="column" flexGrow={1} minWidth="0">{/* main */}</Flex>
</Flex>
```

#### Full-height app shell layout

The most common Studio-like layout pattern. Critical details: use `minHeight` (not `height`) on the outer container, and `minWidth="0"` on flex children to prevent overflow.
```jsx
// Box and Flex come from ui — NOT from @sanity/ui
import { Box, Flex } from 'ui'

<Flex minHeight="100vh">
  {/* Sidebar — fixed width, full height */}
  <Box
    as="nav"
    aria-label="Main navigation"
    borderRight
    width="260px"
    flexShrink={0}
    overflowY="auto"
  >
    {/* nav content */}
  </Box>

  {/* Main — fills remaining width, scrolls internally */}
  <Flex
    as="main"
    flexDirection="column"
    flexGrow={1}
    minWidth="0"       {/* prevents flex child from overflowing */}
    overflow="hidden"
  >
    <Box padding={3} borderBottom>{/* toolbar */}</Box>
    <Box flexGrow={1} overflowY="auto" padding={4}>{/* content */}</Box>
  </Flex>
</Flex>
```

#### Empty state
```jsx
{/* ✓ Empty state — minHeight as named prop, no style={} needed */}
<Flex
  alignItems="center"
  justifyContent="center"
  flexDirection="column"
  minHeight="300px"
  gap={3}
  <Text muted>No documents yet</Text>
  <Button text="Create document" icon={AddIcon} />
</Flex>
```

#### Anti-patterns

```jsx
{ /* ✗ Don't use inline margin styles to move elements around Flex */ }
<Flex alignItems="center">
  <Text>Label</Text>
  <Box style={{marginLeft: "auto"}}>
    <Badge tone="positive">Published</Badge>
  </Box>
</Flex>

{ /* ✓ To push an element to the far end of a Flex row, use `marginLeft="auto"` on the Box: */ }
<Flex alignItems="center">
  <Text>Label</Text>
  <Box marginLeft="auto">
    <Badge tone="positive">Published</Badge>
  </Box>
</Flex>
```

```jsx
{/* ✗ Don't use inline styles to set visual attributes */}
<Flex
  alignItems="center"
  justifyContent="center"
  style={{
    width: 28,
    height: 28,
    borderRadius: "50%",
    fontSize: 12,
    color: "red"
    border: "1px solid #868686"
    }}
  ><Text>AJ</Text>
</Flex>
  
{/* ✓ Work within the system's structure */}
<Box width="28px" height="28px" radius="full" border={true}>
  <Flex 
    width="100%" 
    height="100%"
    alignItems="center"
    justifyContent="center"
    >
    <Text tone="critical">AJ</Text>
  </Flex>
</Box>
```

### CSS custom properties and Card context

> **`--card-bg`, `--card-border-color`, `--card-color` and other `--card-*` variables are only available inside a `Card` ancestor.** `Card` establishes the color context — it writes these CSS custom properties onto its DOM subtree. Using them in a `Flex` (or any element) outside a `Card` ancestor produces undefined values and no visual effect.
>
> If you need a themed container without Card's visible surface, use `Card` with `border={false}`. Don't reference `--card-*` variables from a raw `Flex`.

## All available props

Every prop available on Flex. All props are optional and support responsive arrays.

### Component

| Prop | Type | Default | CSS equivalent |
|------|------|---------|----------------|
| `as` | React element type | `'div'` | — |
| `display` | `'flex'`, `'inline-flex'`, `'none'` | — | `display` |

### Flex parent

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `flexDirection` | `'row'`, `'row-reverse'`, `'column'`, `'column-reverse'` | `flex-direction` |
| `flexWrap` | `'wrap'`, `'wrap-reverse'`, `'nowrap'` | `flex-wrap` |
| `alignItems` | `'baseline'`, `'center'`, `'flex-end'`, `'flex-start'`, `'stretch'` | `align-items` |
| `justifyContent` | `'flex-start'`, `'flex-end'`, `'center'`, `'space-between'`, `'space-around'`, `'space-evenly'` | `justify-content` |

### Gap

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `gap` | `0`–`9` | `gap` |
| `rowGap` | `0`–`9` | `row-gap` |
| `columnGap` | `0`–`9` | `column-gap` |

### Tone

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `tone` | `'default'`, `'neutral'`, `'primary'`, `'suggest'`, `'positive'`, `'caution'`, `'critical'` | background tint |

**Tone background tokens (light mode):** `default` → `var(--gray-50)` · `neutral` → `var(--gray-100)` · `primary` → `var(--blue-50)` · `suggest` → `var(--purple-50)` · `positive` → `var(--green-50)` · `caution` → `var(--yellow-50)` · `critical` → `var(--red-50)`

### Padding

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `padding` | `0`–`9` | `padding` |
| `paddingX` | `0`–`9` | `padding-left` + `padding-right` |
| `paddingY` | `0`–`9` | `padding-top` + `padding-bottom` |
| `paddingTop` | `0`–`9` | `padding-top` |
| `paddingRight` | `0`–`9` | `padding-right` |
| `paddingBottom` | `0`–`9` | `padding-bottom` |
| `paddingLeft` | `0`–`9` | `padding-left` |

### Margin

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `margin` | `0`–`9` or `'auto'` | `margin` |
| `marginX` | `0`–`9` or `'auto'` | `margin-left` + `margin-right` |
| `marginY` | `0`–`9` or `'auto'` | `margin-top` + `margin-bottom` |
| `marginTop` | `0`–`9` or `'auto'` | `margin-top` |
| `marginRight` | `0`–`9` or `'auto'` | `margin-right` |
| `marginBottom` | `0`–`9` or `'auto'` | `margin-bottom` |
| `marginLeft` | `0`–`9` or `'auto'` | `margin-left` |

### Sizing

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `width` | string | `width` |
| `minWidth` | string | `min-width` |
| `maxWidth` | string | `max-width` |
| `height` | string | `height` |
| `minHeight` | string | `min-height` |
| `maxHeight` | string | `max-height` |

### Border

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `border` | boolean | 1px border on all sides |
| `borderTop` | boolean | `border-top` |
| `borderRight` | boolean | `border-right` |
| `borderBottom` | boolean | `border-bottom` |
| `borderLeft` | boolean | `border-left` |
| `radius` | `0`–`6` or `'full'` | `border-radius` |

### Position

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `position` | `'absolute'`, `'fixed'`, `'relative'`, `'static'`, `'sticky'` | `position` |
| `inset` | `0`–`9` or `'auto'` | `inset` |
| `top` | `0`–`9` or `'auto'` | `top` |
| `right` | `0`–`9` or `'auto'` | `right` |
| `bottom` | `0`–`9` or `'auto'` | `bottom` |
| `left` | `0`–`9` or `'auto'` | `left` |

### Overflow

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `overflow` | `'visible'`, `'hidden'`, `'auto'`, `'scroll'`, `'clip'` | `overflow` |
| `overflowX` | `'visible'`, `'hidden'`, `'auto'`, `'scroll'`, `'clip'` | `overflow-x` |
| `overflowY` | `'visible'`, `'hidden'`, `'auto'`, `'scroll'`, `'clip'` | `overflow-y` |

### Flex child

Use these when Flex is itself a direct child of another Flex.

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `flexGrow` | number | `flex-grow` |
| `flexShrink` | number | `flex-shrink` |
| `flexBasis` | string | `flex-basis` |

### Grid child

Use these when Flex is a direct child of Grid.

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `gridColumn` | string | `grid-column` |
| `gridColumnStart` | string | `grid-column-start` |
| `gridColumnEnd` | string | `grid-column-end` |
| `gridRow` | string | `grid-row` |
| `gridRowStart` | string | `grid-row-start` |
| `gridRowEnd` | string | `grid-row-end` |



## Inline style alternatives

Most inline styles are not needed for Flex. Use the alternatives below when considering an inline style.

| Inline style | Alternative |
|--------------|-----------------|
| `<Flex style={{ width: '100%' }} ... >` | Use `<Flex width="100%" ... >` |
| `<Flex style={{ maxWidth: '260px' }} ... >` | Use `<Flex maxWidth="260px" ... >` |
| `<Flex style={{ height: '100%' }} ... >` | Use `<Flex height="100% ... >` |
| `<Flex style={{ minHeight: '100vh' }} ... >` | Use `<Flex minHeight="100vh" ... >` |
| `<Flex style={{ overflow: 'hidden' }} ... >` | Use `<Flex overflow="hidden ... >` |
| `<Flex style={{ flexWrap: 'wrap' }} ... >` | Use `<Flex flexWrap="wrap" ... >` |
| `<Flex style={{ flex: 1 }} ... >` | Use `<Flex flexGrow="1" flexShrink="1" flexBasis="0%"  ... >` |
| `<Flex style={{ flex: 0 0 260px }} ... >` | Use `<Flex flexGrow="0" flexShrink="0" flexBasis="260px"  ... >` |
| `<Flex style={{ background: '#f5f5f5' }} ... >` | Use `<Flex tone="neutral" ... >` |
| `<Flex style={{ display: 'grid' }} ...>` | Use `<Grid ... >` |

# Grid

Under review

Renders a grid layout container.

### API

Grid's own props are `as`, `display`, and the grid-parent + gap props below. Everything else it accepts comes from shared layout props inherited from Box.

**Component props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | React element type | `'div'` | HTML element to render |
| `display` | `'grid'`, `'inline-grid'`, `'none'` | — | CSS `display` property |

**Grid-specific props:**

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `gridAutoFlow` | `'row'`, `'column'`, `'row dense'`, `'column dense'`, `'dense'` | `grid-auto-flow` |
| `gridAutoColumns` | string | `grid-auto-columns` |
| `gridAutoRows` | string | `grid-auto-rows` |
| `gridTemplateColumns` | string | `grid-template-columns` |
| `gridTemplateRows` | string | `grid-template-rows` |
| `gap` | `0`–`9` | `gap` |
| `rowGap` | `0`–`9` | `row-gap` |
| `columnGap` | `0`–`9` | `column-gap` |

All props support responsive arrays (e.g. `gridTemplateColumns={['1fr', '1fr 1fr', 'repeat(3, 1fr)']}`). Grid also inherits shared layout props — see **All available props** at the bottom of this document for the complete reference.

### **Usage guidelines**

**When to use:**

- To display non-tabular content in multiple rows and columns   
- To build fixed-column layouts where items should align on a shared grid (dashboards, card grids, settings panels)  
- When you need precise control over row and column sizing, spanning, or placement  
- To implement responsive multi-column layouts where the number of columns changes at different breakpoints

**When not to use:**

- When content flows in a single direction. Use **Flex** for a flexible one-dimensional, vertical/horizontal layout. Use **Stack/Inline** for a vertical/horizontal layout with more opinionated defaults.  
- When you need inline wrapping of variable-width items (ex: badges, buttons, etc.). Use **Inline** instead.  
- When you need to constrain and center content at a max width. Use **Container** — it sets `max-width` and centers itself.

#### **Choosing between Box, Flex, Grid, Stack, Inline, and Container:**

| Component | Dimensions | Adds visual styling | Use case |
| :---- | :---- | :---- | :---- |
| Box | Spacing and structure | Yes (background and, border) | Wrapping elements with padding or margin |
| Flex | One-dimensional (row or column) | Yes (background and, border) | Toolbars, split layouts, aligned groups of elements |
| Grid | Two-dimensional (rows \+ columns) | Yes (background and, border) | Card grids, dashboards, aligned column layouts |
| Stack | One-dimensional (column only) | No | Vertical sequences of elements with uniform spacing |
| Inline | One-dimensional (wrapping row) | No | Badges, Buttons, or any set of variable-width items that wrap |
| Container | Centered column | No | Constraining content width and centering it |

### **Best practices**

**Do**

- Use `gridTemplateColumns` with `repeat()` and `minmax()` or `fr` units to build layouts that adapt gracefully to available space  
- Use the responsive prop array (e.g. `gridTemplateColumns={["1fr", "1fr 1fr", "repeat(3, 1fr)"]}`) to adjust column count at breakpoints instead of writing media queries by hand  
- Use `gap` (or `gapX` / `gapY`) over padding or margin on children to control spacing between grid cells  
- Prefer `gridColumn` and `gridRow` on child Box elements to span items across cells, keeping placement logic close to the content that needs it

**Don't**
- Don't use `style` to adjust visual attributes of `Grid` when a style prop exists. Using `style` should be reserved for unsupported CSS rules. See "All available props" at the bottom of this document for the complete reference.
- Don't use CSS `order`, `gridColumn`, or `gridRow` to visually reorder items away from their DOM order. Screen readers and keyboard navigation follow DOM order, not visual order — reordering with CSS silently breaks reading and focus sequence for non-sighted users (WCAG 1.3.2 A).  
- Don't hardcode pixel values in `gridTemplateColumns` or `gridTemplateRows` when `fr`, `minmax()`, or `auto` would give you a more resilient layout.

### Accessibility

- **Layout only.** Flex provides layout along an axis. It does not add keyboard handling, focus management, or ARIA state. If you render Flex as a semantic element via `as`, you are responsible for the behavior that element requires.  
- **Semantic elements via `as`.** Flex accepts an `as` prop. Use it to render semantic HTML when the content requires it:  
  - `as="nav"` — requires `aria-label` when more than one `<nav>` exists on the page (WCAG 1.3.1 A).  
  - `as="section"` — requires a heading child or `aria-label` to register as a landmark (WCAG 1.3.1 A).  
  - `as="form"` — requires an accessible name via `aria-label`, `aria-labelledby`, or `<legend>` (WCAG 1.3.1 A).  
  - `as="main"` — should appear once per page.  
  - `as="aside"` — should have `aria-label` when the role is not clear from context.  
- **Behavioral elements.** Do not use `as` to render `<button>`, `<dialog>`, `<select>`, `<details>`, `<summary>`, or `<fieldset>`. Flex does not fulfill the keyboard, focus, or ARIA contracts those elements require (WCAG 4.1.2 A). Use the matching Sanity UI component instead.  
- **Lists.** When rendering `as="ul"` or `as="ol"`, add `role="list"` if `list-style: none` is applied. WebKit strips list semantics without it (WCAG 1.3.1 A). Children must be `<li>` elements.  
- **Visual-to-DOM order.** Do not use `flex-direction: row-reverse` or `flex-direction: column-reverse` when children contain interactive or readable content. Do not use CSS `order` on Flex children. Screen readers and keyboard navigation follow DOM order, not visual order (WCAG 1.3.2 A, WCAG 2.4.3 A). If visual reordering cannot be avoided, confirm the DOM order produces a logical reading sequence.  
- **Reflow at 320px.** Layouts built with Flex must work at 320px viewport width without horizontal scrolling (WCAG 1.4.10 AA). **Every Flex with more than one child must have `wrap="wrap"`.** This includes the outer layout Flex, toolbar rows, action rows inside cards, and any other horizontal grouping. A single non-wrapping Flex causes the page to overflow. Avoid fixed `px` widths on Flex children — use percentage-based or `flex-grow` sizing. Flex spacing tokens use `rem` and scale with user font-size settings (WCAG 1.4.12 AA).  
    
  **Reflow checklist** — confirm each before shipping:  
    
  - [ ] Outer layout Flex has `wrap="wrap"`  
  - [ ] Toolbar Flex (heading \+ buttons) has `wrap="wrap"` and `gap={2}`  
  - [ ] Actions row inside each Card has `wrap="wrap"`  
  - [ ] No Flex child uses a fixed `px` width without a `maxWidth` fallback  
  - [ ] Outer Flex uses `minHeight`, not `height`

### Content

- **Grid does not set text styles.** Grid provides spatial structure. It does not set font size, line height, weight, or color. Use Text, Heading, or Label inside grid cells for text styling.

### Accessibility
- **Layout only.** Grid provides spatial structure. It does not add keyboard handling, focus management, or ARIA state. If you render Grid as a semantic element via `as`, you are responsible for the behavior that element requires.  
- **Visual-to-DOM order.** This is the most important accessibility concern for Grid. CSS grid placement (`gridColumn`, `gridRow`, `gridAutoFlow: "column dense"`) can visually reorder items without touching the DOM. Screen readers and keyboard users follow DOM order, not visual order. Never use grid placement to change the logical reading or focus sequence — keep visual order and DOM order in sync (WCAG 1.3.2 A).  
- **`dense` packing.** `gridAutoFlow: "row dense"` and `"column dense"` fill holes in the grid by pulling later items forward. This produces a visual order that can diverge significantly from DOM order. Only use dense packing for purely decorative or non-interactive content (e.g., image mosaics) where reading order does not matter.  
- **Semantic elements via `as`.** Grid accepts an `as` prop. Use it to render semantic HTML when the content requires it. Requirements are the same as Box: `as="ul"` requires `<li>` children and `role="list"` when `list-style: none` is applied; `as="nav"` requires `aria-label` when more than one `<nav>` exists on the page; `as="section"` requires a heading or `aria-label` to register as a landmark (WCAG 1.3.1 A).  
- **Reflow.** Grid layouts must reflow to a single column at 320 CSS pixels viewport width without horizontal scrolling. Use responsive `gridTemplateColumns` values to reduce column count at small breakpoints rather than enforcing a fixed multi-column layout (WCAG 1.4.10 AA).  
- **Spacing and zoom.** Grid gap tokens use `rem` units and scale with the user's font-size setting. Do not use fixed `px` values for gap or sizing where token values exist — fixed values break spacing proportionality at large text sizes.  
- **Interactive grid patterns.** If Grid is used to construct an interactive widget (e.g., a calendar, data grid, or color picker), it must implement the appropriate WAI-ARIA pattern (e.g., `role="grid"` with `role="row"` and `role="gridcell"` children, roving tabindex, and full keyboard navigation). Grid the component does not provide any of this — you must build it. See the WAI-ARIA Authoring Practices Guide for the `grid` pattern.

## All available props

Every prop available on Grid. All props are optional and support responsive arrays.

### Component

| Prop | Type | Default | CSS equivalent |
|------|------|---------|----------------|
| `as` | React element type | `'div'` | — |
| `display` | `'grid'`, `'inline-grid'`, `'none'` | — | `display` |

### Grid parent

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `gridAutoFlow` | `'row'`, `'column'`, `'row dense'`, `'column dense'`, `'dense'` | `grid-auto-flow` |
| `gridAutoColumns` | string | `grid-auto-columns` |
| `gridAutoRows` | string | `grid-auto-rows` |
| `gridTemplateColumns` | string | `grid-template-columns` |
| `gridTemplateRows` | string | `grid-template-rows` |

### Gap

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `gap` | `0`–`9` | `gap` |
| `rowGap` | `0`–`9` | `row-gap` |
| `columnGap` | `0`–`9` | `column-gap` |

### Tone

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `tone` | `'default'`, `'neutral'`, `'primary'`, `'suggest'`, `'positive'`, `'caution'`, `'critical'` | background tint |

### Padding

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `padding` | `0`–`9` | `padding` |
| `paddingX` | `0`–`9` | `padding-left` + `padding-right` |
| `paddingY` | `0`–`9` | `padding-top` + `padding-bottom` |
| `paddingTop` | `0`–`9` | `padding-top` |
| `paddingRight` | `0`–`9` | `padding-right` |
| `paddingBottom` | `0`–`9` | `padding-bottom` |
| `paddingLeft` | `0`–`9` | `padding-left` |

### Margin

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `margin` | `0`–`9` or `'auto'` | `margin` |
| `marginX` | `0`–`9` or `'auto'` | `margin-left` + `margin-right` |
| `marginY` | `0`–`9` or `'auto'` | `margin-top` + `margin-bottom` |
| `marginTop` | `0`–`9` or `'auto'` | `margin-top` |
| `marginRight` | `0`–`9` or `'auto'` | `margin-right` |
| `marginBottom` | `0`–`9` or `'auto'` | `margin-bottom` |
| `marginLeft` | `0`–`9` or `'auto'` | `margin-left` |

### Sizing

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `width` | string | `width` |
| `minWidth` | string | `min-width` |
| `maxWidth` | string | `max-width` |
| `height` | string | `height` |
| `minHeight` | string | `min-height` |
| `maxHeight` | string | `max-height` |

### Border

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `border` | boolean | 1px border on all sides |
| `borderTop` | boolean | `border-top` |
| `borderRight` | boolean | `border-right` |
| `borderBottom` | boolean | `border-bottom` |
| `borderLeft` | boolean | `border-left` |
| `radius` | `0`–`6` or `'full'` | `border-radius` |

### Position

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `position` | `'absolute'`, `'fixed'`, `'relative'`, `'static'`, `'sticky'` | `position` |
| `inset` | `0`–`9` or `'auto'` | `inset` |
| `top` | `0`–`9` or `'auto'` | `top` |
| `right` | `0`–`9` or `'auto'` | `right` |
| `bottom` | `0`–`9` or `'auto'` | `bottom` |
| `left` | `0`–`9` or `'auto'` | `left` |

### Overflow

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `overflow` | `'visible'`, `'hidden'`, `'auto'`, `'scroll'`, `'clip'` | `overflow` |
| `overflowX` | `'visible'`, `'hidden'`, `'auto'`, `'scroll'`, `'clip'` | `overflow-x` |
| `overflowY` | `'visible'`, `'hidden'`, `'auto'`, `'scroll'`, `'clip'` | `overflow-y` |

### Flex child

Use these when Grid is itself a direct child of Flex.

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `flexGrow` | number | `flex-grow` |
| `flexShrink` | number | `flex-shrink` |
| `flexBasis` | string | `flex-basis` |

### Grid child

Use these when Grid is nested inside another Grid.

| Prop | Type | CSS equivalent |
|------|------|----------------|
| `gridColumn` | string | `grid-column` |
| `gridColumnStart` | string | `grid-column-start` |
| `gridColumnEnd` | string | `grid-column-end` |
| `gridRow` | string | `grid-row` |
| `gridRowStart` | string | `grid-row-start` |
| `gridRowEnd` | string | `grid-row-end` |

# Divider

Renders a horizontal rule that marks a thematic break between sections of content.

## Props

Divider accepts no props. It renders a single `<hr>` element with no configuration.

### **Usage guidelines**

#### **When to use:**

- To visually and semantically separate sections of logically distinct content within a vertical layout
- Between groups of items in a list or menu where a clear boundary aids scanning
- To mark a thematic shift in content — for example, between a primary action group and a destructive action in a panel

#### **When not to use:**

- As a spacing tool. A Divider adds a visible line, not space. Use Stack's `space` prop to add vertical spacing between elements.
- To add a border to the bottom of a container (such as a toolbar or nav header). Use `borderBottom` on Box instead — it is part of the container's own styling, not a thematic break in the content flow.
- When the line is purely decorative and carries no meaning. The `<hr>` element announces a thematic break to screen readers. If no break is intended, use a CSS border or Box with `borderBottom` instead.

#### **Choosing between Divider and Box borderBottom:**

| | **Divider** | **Box borderBottom** |
| :---- | :---- | :---- |
| **Renders as** | `<hr>` — a thematic break between sibling content | A border on a containing element |
| **Semantics** | Announces a content boundary to screen readers | No additional semantics |
| **Sits** | Between siblings in a content flow | On the outside edge of a container |
| **Use case** | Separating content items within a Stack | Separating a toolbar or header from the content below it |

### **Best practices**

#### **Do**

- Place Divider between logically distinct content groups — for example, between a metadata section and an actions section within a panel
- Use Divider inside a Stack so that spacing on either side of the rule is consistent with surrounding content

#### **Don't**

- Don't use Divider as a substitute for spacing. Wrap content in a Stack with appropriate `space` instead.
- Don't use Divider at the very top or bottom of a container to create an edge border. Use `borderTop` or `borderBottom` on Box or Card instead.
- Don't add multiple consecutive Dividers. If you need more visual separation, increase the Stack `space` value or restructure the content into distinct sections.

### Accessibility

- **Semantic thematic break.** Divider renders as `<hr>`, which carries the implicit ARIA role `separator`. Screen readers announce it as a thematic break. Use it only when the content on either side is genuinely distinct — not for purely visual spacing.
- **Not interactive.** Divider is not focusable and has no keyboard interaction. Do not add `onClick` or other event handlers to it.
- **Do not suppress semantics.** Do not override the `<hr>` role with `role="presentation"` or `aria-hidden="true"` unless the line is genuinely decorative. If the line is decorative, use a CSS border or Box with `borderBottom` instead of Divider.
- **Does not create landmarks.** Unlike `<section>` or `<nav>`, `<hr>` does not create an ARIA landmark. Screen reader users navigating by landmarks will not stop at a Divider. Use it for in-flow separation only, not as a structural navigation aid.


### Code examples
```
{/* Use `<Divider>` for horizontal separators between navigation groups.** It uses `var(--card-border-color)` automatically and handles spacing: /* }
```tsx
<Stack space={2}>
  <Stack space={1}>
    <Text size={1} weight="semibold" muted>Content</Text>
    {contentItems.map(item => <NavItem key={item.id} {...item} />)}
  </Stack>
  <Divider />
  <Stack space={1}>
  <Text size={1} weight="semibold" muted>System</Text>
    {systemItems.map(item => <NavItem key={item.id} {...item} />)}
  </Stack>
</Stack>
```

# Stack



Arranges children in a single vertical column with consistent spacing between them.

[Figma component](https://www.figma.com/design/5mhVqXlldJEEB2VWZeKQ4i/%F0%9F%A7%AC-Sanity-UI?node-id=29358-183&m=dev) · [React component](https://github.com/sanity-io/ui/blob/v4-beta/packages/ui/src/primitives/stack/Stack.tsx)

### API documentation

_Refer to TypeDocs in Flex.tsx_

### Usage guidelines

**When to use:**

- To arrange items in a vertical column with even spacing. Examples: form fields, card lists, content blocks.
- To stack related content where each child spans the full width of the parent.
- To create vertical rhythm in a section without writing custom CSS.

**When not to use:**

- To lay out items with custom spaces, alignment, and/or wrapping values. Use Flex instead.
- To create a two-axis grid of items. Use **Grid** instead.
- To flow inline items that wrap to the next line. Use **Inline** instead.
- To wrap a single child with no spacing needs. Use **Box** instead.
- To create overlapping layers on the z-axis. Use CSS `position` and `z-index` instead. Stack does not layer items — it lines them up in sequence.

Before using `style={{...}}` on a Box wrapping Stack, check `style-overrides.md`. Most layout values have prop-based options.

> ⚠️ **Text inside Stack must use `as="p"`.** The Text component defaults to `as="span"` (inline). Multiple inline spans inside a Stack crowd together instead of stacking vertically. Set `as="p"` on each Text element used as block-level content inside a Stack. See `text.md` → Common patterns.

### Best practices

**Do**

- Use `space` to control spacing. Stack is built for this. Avoid adding margins to children.
- Match `space` to content density. Use `1`–`2` for tightly grouped items. Use `3`–`4` for distinct siblings. Use `5`+ for section-level breaks.
- Set `as="ul"` or `as="ol"` when children form a list. Add `role="list"` and wrap each child in an `<li>`. See the accessibility section for details.
- Set `as="nav"` when children form a set of navigation links.
- Nest Stacks to create grouped layouts. A form can use an outer Stack with `space={5}` for field groups, and inner Stacks with `space={2}` for label-input pairs.

**Don't**

- Don't add `margin-bottom` or `margin-top` to children to create spacing. Use `space` on the Stack. Manual margins conflict with the grid space and cause uneven results.
- Don't set `as` to a semantic element without meeting its contract. A `<nav>` needs navigation links. A `<fieldset>` needs a `<legend>`. A `<section>` needs a heading. See the accessibility section.
- Don't use `as="button"` or `as="dialog"` on Stack. Stack provides layout, not behavior. Use the **Button** or **Dialog** components for those roles.
- Don't reorder children with CSS `order`. This breaks the link between visual order and DOM order, which harms screen reader and keyboard users.

### Variants

#### Space

`space` sets the vertical space between children. Values map to the spacing scale. The prop accepts responsive values.

| **Value** | **Size** | **Content pattern** | **Use case** |
| --- | --- | --- | --- |
| `0` | 0px | No space | Mimicking rows in tabular data |
| `1` | 4px | Tight grouping | Label paired with its input |
| `2` | 8px | Tight grouping | Icon paired with a text line |
| `3` | 12px | Standard spacing | Form fields in a group |
| `4` | 20px | Standard spacing | Cards in a list, paragraphs |
| `5` | 32px | Generous spacing | Sections within a view |
| `6` | 52px | Generous spacing | Major content blocks (use with caution) |
| `7` | 84px | Generous spacing | Page-level sections (use with caution) |
| `8` | 136px | Generous spacing | Reserved for large layouts (use with caution) |
| `9` | 220px | Generous spacing | Reserved for large layouts (use with caution) |

**Content density tiers:**

- **Tight (1–2).** Items that form a single unit. A label and its input. An icon and its caption. The space should feel like a pause, not a break.
- **Standard (3–4).** Distinct items that belong to the same group. Form fields, paragraphs, cards. The space should feel like a clear separator.
- **Generous (5+).** Major sections that need visual distance. Use this to create breaks without adding a divider. The space should feel like a new section.

**Responsive example:** `<Stack space={[2, , 4]}>` — uses `2` at the smallest breakpoint and `4` at the 600px breakpoint.

#### As (semantic element)

`as` sets the rendered HTML element. The default is `'div'`.

Avoid `as="button"`, `as="dialog"`, or `as="select"`. These elements carry behavior contracts that Stack does not fulfil. Use the matching component instead.

#### Padding

`padding` adds inner spacing around all children. It does not affect the space between them. The prop accepts responsive values.

Use `paddingX` and `paddingY` to set inline and block padding one by one. Use side-specific props (`paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`) for fine control.

Example: `<Stack space={3} padding={4}>` — 12px between children, 20px of inner padding.

#### Border

`border` adds a visible border around the Stack. Use `borderTop` or `borderBottom` alone to create visual dividers at the edges of a section.

Example: `<Stack space={3} padding={3} border>` — a bordered vertical group.

#### Overflow

`overflow` controls how content behaves when it exceeds the Stack's bounds. Set `overflow="auto"` on a Stack with a fixed `height` to create a scrollable vertical region.


### When to use `Flex flexDirection="column"` instead of Stack

When a vertical layout also needs to be a **flex child** (requiring `flexGrow`, `flexShrink`, or `flexBasis`), use `Flex` with `flexDirection="column"` and `gap` instead of wrapping Stack in an extra Box:

```tsx
{/* ✗ — Stack doesn't accept flexGrow; requires an extra Box wrapper */}
<Box flexGrow={1} overflowY="auto">
  <Stack space={3}>...</Stack>
</Box>

{/* ✓ — Flex column avoids the wrapper entirely */}
<Flex flexDirection="column" gap={3} flexGrow={1} overflowY="auto">
  ...
</Flex>
```

**When to use each:**

| Use Stack | Use Flex column instead |
|-----------|------------------------|
| Simple vertical sequence — no layout context needed | The container needs `flexGrow`, `flexShrink`, or `flexBasis` |
| Children should span full parent width | You need `overflow`, `height`, or `minHeight` on the container |
| `space` token semantics feel natural | You prefer `gap` — same 0–9 scale, same spacing tokens |

> Both `Stack space={3}` and `Flex flexDirection="column" gap={3}` use the same spacing scale and produce the same vertical rhythm. The difference is purely about whether the container needs to participate in a flex layout.

### Accessibility

**Semantic elements and landmarks.** Stack renders a `<div>` by default. This is correct for most cases. When the content has a semantic role, change the element with `as`. Each semantic element has rules:

- `as="nav"` creates a navigation landmark. Add `aria-label` when two or more `<nav>` elements exist on the same page. Without a label, screen readers cannot tell them apart (WCAG 1.3.1).
- `as="section"` only registers as a landmark when it has an accessible name. Add a heading inside it, or set `aria-label`. Without either, `<section>` is the same as `<div>` to screen readers (WCAG 1.3.1).
- `as="fieldset"` requires a `<legend>` as its first child. The `<legend>` gives the group its accessible name.

**List semantics and VoiceOver.** When using `as="ul"` or `as="ol"`, add `role="list"` to the Stack. WebKit and Safari strip list semantics from `<ul>` and `<ol>` elements when `list-style: none` is applied via CSS. Adding `role="list"` restores the behavior. Without it, VoiceOver does not announce the element as a list or report the item count (WCAG 1.3.1).

Each child of a list Stack must be an `<li>` element. Wrap each child in `<li>` or use `as="li"` on child components that support it.

Example:

`<Stack as="ul" role="list" space={2}>`

`  <li>First item</li>`

`  <li>Second item</li>`

`  <li>Third item</li>`

`</Stack>`

**Reading order.** Stack places items in DOM order. Visual order and DOM order match by default. Do not use CSS `order` on children. It breaks the link between what users see and what screen readers announce. Keyboard navigation also follows DOM order, not visual order (WCAG 1.3.2).

**Content spacing.** For text content, use `space` of `3` (12px) or higher. Smaller values can make text blocks feel cramped. This harms readability for users with cognitive or visual needs (WCAG 1.4.12).

**Reflow.** Stack uses a single-column layout with `minmax(0, 1fr)` width. Content reflows well on narrow screens. No extra work is needed for WCAG 1.4.10 (Reflow).

**Zoom.** Spacing tokens use `rem` values. Content scales when users adjust browser zoom or font size settings.

### Content

**Common children patterns:**

- **Form field groups.** Label, input, and help text stacked with `space={2}`.
- **Text content blocks.** Heading followed by body paragraphs, stacked with `space={3}` or `space={4}`.
- **Card or item lists.** Repeated items of the same type, stacked with `space={3}`.
- **Navigation groups.** Vertical nav links stacked with `space={2}`.
- **Mixed content sections.** Heading, body text, form, and action buttons stacked with `space={5}`.

**Spacing choices.** Pick `space` based on the relationship between items, not the pixel value. Tightly related items (label + input) use a small space. Distinct peers (form fields) use a medium space. Separate sections use a large space. See the space section for the full tier breakdown.

**Width behavior.** Stack fills its parent's width. Each child stretches to the full width of the Stack. This is not adjustable — if you need children with varied widths, use **Flex** or **Grid**.

**No text styling.** Stack is a layout primitive. It does not set font size, line height, or color. Use **Text**, **Heading**, or **Label** inside the Stack to style text content.

**Text inside Stack needs `as="p"`.** The `Text` component defaults to `as="span"`, which renders inline. When placing multiple Text elements in a Stack, set `as="p"` on each to get block-level rendering and correct vertical spacing:

```tsx
{/* ✗ — Text defaults to <span>; items crowd together */}
<Stack space={2}>
  <Text size={1}>First line</Text>
  <Text size={1} color="muted">Second line</Text>
</Stack>

{/* ✓ — as="p" ensures block rendering */}
<Stack space={2}>
  <Text as="p" size={1}>First line</Text>
  <Text as="p" size={1} color="muted">Second line</Text>
</Stack>
```

# Text



Used for the majority of UI copy, including body paragraphs, captions, and metadata. It is distinct from other typography components, such as Code, Heading, KBD, and Label.

### API

> **Note:** This documents the `ui-poc` Text component (`../ui-poc/packages/ui/src/components/Text`). It has a narrower prop surface than `@sanity/ui`'s Text — there is no `accent` or `textOverflow` prop.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | React element type | `'span'` | HTML element or component to render (e.g. `as="p"`, `as="span"`, `as="label"`) |
| `size` | `0`–`4` or responsive array | `2` | Font size and line height from the typography scale |
| `weight` | `'regular'`, `'medium'`, `'semibold'`, `'bold'` or responsive array | — | Font weight |
| `align` | `'start'`, `'center'`, `'end'` or responsive array | — | Text alignment using CSS logical properties (`text-align: start/center/end`). `'start'` is left in LTR, right in RTL. |
| `color` | `'default'`, `'muted'`, `'primary'`, `'positive'`, `'caution'`, `'critical'` or responsive array | `'default'` | Text color. `'muted'` sets gray-500. Combine with the `muted` prop to shift to an even lighter tint. |
| `muted` | boolean | `false` | Lightens the text color to the lighter tint of the active `color`. Combine with `color` to de-emphasize semantic text (e.g. `color="critical" muted` → lighter red). Standalone `muted` with no `color` resolves to gray-500. |
| `lines` | number or responsive array | — | Clamp text to N visible lines using `-webkit-line-clamp`. Use instead of `textOverflow="ellipsis"`. |
| `className` | string | — | Additional CSS class names |
| `style` | React.CSSProperties | — | Inline styles |

### Common patterns

These are the most frequent Text use cases. Each has a prop-based solution — no inline style needed.

**Secondary / helper text (timestamps, metadata, descriptions):**
```tsx
{/* ✓ — use color="muted" for secondary text */}
<Text size={1} color="muted">Last edited 2 hours ago</Text>

{/* ✗ — inline style bypasses theming and dark mode */}
<Text size={1} style={{ color: '#666' }}>Last edited 2 hours ago</Text>
```

**Status metadata:**
```tsx
{/* ✓ — semantic color via prop */}
<Text size={1} color="positive">Published</Text>
<Text size={1} color="critical">Failed</Text>

{/* ✗ — hardcoded color breaks in dark mode */}
<Text size={1} style={{ color: 'green' }}>Published</Text>
```

**Block-level text in a Stack:**
```tsx
{/* ✓ — as="p" renders block-level, Stack space works correctly */}
<Stack space={2}>
  <Text as="p" size={1}>First paragraph</Text>
  <Text as="p" size={1} color="muted">Second paragraph</Text>
</Stack>

{/* ✗ — default <span> is inline; items crowd together in Stack */}
<Stack space={2}>
  <Text size={1}>First paragraph</Text>
  <Text size={1} color="muted">Second paragraph</Text>
</Stack>
```

**Emphasized text (without inline font-weight):**
```tsx
{/* ✓ — weight prop */}
<Text size={1} weight="semibold">Important note</Text>

{/* ✗ — inline style */}
<Text size={1} style={{ fontWeight: 600 }}>Important note</Text>
```

**Text inside native HTML elements (`<td>`, `<th>`, `<li>`):**

> ⚠️ **Always wrap text content inside native HTML elements in a Text, Label, or Badge component.** Bare strings inside `<td>`, `<th>`, `<li>`, `<span>`, or `<div>` inherit the browser's default font and size — they do not match the Sanity UI type scale. This also applies to table headers.

```tsx
{/* ✗ — bare string in <td>; browser default font, no type scale */}
<td>{row.title}</td>

{/* ✓ — Text controls font, size, weight, color */}
<td><Text size={1} weight="medium">{row.title}</Text></td>
```

```tsx
{/* ✗ — bare string in <th>; agents then add inline fontSize/fontWeight/color to compensate */}
<th style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Title</th>

{/* ✓ — Text handles all typography; <th> styling comes from global.css */}
<th><Text size={0} weight="semibold" color="muted">Title</Text></th>
```

See `table.md` for the full table pattern with CSS-based styling.

### **Usage guidelines**

**When to use:**

- You are displaying body copy, descriptions, or captions

**When not to use:**

- To label a section within a Menu, side panel, or above headings. Use Label instead.
- To establish the structural hierarchy of a page (e.g., Page Title). Use Heading instead.
- To denote a keyboard shortcut or hotkey. Use KBD instead.
- For displaying inline or block code samples. Use Code instead.
- As a specific interaction link. Wrap the text in a link component or anchor tag, ensuring the clickable area is accessible.

### **Best practices**

**Do**

- Use `align="start"` in the majority of cases. Sanity's typographic system prefers start-aligned text. (`'start'` maps to `text-align: start` — left in LTR languages, right in RTL.)
- Use `muted` or `color="muted"` for secondary/helper text and metadata. `color="muted"` sets a fixed gray-500; `muted` shifts whatever `color` is set to its lighter tint — use it to de-emphasize semantically coloured text (e.g. a dimmed critical label).
- Use responsive arrays (e.g., `size={[1,2,3]}`) to ensure text is readable across mobile and desktop viewports.
- Aim for 55-70 characters per line in a multiline block of text for optimal legibility.

**Don’t**

- Don’t center-align long blocks of paragraph text; this disrupts the reading flow and is difficult for users with dyslexia.
- Don’t rely on color or the `accent` prop to capture attention or convey importance. People with certain visual impairments may not distinguish the change. Pair the text with an icon or badge instead.
- Don’t italicize or underline to emphasize text. Use Text’s weight prop instead.
- **In a `Stack`, set `as="p"` for block-level body text.** Text defaults to `as="span"`, which renders inline. Multiple Text components inside a Stack may crowd together or behave unexpectedly without `as="p"` or another block element.
- Don’t truncate text unless it is completely necessary. Text truncation makes information less available to people which can become a point of friction or confusion.

### Variants

#### Muted

**Which one to use:**

- **For ordinary secondary or helper text** (timestamps, captions, metadata): use `color="muted"`.
```tsx
   <Text color="muted">Last edited 2 hours ago</Text>
```
- **For de-emphasising text that already has semantic color**: use `muted` boolean.
```tsx
   <Text color="critical" muted>Non-critical error note</Text>
   <Text color="positive" muted>Subtle success note</Text>
```
- **Stacking both** (`color="muted" muted`) gives gray-300. Use sparingly.

When `muted={true}` is used alone it resolves to gray-500 — same as `color="muted"`. For plain secondary text, `color="muted"` is clearer and preferred.

> ⚠️ **Muted text at small sizes may fail WCAG AA contrast.** `color="muted"` resolves to gray-500 (#797979), which produces a 4.35:1 contrast ratio against white — below the 4.5:1 AA threshold for text under 18px. This affects `size={0}` (10px) and `size={1}` (13px). For small muted text, use `size={2}` or higher, or add `weight="medium"` to improve legibility.


#### Weight

Sets the typographic weight of text.

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `"regular"` | Regular font weight (400) | For general body text. The preferred weight for text above `size=0`. | General paragraphs and normal body copy. |
| `"medium"` | Medium font weight (500) | To create visual separation from general body copy as well as improve general legibility for small text. | The default text treatment in interactive elements. Use semibold for labels in custom interactive UI components. General text treatments using Text’s `size=0`. |
| `"semibold"` | Semibold font weight (600) | For emphasizing text  above `size=0`. | Emphasizing a term or phrase within paragraphs and normal body copy.  |
| `"bold"` | Bold font weight (700) | Specifically to emphasize Text components with `size=0 `to aid in legibility. | For emphasized  text treatments using Text’s smallest size. |

#### Size

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `0` | Text’s smallest size | To act as a way to deemphasize content and/or accommodate for extreme high-density compositions. | For fine print and legal text (check with local laws to ensure compliance) Situations where text is required in a small space |
| `1` | Text’s small size | The default size for UI text and UI labels, such as Buttons, MenuItems, and Tabs. | Text or UI labels that are **not** specifically related to content editing. Text that acts as non-critical messaging to the user, such as Toasts and empty states. |
| `2` | Text’s medium size | The default size for text related to content editing | Text or UI labels that are specifically related to content editing (ex: text fields, selects, etc.). Calls to action where visual emphasis is essential (ex: calling out important steps in a workflow) |
| `3` | Text’s large size | For adding significant emphasis. Use is not generally advised. | No common use cases. Most uses are better supported by  the Header component. |
| `4` | Text’s extra large size | For adding extreme emphasis. Use is not generally advised. | No common use cases. Most uses are better supported by  the Header component. |

#### Accent

Accent is deprecated and should be avoided. Use `weight` and/or `size` instead of accent to increase emphasis.

#### Align

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `"start"` | Logical start alignment (`text-align: start`) | The default alignment for text in LTR layouts. Equivalent to left in LTR languages, right in RTL. | Body copy, UI labels, and headings in the majority of cases. |
| `"center"` | Center alignment | Used rarely when the text element's parent is centered. | Empty state copy. Labels within UI elements such as Buttons andText that is left/start aligned. | Acts as the primary alignment for text within Sanity UI within LTR languages. | Displaying body copy for LTR languages. Headers and content for numeric data within table cells in RTL languages. |
| `"center"` | Text that is center aligned. | Used rarely in situations where the text element’s parent is centered. | Copy within a pure-center content block, such as an empty state. Labels within UI elements, such as Buttons, Tabs, etc. |
| `"right"` | Text that is right/end aligned. | Acts as the primary alignment for text within Sanity UI within RTL languages. | Displaying body copy for RTL languages. Headers and content for numeric data within table cells in LTR languages. |

#### Lines (truncation)

> **ui-poc:** Use the `lines` prop instead of `textOverflow`. Setting `lines={1}` clamps to a single line; `lines={3}` shows three lines then clips. This uses CSS `-webkit-line-clamp` under the hood.
>
> ```tsx
> {/* ✗ — textOverflow prop does not exist on ui-poc Text */}
> <Text textOverflow="ellipsis">long text...</Text>
>
> {/* ✓ — use lines prop */}
> <Text lines={1}>long text...</Text>
> ```
>
> The `lines` prop accepts a responsive array: `lines={[2, null, 1]}`.

Determines whether the Text component truncates as opposed to wrapping. This should be used as a last resort. Some examples where TextOverflow should be used are:

- Text used within a grid of elements where text wrapping would cause irregular sizes or shifts in content.
- Extremely long strings, like UUIDs, in small areas where the text won’t wrap elegantly and will push the container to unsupported widths.
- Situations where text is user/machine generated and extreme edge cases may exist.

Before truncating, attempt to shorten the text if possible. The ideal kind of truncation is no truncation. When truncation is necessary, make sure the full text string is available via `Tooltip` component or `title `attribute.

### Accessibility

To ensure content is accessible to all users, including those using assistive technologies:

- **Contrast Compliance:** Ensure that the text color maintains a contrast ratio of at least **4.5:1** against the background for standard text, and **3:1** for large text. Be particularly careful when using `muted` or `accent` props on non-standard backgrounds.
- **Don't rely on color:** Do not use the `accent` prop as the _only_ way to indicate status (e.g., errors or success). Always pair color with text labels or icons.
- **Semantic Structure:** While the `Text` component defaults to a `span`, use the `as` prop to render semantically appropriate tags (e.g., `as="p"`) to help screen readers understand the content structure.
- **Scaling:** Ensure text remains legible when the browser is zoomed up to 200%. Avoid using fixed pixel units if overriding styles manually.

### **Content**

- **Sentence case:** Use sentence case for UI labels and body text (e.g., "Edit profile" not "Edit Profile").
- **Clear language:** Avoid jargon, acronyms, and complex sentence structures. Aim for an 8th-grade reading level to maximize comprehension.
- **Conciseness:** Be succinct. Avoid "filling space" with flowery language. Users scan text rather than reading word-for-word.
- **Actionable:** When Text is used for instructions, frame the content as actionable steps rather than passive descriptions.

# Heading

Headings are used to create a logical hierarchy and page structure. They guide the user's eye, group related content, and enable users of assistive technologies to navigate the interface quickly.

### API

**Note:** This documents the `ui-poc` Heading component (`../ui-poc/packages/ui/src/components/Heading`). It uses a `level` prop (not `as`) to set the semantic heading tag. There is no `as`, `weight`, `muted`, `accent`, or `textOverflow` prop.

⛔ **Always set `level` explicitly. Omitting it silently renders `<h2>` regardless of context.**

`level` defaults to `2`. There is no runtime warning when it is omitted. TypeScript does not require it. A `<Heading>` without a `level` silently produces an `<h2>` even when the page needs an `<h1>`. This is an invisible accessibility violation — incorrect heading hierarchy — with zero feedback at authoring time.

```tsx
{/* ✗ — silently renders <h2> */}
<Heading>Page Title</Heading>

{/* ✓ */}
<Heading level={1}>Page Title</Heading>
```


| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `level` | `1`–`6` | `2` | Semantic heading level — renders `<h1>`–`<h6>`. **Always set this explicitly.** Default is `2` (`<h2>`). |
| `size` | `0`–`5` or responsive array | `0` | Visual font size from the heading scale, independent of `level`. Defaults to `0` when not set. |
| `align` | `'start'`, `'center'`, `'end'` or responsive array | — | Text alignment using CSS logical properties (`text-align: start/center/end`). `'start'` is left in LTR, right in RTL. Use with caution — headings should almost always be start-aligned. |
| `color` | `'default'`, `'muted'`, `'primary'`, `'positive'`, `'caution'`, `'critical'` or responsive array | `'default'` | Text color. Use `color="muted"` where you would use the `muted` prop on `@sanity/ui` Heading. |
| `lines` | number or responsive array | — | Clamp to N visible lines using `-webkit-line-clamp`. Use instead of inline overflow styles. |
| `className` | string | — | Additional CSS class names |
| `style` | React.CSSProperties | — | Inline styles |

### Usage guidelines

**When to use:**

- You need to establish the semantic structure of a page (e.g., Page Title, Section Header).
- You need to group text and elements into logical sections.

**When not to use:**

- Don't use Heading for large text for a number or a callout that does not define a section. Use the **Text** component with a `size` prop instead.
- Don't use Heading to emphasize text inside a paragraph. Use **Text** with a `weight="bold"` prop.

### Best practices

**Do**

- Use a logical hierarchy. Start with H1 for the main page title and descend to H2, H3, etc., based on the depth of the content.
- Use `size={0}` for headings that exist in the UI chrome (ex: navbars, toolbars, etc.). Sanity's UI aims to take up as small of a footprint as possible. 
- Use larger heading sizes (1 - 2) for headings related to content. Content should take visual priority over UI chrome.
- Use the `level` prop (e.g., `level={2}`) to set the semantic heading tag. The component defaults to `level={2}` (`<h2>`) — always set it explicitly to match the content hierarchy. `level` accepts integers `1`–`6`.
- Start-align headings (left-aligned in LTR languages) for easier reading. This provides a consistent starting edge for the eye.

**Don't**

- Avoid center-aligning headings–especially when the text is long. This disrupts the reading flow and can be difficult for users with dyslexia.
- Don't skip heading levels (e.g., jumping from H1 to H3) simply to achieve a specific visual size. Use the `size` prop to adjust visuals while keeping the `level` prop semantically correct.
- Don't use Headings for visual differentiation. Headings are functional in nature.
- Don't manually set overflow styling in Heading components, such as `style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}`. Use the `lines` prop instead (`lines={1}` for single-line clamp) or let the text wrap.
- Don't customize Heading text colors. Use `color` to convey a semantic meaning when appropriate.

### Variants

#### Size

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `0` | Heading's smallest size | To act as a way to deemphasize content and/or accommodate for extreme high-density compositions. | The default size headings inside UI chrome, such as toolbars and sidebars . |
| `1` | Heading's small size | The default size sub-groups of content. | Content sub-section titles. |
| `2` | Heading's medium size | The emphasized size for groups of content. | Contentsection titles |
| `3` | Heading's large size | For adding titles within high density layouts. | Document titles within the main content window. |
| `4` | Heading's extra large size | For adding large titles within moderate density layouts. | Emphasized titles within Studio editor content. |
| `5` | Heading's largest size | For adding large titles within low density layouts. | Document titles within Canvas editor content. |

#### Align

Sets the Heading's horizontal alignment. **Use with caution. **Headings should almost always be left/start aligned. In certain cases on mobile devices `align="center"` may be preferable.

#### Lines (truncation)

> **ui-poc:** Use the `lines` prop instead of `textOverflow`. `lines={1}` clamps to one line using CSS `-webkit-line-clamp`. Accepts a responsive array.
>
> ```tsx
> {/* ✗ — textOverflow prop does not exist on ui-poc Heading */}
> <Heading level={2} textOverflow="ellipsis">Long title...</Heading>
>
> {/* ✓ — use lines prop */}
> <Heading level={2} lines={1}>Long title...</Heading>
> ```

Determines whether the Heading component truncates as opposed to wrapping. This should be used as a last resort. Some examples where truncation should be used are:

- Titles used within a grid of elements where text wrapping would cause irregular sizes or shifts in content.
- Situations where text is user/machine generated and extreme edge cases may exist.

Before truncating, attempt to shorten the text if possible. The ideal kind of truncation is no truncation. When truncation is necessary, make sure the full text string is available via `Tooltip` component or `title` attribute.

### Accessibility

- **Navigation and orientation. **Use Heading to create explicit waypoints within an interface. Screen reader users rely on headings to navigate complex interfaces. Headings address common orientation issues in Sanity Studio.
- **Semantic structure.** Always set the `level` prop to render `<h1>`–`<h6>`. The default `level={2}` renders `<h2>`. Use `level={1}` for the page title, `level={2}` for section headings, etc. Unlike `@sanity/ui`'s Heading, there is no `as` prop — `level` is the only way to control the rendered element.
- **`level` must always be set explicitly — no exceptions.** The default `level={2}` renders `<h2>`. Omitting `level` is a silent accessibility violation: the page may have duplicate `<h2>` elements, a missing `<h1>`, or a broken heading outline. TypeScript does not warn. No console error fires. A screen reader user navigating by headings will encounter a broken structure with zero indication.
- **Logical order.** Heading levels must descend in sequence (H1 → H2 → H3). Do not skip levels (e.g. H1 to H4). Screen reader users navigate by heading level — a gap breaks their mental model.
- **Color contrast.** `muted` headings must maintain **3:1** contrast against the background for large text (24px+ regular or 19px+ bold) and **4.5:1** for smaller text (WCAG 1.4.3 AA).
- **Zoom and reflow.** Heading sizes must remain legible at 400% zoom / 320px viewport width (WCAG 1.4.10 AA). Long headings should wrap, not clip. When using `lines={1}`, verify clipped headings still make sense in context. Spacing tokens use `rem` and scale with user font-size settings (WCAG 1.4.12 AA).

### **Content**

- **Concise:** Keep headings short and glanceable. Avoid overly long titles that wrap to multiple lines if possible.
- **Sentence case:** Use sentence case for headings (e.g., "Page settings" rather than "Page Settings") to maintain a conversational tone and improve scanability.
- **No punctuation:** Do not use punctuation (periods) at the end of headings unless the heading is a direct question.
- **Descriptive:** Headings should clearly describe the content of the section they introduce.


## Inline style alternatives

Most inline styles are not needed for Flex. Use the alternatives below when considering an inline style.

| Inline style | Alternative |
|--------------|-----------------|
| `<Heading style={{ color: #670000 }} ... >` | `<Heading color='critical' ... >` |
| `<Heading style={{ color: scheme === 'dark' ? '#e3e4e8' : '#252837' }}> ... >` | Use `<Heading ... >` (Heading manages color scheme internally) |
| `<Heading style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} ... >` | `<Heading lines={1} ...>`

# PressArea

Wraps arbitrary content and makes it clickable and keyboard-accessible. It renders a `<div>` with `role="button"` (or another role) and handles Enter/Space key activation, focus ring, and cursor management.

## Props

### Component Props

| Prop | Description | Type | Values | Default | Required |
| --- | --- | --- | --- | --- | --- |
| children | Content rendered inside the pressable region | `React.ReactNode` | – | – | No |
| className | Additional CSS class name | `string` | – | – | No |
| disabled | Prevents interaction and removes the element from the tab order | `boolean` | `true` \| `false` | `false` | No |
| style | Additional inline styles | `React.CSSProperties` | – | – | No |

### Interaction

| Prop | Description | Type | Values | Default | Required |
| --- | --- | --- | --- | --- | --- |
| onPress | Called when the PressArea is clicked or activated via Enter/Space | `(event: React.MouseEvent \| React.KeyboardEvent) => void` | – | – | No |
| onBlur | Called when the PressArea loses focus | `(event: React.FocusEvent) => void` | – | – | No |
| onFocus | Called when the PressArea receives focus | `(event: React.FocusEvent) => void` | – | – | No |
| onKeyDown | Called when a keyboard key is pressed while focused | `(event: React.KeyboardEvent) => void` | – | – | No |

### Layout

| Prop | Description | Type | Values | Default | Required |
| --- | --- | --- | --- | --- | --- |
| fullWidth | Stretches the PressArea to fill the full width of its parent | `boolean` | `true` \| `false` | `true` | No |
| fullHeight | Stretches the PressArea to fill the full height of its parent | `boolean` | `true` \| `false` | `false` | No |

### Appearance

| Prop | Description | Type | Values | Default | Required |
| --- | --- | --- | --- | --- | --- |
| mouseCursor | Cursor style shown on hover | `string` | `"copy"` \| `"default"` \| `"grab"` \| `"grabbing"` \| `"move"` \| `"noDrop"` \| `"pointer"` \| `"zoomIn"` \| `"zoomOut"` | `"pointer"` | No |
| radius | Border radius applied to the pressable region | `Responsive<Radius>` | `0` \| `1` \| `2` \| `3` \| `4` \| `5` \| `6` \| `"full"` | – | No |
| selected | Marks the PressArea as the currently selected or active item | `boolean` | `true` \| `false` | `false` | No |

### Accessibility

| Prop | Description | Type | Values | Default | Required |
| --- | --- | --- | --- | --- | --- |
| aria-label | Accessible label for screen readers when the PressArea has no visible text | `string` | – | – | No |
| aria-controls | ID of the element whose contents are controlled by this PressArea | `string` | – | – | No |
| aria-expanded | Indicates whether a collapsible region is expanded or collapsed | `boolean` | `true` \| `false` | – | No |
| aria-haspopup | Indicates the type of popup triggered by this PressArea | `string \| boolean` | `"menu"` \| `"listbox"` \| `"dialog"` \| `"grid"` \| `"tree"` \| `true` \| `false` | – | No |
| aria-pressed | Indicates the current pressed/toggled state for toggle-style press areas | `boolean` | `true` \| `false` | – | No |
| role | ARIA role for the element | `string` | `"button"` \| `"link"` \| `"switch"` | `"button"` | No |
| tabIndex | Tab index override. Set to -1 to remove from keyboard navigation | `number` | `-1` \| `0` | `0` | No |

### Usage guidelines

#### When to use:

- To make a non-semantic container clickable and keyboard-accessible
- To build custom interactive surfaces such as toggles, selectable cards, or drag handles
- When you need a pressable region that is not a standard Button or anchor link
- To wrap complex layouts (e.g. a card with an image, title, and description) in a single interactive target

#### When not to use:

- For standard actions like "Save" or "Cancel". Use **Button** instead — it provides label styling, tones, loading state, and icon support out of the box.
- For navigation to another page or URL. Use an anchor element or a router link instead.
- For interactive card surfaces with built-in tone and shadow behavior. Use **Tile** instead.
- When the pressable area only contains text. Use **Button** with `mode="bleed"` for a minimal text-only action.
- For form submission. Use `<button type="submit">` via Button.

#### Choosing between PressArea, Button, and Tile:

| **Component** | **Purpose** | **Renders as** | **Use case** |
| --- | --- | --- | --- |
| PressArea | Generic pressable surface | `<div role="button">` | Custom interactive regions with arbitrary content |
| Button | Standard action trigger | `<button>` | Labeled actions, form submission, icon buttons |
| Tile | Interactive content surface | Themed pressable card | Selectable cards with built-in visual states |

### Best practices

#### Do

- Always provide an `aria-label` when the PressArea has no visible text content so screen readers can describe the interactive element
- Use `onPress` instead of attaching `onClick` to a plain `<div>` — PressArea handles keyboard activation (Enter/Space) automatically
- Set `mouseCursor` to match the interaction intent (e.g. `"grab"` for drag handles, `"zoomIn"` for image previews)
- Use `selected` to communicate the active state in a group of selectable items
- Keep the pressable target at least 44×44 CSS pixels for touch accessibility (WCAG 2.5.8 AAA)

#### Don't

- Don't nest PressArea inside another PressArea or inside a Button. Nested interactive elements break keyboard navigation and screen reader behavior (WCAG 4.1.2 A).
- Don't use PressArea for decorative or non-interactive containers. Use **Box** or **Card** instead.
- Don't override `role` unless you have a specific accessibility requirement. The default `"button"` role is correct for most use cases.
- Don't set `tabIndex={-1}` without providing an alternative way to reach the element via keyboard.

### Variants

#### Default

The default PressArea renders as a full-width pressable `<div>` with `role="button"`, a pointer cursor, and keyboard activation via Enter and Space.

#### Selected

Set `selected` to visually mark the PressArea as the currently active item in a group. The component applies the `sui-PressArea-selected` class and sets `data-selected` on the DOM element.

#### Disabled

Set `disabled` to prevent all interaction. The element is removed from the tab order (`tabIndex={-1}`), `aria-disabled` is set to `true`, and the cursor class is not applied. Event handlers are suppressed.

#### As a switch

Set `role="switch"` together with `aria-pressed` to create a toggle control. When `role` is `"switch"`, the component automatically maps `aria-pressed` onto the rendered element.

### Accessibility

- **Keyboard activation.** PressArea listens for Enter and Space key presses and calls `onPress` when either is detected. Space triggers `event.preventDefault()` to prevent page scrolling (WCAG 2.1.1 A).
- **Focus management.** PressArea is included in the tab order by default (`tabIndex={0}`). When `disabled` is `true`, it is removed from the tab order (`tabIndex={-1}`) and `aria-disabled="true"` is set. The browser's default focus ring is shown on focus.
- **Accessible name.** Every PressArea must have an accessible name. If the children contain visible text, that text serves as the name. If the children are purely visual (icons, images, decorative elements), provide `aria-label` (WCAG 4.1.2 A).
- **Role.** The default role is `"button"`. Only change it to `"link"` if the PressArea navigates to a URL, or to `"switch"` if the PressArea toggles a binary state. Incorrect role assignment breaks assistive technology expectations (WCAG 4.1.2 A).
- **Toggle state.** When using `role="switch"` or when `aria-pressed` is provided, the component sets `aria-pressed` on the element. Ensure the visual selected state matches the `aria-pressed` value so sighted and non-sighted users receive the same information (WCAG 1.3.1 A).
- **Popup disclosure.** When the PressArea opens a popup, set `aria-haspopup` to the appropriate value (`"menu"`, `"listbox"`, `"dialog"`, `"grid"`, or `"tree"`) and pair it with `aria-expanded` to communicate the open/closed state (WCAG 4.1.2 A).
- **Controls relationship.** Use `aria-controls` to associate the PressArea with the element it controls (e.g. a collapsible panel). This helps assistive technology users navigate between the trigger and the controlled content.
- **Target size.** Ensure the PressArea has a minimum target size of 24×24 CSS pixels (WCAG 2.5.8 AA) or 44×44 CSS pixels for touch interfaces (WCAG 2.5.8 AAA). Use `fullWidth` and `fullHeight` or padding on children to meet the requirement.
- **No nested interactives.** Do not place buttons, links, or other interactive elements inside PressArea. Nested interactive elements are not reachable in a predictable way and violate WCAG 4.1.2 A.

### Content

- **PressArea does not set text styles.** PressArea provides an interactive surface. It does not set font size, line height, weight, or color. Use Text, Heading, or Label inside PressArea for text styling.
- **Casing (P8).** All text inside PressArea must use sentence case. The child components (Text, Heading, Label) own the styling. PressArea does not override it.
- **Labels.** When PressArea contains only an icon or image, always pair it with an `aria-label` that describes the action, not the icon (e.g. `aria-label="Close dialog"` not `aria-label="X icon"`).

# Tooltip



**Description** The Tooltip is a floating text label that displays information when a user hovers, focuses, or taps on an element. Its purpose is to provide helpful, non-essential context to a UI element. It succinctly describes the function of an element (like an icon-only button) or enhances baseline understanding without cluttering the interface.

> ⛔ **Tooltip requires its child to forward refs.** If the child component does not use `React.forwardRef`, the tooltip will not appear — **no error is thrown and no warning is logged.** This is the #1 cause of "tooltip doesn't show up" issues. Use a native HTML element or a Sanity UI component as the direct child. If wrapping a custom component, it must use `React.forwardRef`. See `silent-failures.md` #12.

### **API Documentation**

_Refer to TypeDocs in Tooltip.tsx_

### **When to Use / When Not to Use**

- **Use when:** You need to explain the function of an icon-only button (e.g., a "Trash" icon meaning "Delete").
- **Use when:** You need to provide supplementary information that enhances the understanding of a feature but is not critical for the task.
- **Do not use when:** The information is critical for the user to complete a task or understand an error. Use inline text or banners instead.
- **Do not use when:** You are restating text that is already visible on the screen. This creates redundancy and cognitive noise.
- **Do not use when:** The element is disabled. Disabled elements cannot receive focus, making the tooltip inaccessible to keyboard users.

### **Usage Dos and Don’ts**

- **Do** use the `arrow` prop to visually link the tooltip to small triggers like icons, helping users identify which element is being described.
- **Do** use `delay` to prevent tooltips from flickering open/closed as the user moves their mouse rapidly across the screen (hover intent).
- **Don’t** put interactive content like links or buttons inside a Tooltip. If you need interactive content, use a **Popover** instead.
- **Don’t** use lengthy text. Tooltips are for quick scanning; if the text is long, consider if it belongs in a modal or helper text.

### **Variants & Examples**

**1. Basic Tooltip** A simple text label for an icon button.

`<Tooltip content={<Text>Edit Profile</Text>}>`

`  <Button icon={EditIcon} mode="ghost" />`

`</Tooltip>`

**2. With Arrow and Animation** Provides a smoother visual transition and clearer connection to the trigger.

`<Tooltip`

`  arrow`

`  animate`

`  content={<Box padding={2}><Text>Helpful information</Text></Box>}`

`>`

`  <Button text="Hover me" />`

`</Tooltip>`

**3. Delayed Interaction** Adds a 500ms delay before opening to prevent accidental triggers.

`<Tooltip`

`  delay={{ open: 500, close: 0 }}`

`  content={<Text>Delayed tip</Text>}`

`>`

`  <Button icon={InfoIcon} />`

`</Tooltip>`

### Accessibility

- **Keyboard trigger.** Tooltips must appear on keyboard focus, not only on mouse hover. The child element must be interactive (a `<button>`, `<a href>`, or other focusable element).
- **Escape to dismiss.** Pressing `Escape` must hide the tooltip without moving focus.
- **Tab behavior.** The tooltip is not a Tab stop. When the user presses Tab, focus moves to the next focusable element and the tooltip closes. The tooltip should close on Tab away from the trigger (per the APG Tooltip pattern).
- **Disabled elements.** Never attach a tooltip to a disabled button (`<button disabled>`). Disabled elements leave the tab order. Keyboard users will never reach the tooltip. Place the tooltip on a wrapper element instead, or provide context through nearby text.
- **Reduced motion.** The `animate` prop respects the user's `prefers-reduced-motion` setting. When reduced motion is on, the tooltip appears and hides with no transition.
- **Screen readers.** Tooltip content must not repeat the trigger's `aria-label`. If the button is labeled "Settings," the tooltip should add context or be omitted.
- **Child must forward refs.** Tooltip attaches to its child via a ref. If the child is a custom component, it must use `React.forwardRef`. Without ref forwarding, the tooltip fails to position and does not appear. This is silent — no error is thrown.

### **Content Guidelines**

- **Concise:** Limit text to a maximum of 60–75 characters where possible. Tooltips should be succinct .
- **Action-Oriented:** Start with a verb if describing an action (e.g., "Edit profile" rather than "Profile editor") .
- **Sentence Case:** Use sentence case for tooltip labels (e.g., "Save to board" not "Save To Board") .
- **No Punctuation:** Avoid periods at the end of fragments. Only use punctuation if the tooltip contains full sentences .

# Button



Used to trigger an action–like submitting a form, opening a dialog, or performing a command.

> ⛔ **`tone="primary"` fails WCAG AA contrast — do not use it.** The primary tone produces white text on `#556bfc` at a 4.29:1 contrast ratio. WCAG AA requires 4.5:1 for text under 18px. This applies to Button, Badge, and any component using `tone="primary"`. For primary actions, use `mode="default" tone="default"` instead. No runtime warning or TypeScript error prevents this — the button renders and looks intentional, but ships an accessibility violation every time.

### API documentation

_Refer to TypeDocs in Button.tsx_

### Usage guidelines

**When to use:**

- To trigger an action within the application (e.g., "Publish", "Delete", "Save").
- To submit data in a form context. In such cases, set Button to `type="submit"`.

**When not to use:**

- To navigate the user to a new view or URL within  a line of text or paragraph. Use **Link** instead. Users of assistive technology expect buttons to perform actions and links to navigate.
- To switch between different views on a screen. Use **Tab** instead. The Tab component family has several `aria` tags that make navigation accessible for people relying on assistive technology.
- To toggle a boolean form value (on/off). Use **Switch** or **Checkbox** instead. Button `selected` is for action toggles (bold, show panel), not form state.
- 

Button does not accept `width` or flex-child props. See the "Inline style overrides" section for canonical workarounds.

### Full-width button

Button has no `fullWidth` or `width` prop. To make a button span full width (common in sidebar navigation), wrap it in a Box:

```tsx
{/* ✗ — width prop on Button silently does nothing */}
<Button text="Save document" style={{ width: '100%' }} />

{/* ✓ — Box controls width, Button fills it */}
<Box display="flex">
  <Button text="Save document" style={{ flex: 1 }} />
</Box>
```

For custom interactive surfaces like navigation items (icon + label + trailing badge), see `patterns-navigation.md` and `menu.md`.

### Best practices

**Do**

- Use the `tone="critical"` when an action is destructive, such as delete actions.
- Ensure buttons have a logical tab order in the document flow (left to right, top to bottom).
- Bias towards using text labels in buttons to aid in comprehension.
- Limit the number of primary buttons on the screen. Display one primary action per logical section (example: actions in a toolbar, or a card).
- Add tooltips to icon-icon buttons. Wrap the button in a tooltip, and use `aria-label` – `<Tooltip text="Text"><Button aria-label="Text" icon={...} />`
- Set `iconRight` to `chevron-down` when using `Button` in `MenuButton`
- When using `selected` for toggle buttons, always pass `aria-pressed={selected}`. Sanity UI does not set this for you.
- Use `mode="bleed"` for toggle buttons. The light resting state makes the selected state more visible.

**Don't**

- Don't rely on color alone to convey the button's meaning (e.g., an error state should not just be red; use icons or text).
- Don't use vague labels. Avoid terms like "Click here"; use descriptive labels that explain the action.
- Don't disable buttons as a blocking function, such as disabling a submit button until all required fields are filled. People may not immediately understand what's causing the button to be disabled. Instead, allow buttons to be pressed and provide appropriate feedback in response.
- Don't hide buttons that represent critical actions. Actions that represent primary actions should be visible at all times.
- Don't overuse icons and text together in buttons. Only use when it doesn't prevent scannability–typically in situations where 3 or less buttons are grouped together.
- Don't use `tone="primary"` — it fails WCAG AA contrast (4.29:1). For primary actions use `mode="default"` `tone="default"`.

### States

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `"enabled"` | Button's standard state (default) | To represent

# TextInput

Used to accept a single line of text from the user.

### API documentation

_Refer to TypeDocs in TextInput.tsx_

### Usage guidelines

**When to use:**

- For short text fields: names, titles, search queries, URLs.

**When not to use:**

- For multi-line text. Use **TextArea** instead.
- For selecting from a fixed list. Use **Select** instead.
- For toggling a setting. Use **Switch** or **Checkbox** instead.

### Content

- **Placeholder text (P6).** Placeholder text shows the format or a brief hint, not the field name. Write "Search by title or ID" — not "Search." It must not replace a visible label.
- **Labels are required.** Every TextInput must have a visible label above or beside it. Use `<Label htmlFor="...">` or `aria-label`. A placeholder alone is not a label (see accessibility-standards.md §3).
- **Error messages (P3).** Inline error text appears below the input. Name the problem in plain words. Tell the user what to do. Example: "Title is required. Enter a title to continue." Do not show codes or jargon.
- **Casing (P8).** Use sentence case for labels, placeholder text, and error messages.
- **Keep placeholder text short (P6).** One phrase that fits inside the input at its default width with no clipping.
- **Do not use placeholder text for rules (P6).** If the user must know rules before typing (e.g. "Must be at least 8 characters"), put help text below the input — not in the placeholder.
- **Translation (P9).** Placeholder text and labels can grow 30–50% in other languages. Test with longer strings. Do not use string joining to build labels.

### Accessibility

- **Label association.** Every TextInput must have a `<label>` via `for`/`id` or wrapping, or an `aria-label`. A `placeholder` is not a label (WCAG 4.1.2 A).
- **Error state.** When invalid, the input must have an associated error message. Use `aria-describedby` to link the input to the error text.
- **Keyboard interaction.** TextInput is focusable via `Tab`. Standard text editing keys apply.
- `onChange`** uses **`currentTarget`**.** Use `event.currentTarget.value` to read the input value. This follows the React `SyntheticEvent` pattern. `event.target` may require a type cast to `HTMLInputElement`.

# Toast

Used to show brief status messages about completed actions, warnings, or errors. Toasts appear at the edge of the screen and disappear after a short time.

## Setup — ToastProvider is required

`ToastProvider` must wrap your app for `useToast()` to work. It is NOT included in `ThemeProvider`. Omitting it causes a runtime error with no helpful message.

`ToastProvider` must be **inside** `ThemeProvider`. The nesting order matters.

`// main.tsx`

`import { StrictMode } from 'react'`

`import { createRoot } from 'react-dom/client'`

`import { ThemeProvider, studioTheme, ToastProvider } from '@sanity/ui'`

`import App from './App'`

`import './reduced-motion.css'`

`createRoot(document.getElementById('root')!).render(`

`  <StrictMode>`

`    <ThemeProvider theme={studioTheme}>`

`      <ToastProvider>`

`        <App />`

`      </ToastProvider>`

`    </ThemeProvider>`

`  </StrictMode>,`

`)`



**If **`useToast()`** throws at runtime**, the most likely cause is a missing `ToastProvider`. The error message does not name the missing provider — it appears as a generic React context error like `Cannot read properties of null` or `useContext(...) is null`. When you see this pattern, check that `ToastProvider` wraps the component tree above the component calling `useToast()`. The fix is always the same: add `<ToastProvider>` inside `<ThemeProvider>` in your entry file.

## Basic usage — useToast() and toast.push()

Call `useToast()` inside any component to get the `toast` object. Call `toast.push()` to show a toast.

`import { useToast, Button } from '@sanity/ui'`

`function PublishButton() {`

`  const toast = useToast()`

`  const handlePublish = () => {`

`    // ... perform the action ...`

`    toast.push({`

`      status: 'success',`

`      title: 'Document published',`

`    })`

`  }`

`  return <Button text="Publish" onClick={handlePublish} tone="default" />`

`}`



## toast.push() API

| **Property** | **Type** | **Required** | **Description** |
| --- | --- | --- | --- |
| `title` | `string` | Yes | The main message. Keep to one sentence. |
| `status` | `'success'` \| `'error'` \| `'warning'` \| `'info'` | No | Sets the tone and icon. Defaults to `'info'`. |
| `description` | `string` | No | A secondary line below the title. Keep short. |
| `closable` | `boolean` | No | Shows a close button. Defaults to `true`. |
| `duration` | `number` | No | Auto-dismiss time in milliseconds. Defaults to `5000`. Set to `0` to keep the toast visible until closed. |

### Status values

| **Status** | **Tone** | **Icon** | **Use case** |
| --- | --- | --- | --- |
| `'success'` | `positive` | `CheckmarkCircleIcon` | Action completed — "Document published" |
| `'error'` | `critical` | `ErrorOutlineIcon` | Action failed — "Upload failed. Try a smaller file." |
| `'warning'` | `caution` | `WarningOutlineIcon` | Non-blocking issue — "Connection unstable" |
| `'info'` | `default` | `InfoOutlineIcon` | Neutral update — "3 items moved to drafts" |

## Code examples

### Success toast

`toast.push({`

`  status: 'success',`

`  title: 'Document published',`

`})`

### Error toast with description

`toast.push({`

`  status: 'error',`

`  title: 'Upload failed',`

`  description: 'The file exceeds the 10 MB limit. Try a smaller file.',`

`})`

### Warning toast

`toast.push({`

`  status: 'warning',`

`  title: 'Unsaved changes',`

`  description: 'Save your work before leaving this page.',`

`})`

### Persistent toast (no auto-dismiss)

`toast.push({`

`  status: 'error',`

`  title: 'Connection lost',`

`  description: 'Changes will not be saved until the connection is restored.',`

`  closable: true,`

`  duration: 0,`

`})`

### Toast after a long-running action

Fire a toast when an action takes over 3 seconds. The user may have moved on.

`const handleExport = async () => {`

`  setLoading(true)`

`  try {`

`    await exportData()`

`    toast.push({`

`      status: 'success',`

`      title: '3 items exported',`

`    })`

`  } catch (err) {`

`    toast.push({`

`      status: 'error',`

`      title: 'Export failed',`

`      description: err.message,`

`    })`

`  } finally {`

`    setLoading(false)`

`  }`

`}`



## Usage guidelines

**When to use:**

- To confirm an action that completed in the background (e.g. "Document published").
- To report an error from an async task (e.g. "Upload failed. Try a smaller file.").
- To warn about a non-blocking issue.
- After a loading state that lasted over 3 seconds.

**When not to use:**

- For actions that need a response. Use **Dialog** instead.
- For inline form errors. Show the error next to the input instead.
- For persistent information. Use a **Card** with a tone instead.
- For content that requires user interaction beyond dismissing. Use **Dialog** instead.

## Content

- **Name the action and its result (P7).** Write "Document published" — not "Success." Write "3 items deleted" — not "Done." Users must know what happened without looking back.
- **Use past tense for done actions (P7).** Write "Published," "Saved," "Deleted." Use "-ing" for actions not yet done: "Publishing…," "Saving…"
- **Keep the title under one sentence (P7).** Toast messages must be easy to read at a glance.
- **Use **`description`** for extra detail.** If the problem needs more context, put it in `description`. Do not cram two sentences into `title`.
- **Use **`status`** to match the outcome (P7).** `'success'` for good outcomes. `'error'` for failures. `'warning'` for non-blocking issues. `'info'` for neutral updates.
- **Loading messages must name the task (P7).** Write "Publishing document…" or "Uploading image…" when the task is known. Use "Loading…" only when the task is unknown.
- **Casing (P8).** Use sentence case for title and description.
- **Translation (P9).** Toast text can grow 30–50% in other languages. Keep base text short to leave room for growth.

## Accessibility

- **Live region.** `ToastProvider` renders a container with `aria-live`. Success and info toasts use `aria-live="polite"`. Error toasts use `aria-live="assertive"`. Screen readers announce the text when it appears (WCAG 4.1.3 AA).
- **Do not rely on color alone.** Each `status` value pairs a tone with an icon. The icon is added by the component. If you build a custom toast layout, pair `tone="critical"` with `ErrorOutlineIcon` and `tone="positive"` with `CheckmarkCircleIcon` (WCAG 1.4.1 A).
- **Auto-dismiss timing.** Toasts auto-dismiss after 5 seconds by default. For error toasts that require user attention, set `duration: 0` to keep the toast visible until the user closes it. All auto-dismissing toasts must stay visible long enough to be read — do not set `duration` below 3000ms.
- **Known Sanity UI issue.** `ToastProvider` renders a `<ul>` element with `list-style: none`. WebKit strips list semantics from unstyled lists. VoiceOver may not announce the container as a list. This is a library-level issue. See `accessibility-standards.md` §9.

## Common mistakes

### Missing ToastProvider

`/* ✗ useToast() throws — no ToastProvider in the tree */`

`<ThemeProvider theme={studioTheme}>`

`  <App /> {/* App calls useToast() */}`

`</ThemeProvider>`

`/* ✓ ToastProvider wraps the app inside ThemeProvider */`

`<ThemeProvider theme={studioTheme}>`

`  <ToastProvider>`

`    <App />`

`  </ToastProvider>`

`</ThemeProvider>`

### ToastProvider outside ThemeProvider

`/* ✗ Wrong order — ToastProvider has no theme context */`

`<ToastProvider>`

`  <ThemeProvider theme={studioTheme}>`

`    <App />`

`  </ThemeProvider>`

`</ToastProvider>`

`/* ✓ Correct order */`

`<ThemeProvider theme={studioTheme}>`

`  <ToastProvider>`

`    <App />`

`  </ToastProvider>`

`</ThemeProvider>`

### Vague toast messages

`/* ✗ Vague — user does not know what happened */`

`toast.push({ status: 'success', title: 'Success!' })`

`toast.push({ status: 'error', title: 'Something went wrong' })`

`/* ✓ Specific — names the action and the result */`

`toast.push({ status: 'success', title: 'Document published' })`

`toast.push({ status: 'error', title: 'Image upload failed. File exceeds 10 MB.' })`

# Card

Container for content that requires a distinct visual surface — a background, optional border, and semantic tone color.

**Note:** This documents the `ui-poc` Card component. Import it from `ui`, **not** from `@sanity/ui`:

```tsx
import { Card } from '../ui-poc/packages/ui/src/components/Card'
// or with the Vite alias:
import { Card } from 'ui'
```

The API is significantly different from `@sanity/ui`'s Card. There is no `padding`, `radius`, `shadow`, `scheme`, `selected`, `pressed`, `muted`, or individual `borderTop/Right/Bottom/Left` prop.

### API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | React element type | `'div'` | HTML element to render (e.g. `as="article"`, `as="section"`) |
| `tone` | `'default'`, `'neutral'`, `'primary'`, `'suggest'`, `'positive'`, `'caution'`, `'critical'` | `'default'` | Controls background and border color |
| `border` | boolean | `true` | Toggles the border. On by default. |
| `density` | `'tight'`, `'medium'`, `'loose'` | `'medium'` | Controls padding and border-radius together |
| `inverted` | boolean | `false` | Inverts the tone to use the dark color scheme |
| `className` | string | — | Additional CSS class names |
| `style` | React.CSSProperties | — | Inline styles |

#### Density

`density` replaces the separate `padding` and `radius` props from the previous API. Choose based on the visual weight of the surrounding layout:

| Value | Padding | Radius | Pixels | Use when |
|-------|---------|--------|--------|----------|
| `'tight'` | space-2 | radius-2 | **8px padding, 3px radius** | High-density lists, compact items, small cards |
| `'medium'` | space-3 | radius-3 | **12px padding, 7px radius** | Standard content cards — the default for most use cases |
| `'loose'` | space-4 | radius-4 | **20px padding, 11px radius** | Low-density layouts, prominent featured cards |

#### Why density couples padding and radius

`density` reflects the visual *weight* of a card at a given information density. At high density (tight spacing), a smaller radius matches the proportions. At low density, a larger radius fits the more spacious layout. Decoupling them frequently produces visual imbalance. If you need precise independent control, apply padding to a `Box` inside the Card and use `density="tight"` with `border={false}` on the Card itself.

#### Inverted

> ⛔ **`inverted` is for content cards only — never for structural layout regions.**
>
> Sanity UI interfaces maintain a consistent light theme for all structural elements. Do not use `inverted` on navigation sidebars, headers, toolbars, inspector panels, or any persistent UI shell region. Dark structural regions are not part of the design system and are not supported.
>
> `inverted` is intended exclusively for **content-level emphasis** within a light-themed layout — for example, an inline error callout, a feature highlight card, or a high-contrast status block embedded inside a content area.

`inverted={true}` switches a Card to a dark color scheme for the current `tone`. Each tone has a defined dark variant (e.g. `tone="critical"` inverted renders a dark red background with light text). Use sparingly and only within content, not structure.

### Card does not accept layout props

 ⛔ **Card silently ignores all flex-child and layout props. TypeScript does not error. No console warning fires. The props have zero effect.**

 The following props are all silently ignored when placed on Card:
 `flexGrow`, `flexShrink`, `flexBasis`, `minWidth`, `maxWidth`, `width`, `height`, `minHeight`, `overflow`, `overflowX`, `overflowY`, `position`, `inset`, `top`, `right`, `bottom`, `left`

 This is the most commonly broken Card pattern — reported in 30/30 iterations of agent testing.

 To apply layout properties alongside a Card surface, wrap the Card in a `Box` or `Flex`:

 ```tsx
 {/* ✗ — flexGrow={1} on Card silently does nothing. Layout breaks. No warning. */}
 <Card flexGrow={1}>...</Card>

 {/* ✗ — minWidth="0" on Card silently does nothing. Text overflows. No warning. */}
 <Card minWidth="0">...</Card>

 {/* ✓ — Box handles all layout; Card handles only the visual surface */}
 <Box flexGrow={1} minWidth="0" overflowY="auto">
   <Card>...</Card>
 </Box>
 ```

**Rule of thumb:** Card owns its appearance (`tone`, `border`, `density`, `inverted`). Box or Flex owns its position and size in the layout.

### When to use

- Group related content on a distinct background surface
- Show semantic status (error, warning, success) via `tone`
- Invert a section to dark with `inverted={true}`

### When not to use

- Layout without a distinct visual surface → use Box or Flex
- Structural UI regions (sidebars, toolbars, scroll containers) → use Box or Flex
- Clickable/tappable areas → use Button for full keyboard accessibility

### Dos and Don'ts

**Do**
- Use `tone` to communicate semantic status (`'critical'` for errors, `'caution'` for warnings, `'positive'` for success)
- Always pair a toned Card with an icon — do not rely on color alone
- Use `as="article"` or `as="section"` to improve document structure where appropriate
- Use `density` to match the surrounding layout density rather than overriding with inline style

**Don't**
- Don't use Card for structural UI regions (toolbars, sidebars, nav headers) — use Box
- Don't nest cards; use Box/Flex/Stack for internal layout within a card
- Don't add `onClick` to Card; use Button for interactive actions
- Don't use inline `style` for padding or border-radius — use `density` instead

### Tone values

| Value | Light background | Background token | Use case |
|-------|-----------------|-----------------|----------|
| `'default'` | gray-50 | `var(--gray-50)` | General use, no semantic emphasis |
| `'neutral'` | gray-100 | `var(--gray-100)` | Visual separation, "pinned" or "highlighted" card |
| `'primary'` | blue-50 | `var(--blue-50)` | Branded or educational content |
| `'suggest'` | purple-50 | `var(--purple-50)` | AI-generated suggestions |
| `'positive'` | green-50 | `var(--green-50)` | Success, completion, healthy status |
| `'caution'` | yellow-50 | `var(--yellow-50)` | Needs attention, non-blocking warning |
| `'critical'` | red-50 | `var(--red-50)` | Error, failure, blocking issue |

With `inverted={true}`, each tone uses a dark variant (e.g. `critical` inverted = red-900 bg + red-100 text).

### CSS custom properties and Card context

Card writes CSS custom properties onto its DOM subtree. Descendants can reference them for consistent styling:

| Variable | Description |
|----------|-------------|
| `--card-bg` | Background color of the card |
| `--card-border-color` | Border color of the card |
| `--card-color` | Text color (set in inverted mode; inherits otherwise) |

> **These variables are only available inside a `Card` ancestor.** Using them in a `Box` or custom element with no `Card` ancestor produces undefined values and no visual effect.
>
> If you need the color context without Card's visible surface, use `Card` with `border={false}`:
> ```tsx
> <Card border={false}>
>   {/* --card-bg, --card-border-color, --card-color are available here */}
> </Card>
> ```

### Accessibility

- **Semantic elements.** Use `as` to choose the correct HTML element:
  - `as="article"` — self-contained content (no accessible name required)
  - `as="section"` — requires a heading child or `aria-label` to register as a landmark (WCAG 1.3.1 A)
  - `as="aside"` — supplementary content; add `aria-label` when the role is not clear from context
- **Not a button.** Card has no keyboard activation, focus management, or ARIA role. Do not use `as="button"` — use the Button component for interactive actions.
- **Clickable cards.** If a card must be clickable, use a stretched link inside the card rather than adding `onClick` to the Card itself.
- **Tone and color.** Always pair a semantic tone with an icon or text label — never rely on color alone (WCAG 1.4.1 A).
- **Contrast.** Verify that any custom text inside a card maintains 4.5:1 contrast against the card's tone background (WCAG 1.4.3 AA).
- **Heading hierarchy.** Heading levels inside a Card must follow the page hierarchy — do not skip levels (WCAG 1.3.1 A).

### Content guidelines

- Limit card content to a single topic
- Heading levels inside a card must respect the overall page outline
- Content should be logically related; split different topics into separate cards

# Menu

The Menu component family is a set of interactive primitives used to build navigation and dropdown menus. It operates as a composition of several subcomponents that handle triggering, positioning, focus management, and item selection.

**Components:**

- **Menu:** The container element. It holds the items and manages focus flow (up/down navigation) .
- **MenuGroup:** A specialized item that triggers a nested submenu.
- **MenuItem:** The individual actionable element within the menu.
- **MenuDivider:** A visual separator used to group related items.

**Purpose** Menus are used to present a list of actions or options to the user in a temporary surface, saving screen real estate. They are typically triggered by a button and are best suited for secondary actions, settings, or command lists.

### API Documentation

#### Menu

The container for menu items.

_Refer to TypeDocs in Menu.tsx_

#### **MenuGroup**

A nested menu trigger.

_Refer to TypeDocs in MenuGroup.tsx_

#### **MenuItem**

An individual action within the menu.

_Refer to TypeDocs in MenuItem.tsx_

#### **MenuDivider**

An individual action within the menu.

_Refer to TypeDocs in MenuDivider.tsx_

### **Usage guidelines**

**When to use:**

- You have a set of secondary actions (like "Edit", "Delete", "Duplicate") that would clutter the UI if displayed individually .
- You need to display a list of settings or preferences triggered by a single button.
- MenuItem can be used within a navigational sidebar to display navigation items.

**When not to use:**

- You have fewer than 3 actions; consider displaying them inline as buttons or links for better discoverability.

### **Best practices**

**Do	**
- Always add `popover={{ portal: true }}` when the MenuButton is inside any `overflow: hidden` container.** Without it, the menu renders inside the clipped container and is invisible or partially cut off. This fails silently — no console error, no warning. The fix is one prop:

```
  // MenuButton inside any overflow: hidden container
  <MenuButton
    id="actions-menu"
    button={<Button text="Actions" icon={EllipsisHorizontalIcon} />}
    menu={
      <Menu>
        <MenuItem text="Edit" icon={EditIcon} />
        <MenuItem text="Delete" tone="critical" icon={TrashIcon} />
      </Menu>
    }
    popover={{ portal: true }}  {/* Required — omit and the menu clips */}
  />
```
 If your menu is invisible or clipped, `popover={{ portal: true }}` is almost certainly the fix.
- Use `MenuDivider` to group related actions (e.g., separating "Edit" actions from "Destructive" actions).
- Use the `hotkeys` prop to indicate keyboard shortcuts for power users.
- Use `tone="critical"` on `MenuItem`s that perform destructive actions like deletion.

**Don’t**

- Use caution when nesting `MenuGroup`s more than 2 levels deep. Deeply nested menus are difficult to navigate and prone to closing accidentally.
- Don’t put complex forms or interactive inputs inside a `MenuItem`. The Menu is designed for simple "one-click" actions or boolean toggles.
- Don’t use the `hotkeys` for keyboard shortcuts when the MenuItem’s purpose is navigational.

### **Variants**

#### Menu

##### Spacing

#### MenuGroup

#### MenuItem

##### Icon

Used as a visual

##### IconRight

Used exclusively for communicating what navigation action the user should expect.

- Don’t use an icon when a menu item sends a person to another page
- Use `<ChevronRightIcon />` when a menu item drills into child menu items
- Use `<LaunchIcon />` when the icon take a person to an external link or a new tab/window

##### Tone

- MenuItems used for Navigation should not utilize tone

##### Selected

- `Selected` should be set to true for the currently active menu item

##### Hotkeys

- Menu hotkeys should be used explicitly when representing an action. MenuItems used for Navigation should not utilize hotkeys

### Accessibility

- **Keyboard navigation:**
  - **Enter / Space / ArrowDown:** Opens the menu and focuses the first item.
  - **ArrowUp:** Opens the menu and focuses the last item.
  - **Arrow Up/Down:** Moves between items within the open menu.
  - **Arrow Right:** Opens a nested `MenuGroup`.
  - **Arrow Left:** Closes a nested `MenuGroup` and returns focus to the parent.
  - **Escape:** Closes the menu and restores focus to the trigger button.
- **ARIA roles.** Menu handles `role="menu"`, `role="menuitem"`, `aria-expanded`, and `aria-haspopup` on its own. The `role="menu"` replaces list semantics. Do not add `role="list"` alongside `role="menu"` — they conflict.
- **Accessible names.** Each MenuItem gets its accessible name from its visible text content. If a MenuItem uses only an icon, add `aria-label`.
- **Focus management.** The menu acts as a focus trap while open. Tab closes the menu to preserve document flow. Escape closes the menu and returns focus to the trigger.
- **Color independence.** MenuItems with `tone="critical"` must pair with an icon (e.g. `ErrorOutlineIcon`). Do not rely on the red color alone to convey the destructive meaning (WCAG 1.4.1 A).
- **Selected state contrast.** When a MenuItem is `selected`, the default theme applies a primary blue background (`#556bfc`) with white text. This produces a 4.29:1 contrast ratio — below the 4.5:1 AA threshold for standard-size text (WCAG 1.4.3 AA). For navigation menus where one item stays selected, avoid using the `selected` prop on text-bearing MenuItems. Mark the active item with a bold label or a left border accent instead.
- **MenuButton trigger names.** When the MenuButton trigger is icon-only, the trigger Button must have `aria-label`. The Menu component handles its own ARIA roles, but the trigger button does not inherit a name from the menu content.
- `MenuButton`** requires an **`id`** prop.** The `id` connects the trigger button to the menu for ARIA. Omitting it causes no console error, but screen readers cannot link the trigger to its popup.
- `popover={{ portal: true }}`** for clipped containers.** When a MenuButton sits inside a container with `overflow: hidden`, the menu gets clipped. Pass `popover={{ portal: true }}` to render the menu in a portal outside the overflow container.
- 

### **Content Guidelines**

- **Concise Labels:** Keep `MenuItem` text short (1-3 words). Use verbs that describe the action (e.g., "Rename", not "Change the name").
- **Sentence Case:** Use sentence case for all menu items (e.g., "Open in new tab").
- **Predictable Grouping:** Place destructive actions (like Delete) at the bottom of the list, ideally separated by a `MenuDivider` to prevent accidental clicks.
- **Consistent Icons:** If you use icons for some items in a group, try to use icons for all items in that group to maintain visual alignment.

# Popover



**Description** The Popover is a floating container used to display content on top of other UI elements. It is positioned relative to a reference element (usually a button or an input) and serves as a foundational primitive for building complex interactive components like menus, date pickers, and dropdowns,.

**Purpose** The Popover’s primary purpose is to present secondary information or lightweight tasks without cluttering the main interface or forcing the user to leave the current context. It manages its own positioning, collision detection (flipping/shifting), and stacking context (z-index),.

### **API Documentation**

### **When to Use / When Not to Use**

- **Use when:** You need to display a list of actions (menus), a date picker, or additional details related to a specific element on the screen.
- **Use when:** You need to conserve screen real estate by hiding secondary controls until requested.
- **Do not use when:** You need to display critical error information. Use inline form validation or banners instead to ensure visibility.
- **Do not use when:** The content is complex or requires a significant amount of user attention/input. Use a **Dialog** or **Modal** instead.

### **Usage Dos and Don’ts**

- **Do** use `portal={true}` (or let it default) if the popover is inside a container with `overflow: hidden`, ensuring the popover isn't clipped.
- **Do** use `matchReferenceWidth` for inputs like "Select" or "Autocomplete" dropdowns to maintain visual alignment with the field.
- **Don’t** overuse the `arrow` prop. It is helpful for tooltips or tutorials but often unnecessary for standard dropdown menus.
- **Don’t** place critical actions solely inside a popover if they block the user's primary workflow.

### **Variants & Examples**

**1. Basic Popover** A standard popover triggered by a button.

`<Popover`

`  content={<Box padding={3}><Text>Popover Content</Text></Box>}`

`  open={isOpen}`

`  placement="bottom"`

`>`

`  <Button onClick={toggle} text="Open Popover" />`

`</Popover>`

**2. With Arrow and Animation** Useful for contextual help or onboarding tips.

`<Popover`

`  arrow`

`  animate`

`  content={<Box padding={2}><Text>Helpful tip!</Text></Box>}`

`  open={true}`

`  tone="primary"`

`>`

`  <Button icon={InfoIcon} />`

`</Popover>`

**3. Dropdown Behavior (Match Width)** Ensures the popover is exactly as wide as the trigger element.

`<Popover`

`  matchReferenceWidth`

`  placement="bottom-start"`

`  content={<Menu>...</Menu>}`

`  open={isOpen}`

`>`

`  <SelectButton />`

`</Popover>`

### Accessibility

- **Focus management.** When a modal popover opens, focus must move into the popover. When it closes, focus must return to the trigger element (WCAG 2.4.3 A). For modal popovers, focus must be trapped inside — Tab should cycle within the popover, not escape to the page behind it. For non-modal popovers, focus may leave freely.
- **Focus target.** State where focus lands inside the popover. Options: the first focusable element, the popover container, or a named element.
- **Escape to dismiss.** Pressing `Escape` must close the popover and return focus to the trigger.
- **ARIA attributes on the trigger.** The trigger element must have `aria-haspopup` set to the popup type — `"dialog"`, `"menu"`, or `"listbox"`. Do not use `"true"` (it maps to `"menu"`). The trigger must also have `aria-expanded` set to `true` when open and `false` when closed (WCAG 4.1.2 A).
- **Accessible name for content.** The popover content must have an accessible name. Use `role="dialog"` with `aria-label` or `aria-labelledby` when the popover contains interactive content. Use `role="menu"` when the popover contains menu items.
- **Reduced motion.** The `animate` prop respects the user's `prefers-reduced-motion` setting.

### **Content Guidelines**

- **Concise:** Keep content brief. Popovers are for quick interactions, not long-form reading.
- **Action-Oriented:** If the popover contains a menu, use verbs for labels (e.g., "Edit," "Delete").
- **Sentence Case:** Use sentence case for any text headers or descriptions inside the popover (e.g., "Sort by date" not "Sort By Date").

# Select

Allows the user to choose one option from a dropdown list. Renders a native `<select>` element with Sanity UI visual styling.

**Source:** `@sanity/ui`
```tsx
import { Select } from '@sanity/ui'
```

### API documentation

_Refer to TypeDocs in Select.tsx_

> ⛔ **Always wrap `Select` in `Stack space={1}` with a `Label`. A bare Select has no accessible name — this is an axe `select-name` critical violation (WCAG 4.1.2 A). There are no exceptions.**

### Usage guidelines

**When to use:**
- Choosing exactly one value from a fixed, enumerable list (status, category, filter).
- Lists with more than 4–5 options where radio buttons would be too heavy.

**When not to use:**
- Binary choices (on/off, yes/no) — use **Switch** or **Checkbox**.
- Short lists of 2–3 options shown inline — use a **Button** group or radio buttons.
- Multi-select — `Select` does not support multiple selections. Compose a `Checkbox` list instead.
- Free-text input — use **TextInput**.

### `onChange` event handling

`Select` wraps the native `change` event. Always read the value from `event.currentTarget` and cast explicitly:

```tsx
<Select
  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.currentTarget.value)
  }}
>
  <option value="">All categories</option>
  <option value="politics">Local Politics</option>
  <option value="sports">Sports</option>
</Select>
```

> This pattern applies to all Sanity UI form inputs. See also: `textinput.md`.

### Children

`Select` renders native `<option>` elements as children. The dropdown panel appearance is controlled by the browser.

```tsx
<Stack space={2}>
  <Label htmlFor="status-filter">Status</Label>
  <Select
    id="status-filter"
    value={status}
    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
      setStatus(e.currentTarget.value)
    }
  >
    <option value="">All statuses</option>
    <option value="draft">Draft</option>
    <option value="review">In Review</option>
    <option value="published">Published</option>
  </Select>
</Stack>
```

### Accessibility

> ⛔ **Always wrap Select in `Stack space={1}` with a `Label`. A bare Select without an accessible name is an axe `select-name` critical violation (WCAG 4.1.2 A). There are no exceptions.**

- **Label association.** Every `Select` must have a `<Label>` via `htmlFor`/`id` or an `aria-label`. A select without an accessible name produces an axe `select-name` critical violation (WCAG 4.1.2 A).
- **Keyboard.** Natively keyboard-accessible — `Tab` to focus, arrow keys to navigate, `Enter`/`Space` to confirm.

```tsx
// ✗ — axe critical: select-name
<Select onChange={handleChange}>
  <option value="draft">Draft</option>
</Select>

// ✓
<Stack space={1}>
  <Label htmlFor="category-select">Category</Label>
  <Select
    id="category-select"
    value={category}
    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
      setCategory(e.currentTarget.value)
    }
  >
    <option value="">All</option>
    <option value="politics">Local Politics</option>
  </Select>
</Stack>
```

### Known limitations

- **No multi-select variant.** Use a composed `Checkbox` list for multiple selections.
- **No custom styled dropdown.** The panel appearance is controlled by the OS. For a fully custom dropdown, use `MenuButton` with `MenuItem` options.
- **Visual alignment with TextInput.** Subtle height and padding differences may appear across browsers. Wrap both in a `Stack space={2}` for consistent rhythm.

# Table

Sanity UI does not include a `Table` or `DataGrid` component. Tabular data is built with native HTML `<table>` elements styled to match the Sanity UI visual language.

> ⛔ **Do not use `var(--card-border-color)` for table cell borders.** This variable is only defined inside a `Card` ancestor — outside one it is `undefined` and borders are invisible with no error. Use `var(--gray-200)` instead. It resolves to the same visual value and works everywhere.

### When to use a table

- Structured data with multiple aligned columns (asset lists, article queues, session schedules)
- When the user needs to scan and compare values across rows
- When data density is high and a card grid would be too heavy

### When not to use a table

- Simple vertical lists with one or two data points per item — use `Stack` with `Card`
- For layout — use `Box`, `Flex`, or `Grid`

---

### Table styles belong in CSS, not inline

> ⛔ **Do not put `style={{...}}` on `<table>`, `<th>`, `<td>`, or `<tr>`.** Table styling is repetitive — the same padding, border, and font rules apply to every cell. Inline styles on each element produce dozens of `style={{...}}` per table. Put table styles in `global.css` using existing Sanity UI palette and spacing tokens.

### global.css — table styles

Add these rules to your `global.css` file (the same file imported in `main.tsx`). Every table in the app inherits them with zero inline styles.

```css
/* global.css — table styles using Sanity UI tokens */

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 2px solid var(--gray-200);
  font: var(--label-2);
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--gray-200);
  vertical-align: middle;
}

tr:hover td {
  background: var(--gray-50);
}

/* Optional: selected row */
tr[data-selected='true'] td {
  background: var(--blue-50);
}

/* Optional: clickable rows */
tbody tr {
  cursor: pointer;
}

/* Scrollable wrapper — use <Box overflow="auto"> around the table */
table {
  min-width: 600px;
}
```

### Basic pattern

With the CSS above in `global.css`, the JSX is clean — no `style` prop on any table element:

```tsx
<Box overflow="auto">
  <table>
    <thead>
      <tr>
        <th><Text size={0} weight="semibold" color="muted">Title</Text></th>
        <th><Text size={0} weight="semibold" color="muted">Status</Text></th>
        <th><Text size={0} weight="semibold" color="muted">Last updated</Text></th>
      </tr>
    </thead>
    <tbody>
      {rows.map(row => (
        <tr key={row.id} onClick={() => setSelected(row.id)} data-selected={selected === row.id}>
          <td><Text size={1} weight="medium">{row.title}</Text></td>
          <td><Badge tone={row.tone}>{row.status}</Badge></td>
          <td><Text size={1} color="muted">{row.date}</Text></td>
        </tr>
      ))}
    </tbody>
  </table>
</Box>
```

### Always wrap text in table cells

> ⚠️ **Every `<th>` and `<td>` must wrap its text content in a Sanity UI `Text`, `Label`, or `Badge` component.** Do not render bare strings as direct children of table cells. Bare text inherits the browser's default font and size, which does not match the Sanity UI type scale.

```tsx
{/* ✗ — bare string in <th>, no Sanity UI typography */}
<th>Title</th>

{/* ✓ — Text component controls font, size, weight, color */}
<th><Text size={0} weight="semibold" color="muted">Title</Text></th>
```

```tsx
{/* ✗ — bare string in <td> */}
<td>{row.title}</td>

{/* ✓ — Text controls all typography */}
<td><Text size={1}>{row.title}</Text></td>
```

For cells that contain a Badge, the Badge itself handles typography — no extra Text wrapper needed:

```tsx
<td><Badge tone="positive">Published</Badge></td>
```

### Color tokens

These are the existing Sanity UI palette tokens to use for table styling in CSS. All are globally available on `:root` — they work outside a Card ancestor.

| Element | Token | Notes |
|---------|-------|-------|
| Cell border | `var(--gray-200)` | Use this, not `--card-border-color` |
| Header text | `var(--gray-600)` | Muted label color |
| Row hover | `var(--gray-50)` | Subtle tint |
| Selected row | `var(--blue-50)` | Light blue selection |
| Cell padding | `var(--space-2) var(--space-3)` | 8px 12px from the spacing scale |
| Header font | `var(--label-2)` | 10.8px/1.25, matches Label `size={2}` |

> **Do not use `var(--card-border-color)` on table cells.** Outside a `Card` ancestor it is undefined — borders become invisible. `var(--gray-200)` is the same value and resolves everywhere.

### Scrollable tables

Wrap the table in `<Box overflow="auto">` and set a `min-width` on the table in CSS (see global.css above). No inline style needed:

```tsx
<Box overflow="auto">
  <table>
    {/* table content — min-width comes from global.css */}
  </table>
</Box>
```

### Accessibility

- **Table headers must have text.** Empty `<th>` elements produce an axe `empty-table-header` violation. Wrap header text in `<Text>` — do not leave `<th>` elements empty.
- **Use `<thead>` and `<tbody>`.** Screen readers use these to distinguish headers from data rows.
- **Sort controls.** Sortable `<th>` elements need `aria-sort="ascending"` or `"descending"` when active and a `<button>` child to trigger sorting.
- **Row selection.** Selectable rows need `role="checkbox"` on the selection cell and `aria-checked` on each checkbox.
- **Captions.** Add `<caption>` as the first child of `<table>` for complex tables.

### Cross-references

- `patterns-custom-theming.md` — How to override palette tokens for branded table styles
- `style-overrides.md` — Full list of CSS properties that have prop equivalents
- `silent-failures.md` #9 — `--card-border-color` outside Card

# Switch

A toggle control for binary on/off settings. Renders a styled checkbox input with accessible labelling.

**Source:** `@sanity/ui`
```tsx
import { Switch } from '@sanity/ui'
```

### API documentation

_Refer to TypeDocs in Switch.tsx_

### Usage guidelines

**When to use:**
- Toggling a boolean setting that takes effect immediately (e.g. "Enable notifications", "Show deprecated items").

**When not to use:**
- Choosing between more than two options — use **Select** or **Radio** instead.
- A form field that requires explicit submission — use **Checkbox** instead, so the user controls when the change is applied.

### `onChange` event handling

`Switch` fires a `React.ChangeEvent<HTMLInputElement>`. Read the new boolean state from `event.currentTarget.checked`:

```tsx
<Switch
  checked={isEnabled}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
    setIsEnabled(e.currentTarget.checked)
  }}
/>
```

`currentTarget.checked` is `true` when the switch is on and `false` when off — it reflects the *new* state after the toggle, not the previous state.

> **Do not** use a functional updater like `() => setVal(v => !v)` unless you specifically want to ignore the event value. Reading `checked` directly from the event is cleaner and more explicit.

### Full example with label

```tsx
<Flex alignItems="center" gap={3}>
  <Switch
    id="show-deprecated"
    checked={showDeprecated}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
      setShowDeprecated(e.currentTarget.checked)
    }
  />
  <Label htmlFor="show-deprecated">Show deprecated entries</Label>
</Flex>
```

### Accessibility

- **Label association.** Always pair Switch with a visible `<Label>` linked via `htmlFor`/`id`, or provide an `aria-label`.
- **Role.** Switch renders as `<input type="checkbox">` with `role="switch"` implied by its visual affordance. Screen readers announce it as a toggle.
- **Keyboard.** `Tab` to focus, `Space` to toggle.

### Content guidelines

- Use present-tense verb phrases: "Enable feature flags", "Show archived items".
- Avoid negations: prefer "Show muted" over "Hide unmuted".
- The label should describe the *on* state.

# Badge

A small label used to communicate status, category, count, or other metadata inline.

**Source:** `@sanity/ui`
```tsx
import { Badge } from '@sanity/ui'
```

### API documentation

_Refer to TypeDocs in Badge.tsx_

### Usage guidelines

**When to use:**
- Communicating status (Published, Draft, Deprecated, In Review).
- Labelling categories, tag or types inline within a list or table.
- Showing counts or numeric indicators.

**When not to use:**
- For actions — use **Button**.
- For long text — keep badge labels to 1–3 words.

### Tone

Badge accepts the same tone values as Card and Button:

| Tone | Visual | Use for |
|------|--------|---------|
| `'default'` | Gray | Neutral / no semantic meaning |
| `'positive'` | Green | Success, published, healthy |
| `'caution'` | Yellow/amber | Needs attention, in review |
| `'critical'` | Red | Error, failed, rejected, deprecated |
| `'primary'` | Blue | Informational, branded |

```tsx
<Badge tone="positive">Published</Badge>
<Badge tone="caution">In Review</Badge>
<Badge tone="critical">Deprecated</Badge>
<Badge tone="default">Draft</Badge>
```

> ⚠️ **`tone="primary"` may fail WCAG AA contrast at small sizes.** The primary blue (`#556bfc`) with white text produces a 4.29:1 contrast ratio — below the 4.5:1 AA threshold for text under 18px. For small badges (`fontSize` below default), prefer `tone="default"` with a text label. See `button.md` for the same constraint on Button.

### `icon` prop

Badge accepts an optional `icon` prop for a leading icon. Pass the **component reference** — not a JSX element:

```tsx
{/* ✗ — JSX element, not a component reference */}
<Badge tone="positive" icon={<CheckmarkCircleIcon />}>Published</Badge>

{/* ✓ — pass the component itself (no angle brackets, no JSX) */}
<Badge tone="positive" icon={CheckmarkCircleIcon}>Published</Badge>
```

The `icon` prop accepts an icon component directly:

The TypeScript type for `icon` is `React.ComponentType<{}>` — a component reference, not a rendered JSX element.

```tsx
import { CheckmarkCircleIcon, WarningOutlineIcon, ErrorOutlineIcon, ClockIcon } from '@sanity/icons'

<Badge tone="positive" icon={CheckmarkCircleIcon}>Published</Badge>
<Badge tone="caution" icon={ClockIcon}>In Review</Badge>
<Badge tone="critical" icon={ErrorOutlineIcon}>Rejected</Badge>
<Badge tone="critical" icon={WarningOutlineIcon}>Deprecated</Badge>
```

> **Always pair a toned Badge with a matching icon.** Color alone is not sufficient to communicate meaning (WCAG 1.4.1 A).

### HTTP method badges

A common pattern in API documentation interfaces:

```tsx
const METHOD_TONES = {
  GET:    'positive',
  POST:   'primary',
  PUT:    'caution',
  DELETE: 'critical',
  PATCH:  'caution',
} as const

<Badge tone={METHOD_TONES[method]}>{method}</Badge>
```

### Accessibility

- **Color alone is insufficient.** Always pair a toned Badge with a text label that communicates the same meaning. Do not use tone color as the only signal.
- **`fontSize` prop.** Badge accepts a `fontSize` prop for size adjustment. Use with care — badge text below 12px may fail contrast requirements.

# TextArea

Multi-line text input. An alternative to the native `<textarea>` that integrates with the Sanity UI visual system.

**Source:** `@sanity/ui`
```tsx
import { TextArea } from '@sanity/ui'
```

### API documentation

_Refer to TypeDocs in TextArea.tsx_

### Usage guidelines

**When to use:**
- Multi-line free text: abstracts, body content, descriptions, comments.
- Technical content where the user expects a multi-line editing surface.

**When not to use:**
- Single-line input — use **TextInput**.
- Selecting from a list — use **Select**.
- Rich text editing — use a dedicated editor component.

### `rows` prop

`rows` sets the visible height of the textarea in lines of text. Use it to suggest the expected content length:

```tsx
<TextArea rows={3} placeholder="Short description..." />   {/* ~3 lines */}
<TextArea rows={8} placeholder="Full body content..." />   {/* ~8 lines */}
<TextArea rows={12} placeholder="Response schema..." />    {/* ~12 lines */}
```

The textarea remains resizable by default. Users can drag to expand beyond the `rows` height.

### Disabling resize

`TextArea` does not have a `resize` prop. To prevent users from resizing the textarea, use an inline style — this is one of the documented acceptable cases for inline styles since no prop equivalent exists:

```tsx
<TextArea rows={4} style={{ resize: 'none' }} />
```

When disabling resize, set `rows` generously enough to accommodate typical content — a hidden resize handle removes the user's escape hatch for longer content.

### Monospace font for code or schema fields

For technical content (response schemas, code templates, configuration), apply a monospace font via an inline style override:

```tsx
<TextArea
  rows={8}
  style={{ fontFamily: 'monospace', fontSize: '13px' }}
  placeholder={'{
  "id": "string",
  "name": "string"
}'}
/>
```

### `onChange` event handling

Same pattern as `TextInput` — use `event.currentTarget.value` and cast explicitly:

```tsx
<TextArea
  rows={6}
  value={body}
  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBody(e.currentTarget.value)
  }}
/>
```

### Full example with label

```tsx
<Stack space={2}>
  <Label htmlFor="guide-body">Body</Label>
  <TextArea
    id="guide-body"
    rows={8}
    value={body}
    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setBody(e.currentTarget.value)
    }
    placeholder="Write guide content here..."
  />
</Stack>
```

### Accessibility

- **Label association.** Every TextArea must have a `<Label>` via `htmlFor`/`id` or an `aria-label`.
- **Keyboard.** Natively keyboard-accessible — `Tab` to focus, standard text editing keys apply.
- **Resize.** The default resize handle is accessible via pointer. If you disable resize, ensure the default `rows` is generous enough for expected content.
