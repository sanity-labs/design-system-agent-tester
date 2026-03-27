Create a simple interface that mimics Sanity Studio using Sanity UI.  

# Instructions
* DO NOT USE OLDER VERSIONS OF SANITY ICONS OR SANITY UI.
* Use the latest version of Sanity Icons and Sanity UI for the interface. YOU ARE NOT ALLOWED INSTALL A SPECIFIC VERSION. YOU HAVE TO EXPLICITLY INSTALL THE LATEST VERSION OF EACH PACKAGE WITH THE FOLLOWING COMMANDS:
  * Sanity icons: `npm i @sanity/icons@latest`
  * Sanity UI: `npm i @sanity/ui@latest`
* Rely on [Sanity UI's documentation site](https://www.sanity.io/ui) and the guidelines below for guidance on how to use the UI library.
* The project should be built on top of Vite
* Use as few NPM packagess as possible 
* Do not add unit tests of any kind
* Provide feedback on areas of friction when using Sanity UI, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.

**Sanity UI guidelines below**

---

# Quick start

This guide walks you through setting up a Sanity UI project from scratch. By the end you will have a working Vite + React app with a sidebar, toolbar, content area, and proper accessibility structure.

## Create the project

Start with a Vite project and add the three packages Sanity UI needs.

```sh
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install @sanity/ui @sanity/icons styled-components
```

## Project structure

After setup, you will have these files:

```
my-app/
├── index.html
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    └── reduced-motion.css
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

Sanity UI buttons and interactive parts apply `transition-duration: 0.1s` through styled-components. These transitions do not respect `prefers-reduced-motion` at the library level. This file overrides them. Import it in `main.tsx`. It is required in every project.

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

## main.tsx

Wrap the app in `ThemeProvider` with `studioTheme`. This gives every child component access to colors, spacing, and typography tokens. Import `reduced-motion.css` here.

**`studioTheme` vs `buildTheme()`.** The quick-start uses `studioTheme` from `@sanity/ui` — a ready-made theme. You can also use `buildTheme()` from `@sanity/ui/theme`, which produces the same result. Use `buildTheme()` when you need to pass custom options.

**Toast support.** If you use `useToast()` in your app, wrap the tree in a `ToastProvider` alongside `ThemeProvider`. `ThemeProvider` does not include a toast context by default.

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, studioTheme } from '@sanity/ui'
import App from './App'
import './reduced-motion.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={studioTheme}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
```

## App.tsx — full scaffold

This file creates a three-region layout: a navigation sidebar, a main content area with a toolbar, and a list of items. It follows the accessibility standards from the component documentation.

```tsx
import { useState } from 'react'
import {
  Flex,
  Card,
  Stack,
  Heading,
  Text,
  Button,
  TextInput,
  Label,
  Badge,
} from '@sanity/ui'
import { SearchIcon, AddIcon, MenuIcon, CloseIcon } from '@sanity/icons'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <Flex wrap="wrap" style={{ minHeight: '100vh' }}>
      {/* Navigation sidebar — renders as <nav> landmark */}
      {sidebarOpen && (
        <Card
          as="nav"
          aria-label="Main navigation"
          borderRight
          style={{ flex: '1 1 100%', maxWidth: '260px' }}
          padding={0}
        >
          <Stack>
            <Card padding={3} borderBottom>
              <Flex align="center" justify="space-between">
                <Heading as="h1" size={0}>Studio</Heading>
                <Button
                  mode="bleed"
                  icon={CloseIcon}
                  aria-label="Close navigation"
                  onClick={() => setSidebarOpen(false)}
                />
              </Flex>
            </Card>
            <Card padding={3}>
              <Stack space={3}>
                <Stack space={2}>
                  <Label size={0} htmlFor="nav-search">Search</Label>
                  <TextInput
                    id="nav-search"
                    icon={SearchIcon}
                    placeholder="Search content..."
                    aria-label="Search content"
                  />
                </Stack>
                <Stack space={2}>
                  <Text size={1} weight="medium">Documents</Text>
                  <Text size={1} muted>Authors</Text>
                  <Text size={1} muted>Settings</Text>
                </Stack>
              </Stack>
            </Card>
          </Stack>
        </Card>
      )}

      {/* Main content — renders as <main> landmark */}
      <Card
        as="main"
        style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Toolbar */}
        <Card padding={3} borderBottom>
          <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
            <Flex align="center" gap={3} style={{ minWidth: 0 }}>
              {!sidebarOpen && (
                <Button
                  mode="bleed"
                  icon={MenuIcon}
                  aria-label="Show navigation"
                  onClick={() => setSidebarOpen(true)}
                />
              )}
              <Heading as="h2" size={0} style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>All Documents</Heading>
            </Flex>
            <Button text="New document" icon={AddIcon} tone="default" />
          </Flex>
        </Card>

        {/* Content list */}
        <Card padding={4} style={{ flex: 1, overflowY: 'auto' }}>
          <Stack space={3}>
            {['Getting Started', 'API Reference', 'Design Tokens'].map(
              (title) => (
                <Card key={title} padding={3} border radius={2}>
                  <Flex align="center" justify="space-between">
                    <Stack space={2}>
                      <Heading as="h2" size={0}>{title}</Heading>
                      <Text size={1} muted>Last edited 2 hours ago</Text>
                    </Stack>
                    <Badge tone="positive">Published</Badge>
                  </Flex>
                </Card>
              ),
            )}
          </Stack>
        </Card>
      </Card>
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

| Feature | How it works |
| --- | --- |
| Landmark structure | `Card as="nav"` and `Card as="main"` create `<nav>` and `<main>` elements. Screen readers list them as landmarks. |
| Responsive sidebar | `flex: '1 1 100%'` with `maxWidth` on the sidebar and `wrap="wrap"` on the Flex container. At 320px the sidebar stacks above the content instead of overflowing. |
| Toolbar reflow | `wrap="wrap"` on the toolbar Flex. The heading and button flow to separate lines at narrow widths instead of overflowing. |
| Heading hierarchy | `<h1>` for the page title, `<h2>` for each section and list item. No levels are skipped. |
| Page language | `<html lang="en">` in `index.html`. |
| Icon-only buttons | `aria-label` on every button that has no visible text (`CloseIcon`, `MenuIcon`). |
| Form labels | `<Label htmlFor="nav-search">` links to the `TextInput` by `id`. The input also has `aria-label` as a fallback. |
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

### Card is a layout surface with color context

Card renders a styled container with background, border, and optional tone. Use `as` to set the HTML element.

```tsx
{/* A navigation landmark — responsive width */}
<Card
  as="nav"
  aria-label="Main navigation"
  padding={3}
  borderRight
  style={{ flex: '1 1 100%', maxWidth: '260px' }}
>
  {/* content */}
</Card>

{/* A content surface */}
<Card padding={4} border radius={2}>
  {/* content */}
</Card>
```

### Stack spaces children in a vertical column
Stack adds even spacing between children. Use `space` to set the gap. Always stack Text/Heading pairings with `<Stack>` or `<Flex>`. Text and Heading components require explicit vertical spacing between them because they have all vertical spacing stripped.

```tsx
<Stack space={3}>
  <Heading as="h2" size={0}>Title</Heading>
  <Text size={1}>Description</Text>
</Stack>
```

### Flex lays children out in a row

Flex defaults to horizontal direction. Use `align`, `justify`, `gap`, and `wrap` to control the layout. Add `wrap="wrap"` to any row that might overflow at narrow widths.

```tsx
<Flex align="center" justify="space-between" wrap="wrap" gap={2}>
  <Heading as="h1" size={0}>Page Title</Heading>
  <Button text="Action" />
</Flex>
```

### Heading needs an `as` prop

The Heading component renders a `<div>` by default. That has no heading role. Always set `as` to `h1`–`h6`. Use `size` for visual sizing.

```tsx
{/* ✗ No heading role — screen readers skip it */}
<Heading size={0}>Title</Heading>

{/* ✓ Renders as <h1> with heading role */}
<Heading as="h1" size={0}>Title</Heading>
```

### Icon-only buttons need aria-label

When a button has only an icon and no `text` prop, add `aria-label`. The `tooltip` prop does not set an accessible name.

```tsx
{/* ✗ No accessible name */}
<Button icon={SearchIcon} mode="bleed" />

{/* ✓ Screen readers announce "Search" */}
<Button icon={SearchIcon} mode="bleed" aria-label="Search" />
```

### Form inputs need labels

A `placeholder` is not a label. Use `<Label>` with `htmlFor` or set `aria-label` on the input.

```tsx
<Stack space={2}>
  <Label size={0} htmlFor="search-field">Search</Label>
  <TextInput id="search-field" placeholder="Type to search..." />
</Stack>
```

## Next steps

- Add an inspector sidebar with `Card as="aside" aria-label="Inspector"`.
- Add a `Menu` and `MenuButton` for dropdown actions.
- Use `tone` on Card and Button to show status (`"positive"`, `"caution"`, `"critical"`). Pair each tone with an icon.
- See the component docs for Button, Card, Stack, Flex, Heading, and Text for full prop references and accessibility guidelines.

# Accessibility standards

This document helps designers and developers build accessible interfaces with Sanity UI components. It covers the rules you need to follow, the mistakes to avoid, and tested code patterns you can copy.

**Start here → [Full page scaffold](#full-page-scaffold).** Copy the scaffold at the bottom of this document as your starting point. It passes all automated accessibility tests. Then read the rules below to understand why each piece matters.

For guidelines on building or documenting Sanity UI components themselves, see `component-authoring-accessibility.md`.

---

## Do / Don't quick reference

Scan this list before building. Each rule links to a section below with full details and code examples.

**Landmarks and structure (§1)**

- ✓ Do wrap your content area in `Card as="main"`.
- ✓ Do wrap sidebars in `Card as="nav"` with `aria-label`.
- ✗ Don't build a page with only `<div>` containers and no landmark elements.

**Headings (§2)**

- ✓ Do set `as="h1"` on the page title and `as="h2"` on list items below it.
- ✓ Do use `size` for visual sizing — it is independent of the heading level.
- ✓ Do use `as="h2"` for the sidebar/app name. Only the content area title is h1.
- ✗ Don't skip from `h1` to `h3`. Use `h2` for the next level down.
- ✗ Don't use two `h1` elements. One page, one h1.
- ✗ Don't omit the `as` prop on Heading. The default `<div>` has no heading role.

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

- ✓ Do add `wrap="wrap"` to every horizontal `Flex` that holds more than one child.
- ✓ Do set `overflow: 'hidden'` on the content Card.
- ✓ Do use `flex: '1 1 100%'` with `maxWidth` on sidebars.
- ✗ Don't use `width` with `flexShrink: 0` on sidebars. It creates a rigid column.
- ✗ Don't use `height: '100vh'` on the outer Flex. Use `minHeight: '100vh'`.
- ✗ Don't build a toolbar `Flex` without `wrap="wrap"`. It overflows at 320px.

**HTML lang (§8)**

- ✓ Do set `<html lang="en">` (or the correct code) in `index.html`.

---

## 1. Landmarks and page structure

### Use landmarks for screen reader navigation

Every page must have at least one `<main>` landmark. A layout with a sidebar should also include `<nav>` and `<aside>`. Without landmarks, screen reader users experience the page as a flat list of elements.

Use the `as` prop on Card to render landmark elements:

```jsx
<Card as="nav" aria-label="Main navigation">...</Card>
<Card as="main">...</Card>
<Card as="aside" aria-label="Document inspector">...</Card>
```

### Label landmarks when needed

| Element | When to label |
| --- | --- |
| `<nav>` | Add `aria-label` when more than one `<nav>` exists on the page. Without it, screen readers list multiple "navigation" landmarks with no way to tell them apart. |
| `<section>` | Add a heading child or `aria-label`. Without an accessible name, `<section>` is the same as `<div>`. |
| `<main>` | Use once per page. No label needed. |
| `<aside>` | Add `aria-label` when the role is not clear from context. |
| `<form>` | Add `aria-label`, `aria-labelledby`, or a `<legend>` inside a `<fieldset>`. |
| `<header>`, `<footer>` | At page level they act as `banner` and `contentinfo` landmarks. Nested inside `<main>` or `<section>`, they scope to that region. |

---

## 2. Headings

### Every page needs exactly one h1

Headings give screen reader users an outline of the page. A page with zero headings forces users to read every element in sequence. Use `<Heading as="h1">` for the page title and `<Heading as="h2">` for each major section.

**Only one h1 per page.** The h1 is the main content title — not the app name or studio label. If your sidebar has a heading like "My Studio," make it `<Heading as="h2">`. The content area title ("All Documents") is the h1. Two h1 elements confuse screen readers about which heading represents the page.

```jsx
/* ✗ Two h1 elements — screen readers cannot determine the page title */
<Card as="nav"><Heading as="h1" size={1}>My Studio</Heading></Card>
<Card as="main"><Heading as="h1" size={2}>Documents</Heading></Card>

/* ✓ One h1 for the page title — sidebar heading is h2 */
<Card as="nav"><Heading as="h2" size={1}>My Studio</Heading></Card>
<Card as="main"><Heading as="h1" size={2}>Documents</Heading></Card>
```

### Always set the `as` prop

The Heading component renders a `<div>` by default. That has no heading role. Screen readers skip it.

```jsx
/* ✗ Looks like a heading but has no heading role */
<Heading size={2}>Page Title</Heading>

/* ✓ Renders as <h1> — screen readers find it */
<Heading as="h1" size={2}>Page Title</Heading>
```

### Do not skip heading levels

Heading levels must descend in sequence: H1 → H2 → H3. Do not skip from H1 to H3. The `as` prop sets the semantic level. The `size` prop sets the visual size. They are independent.

**Rule: items in a list under an h1 are h2, not h3.** This is the most common heading skip. When a page title is `<Heading as="h1">` and you show a list of documents below it, each document heading must be `<Heading as="h2" size={1}>`. Use `size={1}` to make h2 look small. Never match `as` to the visual weight.

```jsx
/* ✗ Skips h2 — agents default to h3 for "small" list items */
<Heading as="h1" size={3}>All Documents</Heading>
<Card padding={3} border>
  <Heading as="h3" size={1}>Getting Started Guide</Heading>
</Card>

/* ✓ h2 follows h1 — use size={1} to make it look small */
<Heading as="h1" size={3}>All Documents</Heading>
<Card padding={3} border>
  <Heading as="h2" size={1}>Getting Started Guide</Heading>
</Card>
```

---

## 3. Accessible names

### Icon-only buttons need `aria-label`

When a Button has only an icon and no `text` prop, it has no accessible name. The `tooltip` prop renders visible hover text but does not set `aria-label`. You must add it yourself.

```jsx
/* ✗ No accessible name — screen readers say "button" */
<Button icon={SearchIcon} mode="bleed" />

/* ✗ Tooltip does not set aria-label */
<Button icon={SearchIcon} mode="bleed" tooltip={{ content: 'Search' }} />

/* ✓ Screen readers announce "Search" */
<Button icon={SearchIcon} mode="bleed" aria-label="Search" />
```

The same applies to MenuButton triggers:

```jsx
/* ✗ Trigger has no accessible name */
<MenuButton
  id="doc-menu"
  button={<Button icon={EllipsisVerticalIcon} mode="bleed" />}
  menu={<Menu><MenuItem text="Edit" /></Menu>}
/>

/* ✓ Trigger has aria-label */
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
/* ✗ Placeholder is not a label */
<TextInput placeholder="Search content..." />

/* ✓ aria-label */
<TextInput placeholder="Search content..." aria-label="Search content" />

/* ✓ Visible label linked by id */
<Stack space={2}>
  <Label size={0} htmlFor="search-input">Search</Label>
  <TextInput id="search-input" placeholder="Search content..." />
</Stack>
```

### Tooltips must not repeat the accessible name

If a button already has `aria-label="Settings"`, a tooltip that also says "Settings" adds no value. The tooltip should provide extra context or be omitted.

---

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

The fix: **use `tone="default"`** for primary actions. For navigation menus, avoid using `selected` on MenuItems that display text content. Use a left border accent or bold text to mark the active item instead.

**`mode="ghost"` with `tone="primary"` does NOT always pass.** At 13px normal weight, the primary blue text (`#556bfc`) on the light blue ghost tint (`#e5edff`) produces 3.65:1 — below 4.5:1 AA. Ghost mode only passes for large or bold text. Do not use it for standard-size nav item text.

```jsx
/* ✗ Fails contrast — 4.29:1 (white on primary blue) */
<Button tone="primary" text="New document" />

/* ✗ Fails contrast — selected MenuItem uses primary blue background */
<MenuItem text="Documents" selected />

/* ✗ May fail contrast — ghost primary at standard font sizes (3.65:1) */
<Button tone="primary" mode="ghost" text="Nav item" />

/* ✓ Passes — use tone="default" for buttons */
<Button tone="default" text="New document" />
```

### Do not build custom colored elements with white text

Agents sometimes build custom avatar circles, status badges, or nav items using hardcoded background colors from the palette with white text. Many palette colors fail contrast at small text sizes:

| Color | Hex | White text contrast | Passes AA at 13px? |
| --- | --- | --- | --- |
| Primary blue | `#556bfc` | 4.29:1 | ✗ No |
| Positive green | `#04b97a` | 2.55:1 | ✗ No |
| Caution yellow | `#d28a04` | 2.96:1 | ✗ No |

Use the Sanity UI `Avatar` component for user initials — it handles contrast. For status indicators, use `Badge` with a `tone` prop. Do not build custom elements with `background: <palette color>` and `color: white`.

### Pair semantic color with a non-color indicator

Color must not be the only way to convey meaning. Every use of `tone="positive"`, `tone="caution"`, or `tone="critical"` must include an icon, a text label, or both (WCAG 1.4.1 A).

```jsx
/* ✗ Color alone — users with color vision differences miss the meaning */
<Button tone="critical" text="Delete" />

/* ✓ Icon reinforces the meaning */
<Button tone="critical" text="Delete" icon={TrashIcon} />
```

### Do not add `aria-selected` to plain `<div>` elements

The `aria-selected` attribute is only valid on elements with roles like `option`, `row`, `tab`, `gridcell`, or `treeitem`. A `<div>` with no explicit role cannot carry `aria-selected`. Automated tests flag this as a critical violation (WCAG 4.1.2 A).

Card's `selected` prop sets `data-selected` for styling. It does NOT set `aria-selected`. If you need a selectable list of Cards, either:

- Use `role="listbox"` on the container and `role="option"` on each Card, which allows `aria-selected`.
- Or skip `aria-selected` and use `aria-current="true"` to mark the active item. `aria-current` is valid on any element.


---

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

```jsx
// main.tsx
import './reduced-motion.css'
```

The `0.01ms` value triggers transition-end events that some components rely on, but it is fast enough to count as instant. Automated tests treat any duration under 1ms as passing.

Without this file, every Button on the page will fail the motion accessibility test.

---

## 6. Touch targets

### Minimum 24×24 CSS pixels

All interactive targets must meet 24×24 CSS pixels (WCAG 2.5.8 AA). Inline links within paragraph text are exempt.

### Keep 24px spacing between adjacent targets

The 24×24px rule applies to the clickable area, not only the visual size. When buttons sit next to each other in a toolbar, each button must have at least 24px of unobscured clickable space. Buttons placed with `gap={1}` (4px) may overlap each other's target zones. Use `gap={2}` (8px) or higher between adjacent buttons in toolbars and action rows.

```jsx
/* ✗ Buttons too close — target zones overlap */
<Flex gap={1}>
  <Button icon={AddIcon} mode="bleed" aria-label="New document" />
  <Button icon={CloseIcon} mode="bleed" aria-label="Hide navigation" />
</Flex>

/* ✓ Enough space between targets */
<Flex gap={2}>
  <Button icon={AddIcon} mode="bleed" aria-label="New document" />
  <Button icon={CloseIcon} mode="bleed" aria-label="Hide navigation" />
</Flex>
```

### Do not use bare native inputs

Browser-default `<input type="checkbox">` and `<input type="radio">` render at about 13×13px. Use the Sanity UI `Checkbox`, `Radio`, or `Switch` components instead — they render at compliant sizes.

Bare `<input type="text">` elements with custom styling can also fall below the 24px minimum height. Use `TextInput` from `@sanity/ui` instead — it renders at compliant sizes and handles theming. If you must use a native input, set `min-height: 24px` and use `padding` to reach the target size.

If you must use a native checkbox or radio, wrap it in a `<label>` with enough padding to reach 24×24px, or apply CSS to set `width` and `height` to at least 24px.

---

## 7. Responsive layout — 320px reflow

Layouts must work at 320px viewport width with no horizontal scrolling (WCAG 1.4.10 AA). This simulates 400% zoom on a 1280px screen.

**Every `<Flex>` with more than one child must have `wrap="wrap"`.** This applies at every level of the component tree — the outer layout Flex, the toolbar Flex inside the content area, the actions row inside a card, and any other horizontal row. A single non-wrapping Flex is enough to cause overflow at 320px. There are no exceptions.

**Reflow checklist.** Before shipping, confirm each of these. A single missed item causes the test to fail.

- [ ] Outer layout Flex has `wrap="wrap"`
- [ ] Sidebar uses `flex: '1 1 100%'` with `maxWidth`, not `width` with `flexShrink: 0`
- [ ] Content Card has `overflow: 'hidden'`
- [ ] Toolbar Flex (heading + buttons) has `wrap="wrap"` and `gap={2}`
- [ ] Every actions row inside a Card has `wrap="wrap"`
- [ ] Outer Flex uses `minHeight: '100vh'`, not `height: '100vh'`
- [ ] No Flex child uses a fixed `px` width without a `maxWidth` fallback

### The pattern that fails every time

```jsx
/* ✗ Fixed sidebar + 100vh forces overflow at 320px */
<Flex style={{ height: '100vh' }}>
  <Card style={{ width: '260px', flexShrink: 0 }}>Sidebar</Card>
  <Card flex={1}>Content</Card>
</Flex>
```

At 320px, the 260px sidebar plus any content exceeds the viewport.

### The pattern that passes

```jsx
/* ✓ Sidebar stacks above content at narrow widths */
<Flex wrap="wrap" style={{ minHeight: '100vh' }}>
  <Card
    as="nav"
    aria-label="Main navigation"
    style={{ flex: '1 1 100%', maxWidth: '260px' }}
    padding={3}
  >
    Sidebar
  </Card>
  <Card as="main" style={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden' }} padding={4}>
    Content
  </Card>
</Flex>
```

### Key differences

| Prop | Fails | Passes |
| --- | --- | --- |
| Container | `Flex` (no wrap) | `Flex wrap="wrap"` |
| Sidebar sizing | `width: '260px', flexShrink: 0` | `flex: '1 1 100%', maxWidth: '260px'` |
| Container height | `height: '100vh'` | `minHeight: '100vh'` |
| Content card | `flex={1}` | `flex: '1 1 0', minWidth: 0, overflow: 'hidden'` |

**Do not use `flexShrink: 0`** on sidebars. It prevents the sidebar from shrinking below its width.

**Do not use `height: '100vh'`** on the outer Flex. Use `minHeight: '100vh'`. A fixed height stops the container from growing when content stacks.

**Always set `overflow: 'hidden'`** on the content Card. Long headings or button rows can push the page `scrollWidth` past the viewport.

### Toolbar rows must wrap — this is the most common remaining failure

**Every test run fails this check.** The toolbar Flex inside the content Card overflows at 320px because agents forget `wrap="wrap"` on the inner Flex even when the outer layout Flex has it. The outer layout handles sidebar stacking. The inner toolbar handles heading + button wrapping. Both need `wrap="wrap"` independently.

**Copy this exact toolbar pattern into every content area:**

```jsx
/* ✗ FAILS EVERY TIME — no wrap on toolbar Flex */
<Card as="main" style={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden' }} padding={4}>
  <Flex align="center" justify="space-between">
    <Heading as="h1" size={2}>All Documents</Heading>
    <Button text="New document" icon={AddIcon} />
  </Flex>
</Card>

/* ✓ PASSES — wrap="wrap" and gap={2} on toolbar Flex */
<Card as="main" style={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden' }} padding={4}>
  <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
    <Heading as="h1" size={2}>All Documents</Heading>
    <Button text="New document" icon={AddIcon} tone="default" />
  </Flex>
</Card>
```

The difference is one prop: `wrap="wrap"` on the toolbar `Flex`. Without it, the heading and button sit in a single non-breaking row that exceeds 320px. With it, the button flows to the next line at narrow widths.

**If you build a toolbar row with a heading and a button, add `wrap="wrap"` and `gap={2}`.** This applies to every toolbar in the app — the content header, card action rows, and any other horizontal grouping of heading + buttons.

---

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

---

## 9. Known Sanity UI issues

These are library-level issues you cannot fix through props. Automated tests will flag them. Do not spend time trying to work around them.

### MenuButton emits `aria-haspopup="true"`

The `MenuButton` component emits `aria-haspopup="true"` instead of `aria-haspopup="menu"`. The value `"true"` is an alias for `"menu"`, but screen readers may announce it as "has popup" instead of "has popup menu." This requires a fix in `@sanity/ui` itself.

### Palette colors fail contrast with white text at small sizes

White text on `tone="primary"` default-mode buttons produces a 4.29:1 ratio. The primary blue (`#556bfc`) on the ghost-mode light tint (`#e5edff`) produces 3.65:1. The positive green (`#04b97a`) with white text produces 2.55:1. All fail the 4.5:1 AA threshold at standard font sizes. Use `tone="default"` for actions. Do not build custom elements with palette colors and white text. See §4 above.

### ToastProvider renders `<ul>` without `role="list"`

The `ToastProvider` component renders a `<ul>` element with `list-style: none`. WebKit strips list semantics from unstyled lists. VoiceOver does not announce the element as a list. This is a library-level issue. Automated tests may flag it under the `semantic-structure` check.

---

## Full page scaffold

This scaffold passes all automated accessibility tests. Use it as a starting point.

```jsx
<ThemeProvider theme={theme}>
  <Flex wrap="wrap" style={{ minHeight: '100vh' }}>
    {/* Sidebar — <nav> landmark */}
    <Card
      as="nav"
      aria-label="Main navigation"
      padding={3}
      style={{ flex: '1 1 100%', maxWidth: '260px' }}
    >
      <Stack space={3}>
        <Heading as="h2" size={1}>Navigation</Heading>
        {/* nav items */}
      </Stack>
    </Card>

    {/* Content — <main> landmark */}
    <Card as="main" style={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden' }} padding={4}>
      {/* Toolbar — wrap prevents overflow at 320px */}
      <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
        <Heading as="h1" size={2}>Page Title</Heading>
        <Button text="New document" icon={AddIcon} tone="default" />
      </Flex>

      {/* Document list — h2 follows h1, not h3 */}
      <Stack space={3} marginTop={4}>
        {documents.map(doc => (
          <Card key={doc.id} padding={3} border radius={2}>
            <Heading as="h2" size={1}>{doc.title}</Heading>
          </Card>
        ))}
      </Stack>
    </Card>
  </Flex>
</ThemeProvider>
```

**What this gives you:**

| Feature | How |
| --- | --- |
| Landmarks | `Card as="nav"` and `Card as="main"` |
| Heading hierarchy | One `<h1>` for the page title. `<h2>` for sidebar heading, list items, and sections. Never skip to `<h3>`. Never use two `<h1>` elements. |
| Page language | Set `<html lang="en">` in `index.html` |
| Responsive reflow | `wrap="wrap"` + flex sizing (no fixed widths) |
| Toolbar wrap | `wrap="wrap"` on toolbar Flex |
| Target spacing | `gap={2}` or higher between adjacent buttons in toolbars |
| Contrast | `tone="default"` instead of `tone="primary"`. Do not hardcode `#556bfc` with white text. |
| Overflow clip | `overflow: 'hidden'` on content Card |

---

## Changelog

| Date | Reviewer | Action |
| --- | --- | --- |
| 2025-01-20 | Accessibility Expert (initial) | Created file. Defined 15 standards across 9 categories. |
| 2025-03-18 | Accessibility Expert | Added accessibility checklist. |
| 2025-03-18 | Accessibility Expert, reviewed by Writer | Added "Implementation patterns" section. Added "Common mistake" callouts. |
| 2025-03-18 | Accessibility Expert, reviewed by Writer | Second round: landmarks and headings now pass. Added known Sanity UI issues (MenuButton aria-haspopup, tone="primary" contrast). Added required reduced-motion CSS override. |
| 2025-03-18 | Accessibility Expert, reviewed by Writer | Applied conformance audit notes to component docs. Removed audit tables from this file. |
| 2025-03-18 | Accessibility Expert, reviewed by Writer | Third round: fixed motion test false positive. Added native checkbox warning. Added heading level skip guidance. |
| 2025-03-19 | Accessibility Expert, reviewed by Writer | Fourth round: rewrote reflow pattern with overflow: hidden and toolbar wrap. Strengthened tone="primary" warning. Added MenuButton aria-label example. |
| 2025-03-19 | Accessibility Expert, reviewed by Writer | Separated library-authoring standards into `component-authoring-accessibility.md`. Rewrote this document for consumers who use existing Sanity UI components. Removed documentation-requirement rules, cross-component pattern tracking, and library-internal design decisions. Kept all guidance on landmarks, headings, accessible names, contrast, motion, touch targets, reflow, and lang attribute. |
| 2025-03-24 | Accessibility Expert, reviewed by Writer | Fifth round from automated tests (3 training iterations). Heading skip h1→h3 (2/3 fail): added explicit "items in a list under h1 are h2, not h3" rule with inline code showing both levels in context; added document list items to the scaffold. Reflow at 320px (3/3 fail): promoted wrap="wrap" to a top-level principle — every Flex with more than one child must wrap. Contrast on selected MenuItems (1/3 fail): expanded §4 and §9 warnings to cover selected states beyond Buttons (same #556bfc background). Updated menu.md accessibility section with selected-state contrast warning. |
| 2025-03-25 | Accessibility Expert, reviewed by Writer | Sixth round: applied pending edits from prior session (aria-selected on Card, reflow checklist, ToastProvider known issue, studioTheme callout, MenuButton id/popover, tooltip ref forwarding, TextInput onChange, icon table). Added multiple-h1 warning, touch target spacing, bare input warning, hardcoded hex warning. Fixed Stack gap pixel values. Fixed Badge text prop in quick-start. |
| 2025-03-26 | Accessibility Expert, reviewed by Writer | Seventh round (3 training iterations, 8/9/6 pass). Headings now pass 3/3 (single h1, proper h2). Contrast passes 3/3. Reflow still fails 3/3 — toolbar overflow. New: nested-interactive from misused role="listbox" pattern (iter 3). Changes: (1) Rewrote toolbar wrap section as "most common remaining failure" with full Card-wrapped ✗/✓ code showing the toolbar inside the content Card. (2) Added nested-interactive warning to card.md selectable list pattern with code showing actions outside the role="option" element. (3) Added rem values column to space.md spacing table. (4) Added horizontal divider pattern to card.md (Card borderBottom). (5) Fixed quick-start Badge from text prop to children. |
| 2025-03-26 | Accessibility Expert, reviewed by Writer | Eighth round (3 training iterations, 6/8/8 pass). New contrast failures: custom avatar with green #04b97a (2.55:1) and ghost+primary nav text on light tint #556bfc/#e5edff (3.65:1). Refined §4: (1) Corrected misleading claim that mode="ghost" + tone="primary" passes AA — it fails at 13px normal weight. (2) Added contrast table for palette colors (primary blue, positive green, caution yellow) showing all fail with white text. (3) Added "Do not build custom colored elements with white text" subsection. (4) Updated §9 known issues to cover all palette colors, not only primary blue. (5) Added scaffold link at top of document so agents find it first. No new content added to reflow section — existing guidance is correct, the failure is an adoption gap not a documentation gap. |

# Product content standards

This file sets rules for the words, labels, messages, and short copy inside UI parts. It tells you what end users should read: button labels, menu items, tooltip text, error messages, empty states, confirm dialogs, placeholder text, and status messages.

`content-standards.md` tells how authors write the _docs_ (section layout, table format, source style). This file is for designers, engineers, and content reviewers who pick the words inside Sanity UI parts.

Both files work as a pair. `content-standards.md` keeps the docs steady. `product-content-standards.md` keeps the product steady. When a part doc has a "Content" or "Content Guidelines" section, its rules must match the standards here.

---

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

2. **Be short.** Aim for 1–3 words on button labels. Keep menu item labels to 1–3 words. Use 1–2 words for nav group labels. Overflow menu items may run up to 5 words because they must stand alone without icons or tooltips.
   - _Derives from:_
     - Button Content ("Labels should be short and clear")
     - Menu Content Guidelines ("Keep MenuItem text short (1-3 words)")
     - Layouts Labeling groups ("Labels should be short — one or two words")
     - Layouts Action button guidelines ("aim for two words or less")
     - Layouts Overflow menus ("The label should stand on its own")

3. **Use sentence case.** Cap only the first word and proper nouns. Write "Add item," not "Add Item." Write "Save to board," not "Save To Board."
   - _Derives from:_
     - Button Content ("Use sentence case")
     - Text Content ("Use sentence case for UI labels and body text")
     - Tooltip Content Guidelines ("Use sentence case")
     - Popover Content Guidelines ("Use sentence case")
     - Menu Content Guidelines ("Use sentence case for all menu items")
     - Heading Content ("Use sentence case for headings")
     - Layouts Labeling groups ("Labels should use sentence case")

4. **Name the action.** Do not use vague labels like "Click here," "Submit," "Go," or "OK." The label must say what will happen. "Upload image" beats "Submit." "Delete 3 items" beats "Confirm."
   - _Derives from:_
     - Button Content ("Avoid vague labels")
     - Button Best practices ("Don't use vague labels like 'Click here'")
     - Layouts Action button guidelines ("Avoid vague labels like 'Click here', 'Submit', 'Go', or 'OK'")

5. **Use plain, clear words for critical actions.** Give destructive actions strong verbs: "Delete," "Remove," "Discard." Do not soften destructive labels. Give safe actions clear verbs: "Publish," "Confirm," "Complete."
   - _Derives from:_
     - Button Tone table ("critical" tone pairs with "Delete, Remove")
     - Layouts Confirmation for destructive actions ("The confirm button repeats the destructive action's name")

6. **Name the group, not the action, for group labels.** Nav group labels name what the items are, not what the user does with them. Use "Documents" instead of "Manage documents." Use "Team" instead of "View team members."
   - _Derives from:_ Layouts Labeling groups ("Labels should name the kind of items, not the action done on them").

7. **Overflow menu labels must stand alone.** When an action goes into an overflow menu, its label must make sense on its own — no icon, no tooltip. Use "Export as CSV" instead of "Export."
   - _Derives from:_ Layouts Overflow menus ("Overflow menu items use a label only — no tooltips, no icons. The label must stand on its own").

8. **Toggle labels must show the next action.** When a button toggles state (show/hide, expand/collapse), write the `aria-label` and tooltip to say what happens next — not what is true now. Sidebar shown → "Hide nav." Sidebar hidden → "Show nav."
   - _Derives from:_ Layouts Toggling sidebars ("The button's aria-label and tooltip should update to match the action").

#### Quick reference

| Part | Length target | Verb-first | Sentence case | Sample |
| --- | --- | --- | --- | --- |
| Button label | 1–3 words | Yes | Yes | "Save draft" |
| Menu item label | 1–3 words | Yes | Yes | "Rename" |
| Overflow menu item | 1–5 words | Yes | Yes | "Export as CSV" |
| Nav group label | 1–2 words | No (noun phrase) | Yes | "Media library" |
| Tab label | 1–2 words | No (noun phrase) | Yes | "Page settings" |
| Toggle button label | 1–3 words | Yes | Yes | "Show inspector" |

---

### P2: Tooltips

Tooltips give brief help when a user hovers or focuses on a part. Use them for quick scans — not key info.

#### Rules

1. **Keep tooltips under 75 characters.** Aim for 60–75 characters. If you need more, put the words in body text, a popover, or a dialog — not a tooltip.
   - _Derives from:_ Tooltip Content Guidelines ("Limit text to 60–75 characters").

2. **Start with a verb when naming an action.** If the tooltip says what a button does, lead with the verb: "Edit profile," not "Profile editor." If the tooltip adds info (not an action), a short phrase works.
   - _Derives from:_ Tooltip Content Guidelines ("Start with a verb if describing an action").

3. **Use sentence case.** Cap only the first word and proper nouns.
   - _Derives from:_ Tooltip Content Guidelines ("Use sentence case").

4. **No dots on fragments.** Do not end tooltip fragments with a dot. If the tooltip holds a full sentence, add a dot as normal.
   - _Derives from:_ Tooltip Content Guidelines ("Avoid dots at the end of fragments. Only add dots if the tooltip holds full sentences").

5. **Do not restate shown text.** If the button says "Delete," write a tooltip that adds more ("Delete this document and all its links"). Do not repeat "Delete."
   - _Derives from:_ Tooltip When not to use ("Do not use when you restate text already shown on screen").

6. **Do not put tooltips on disabled buttons.** Disabled buttons drop out of the tab order. Keyboard users cannot reach them, and the tooltip stays hidden. Use a nearby note or info icon instead.
   - _Derives from:_
     - Tooltip ("Never attach a tooltip to a disabled button")
     - Button ("Avoid tooltips on disabled buttons")
     - Layouts ("Do not rely on tooltips — disabled buttons leave the tab order")

7. **All icon-only buttons need a tooltip.** When a button has no shown text, add a tooltip for sighted users. Pair it with an `aria-label` for screen readers. Both are needed.
   - _Derives from:_
     - Button Best practices ("Add tooltips to icon-only buttons")
     - Iconography ("Always pair standalone icons with a Tooltip")
     - Layouts ("All icon-only buttons must have an aria-label and a paired tooltip")

8. **The tooltip must not repeat the `aria-label`.** If the `aria-label` says "Close dialog," the tooltip must either match it (fine) or say more. It must never clash with the `aria-label`.
   - _Derives from:_ Tooltip ("Make sure the tooltip does not repeat the aria-label. If the button reads 'Settings,' the tooltip should say more").

9. **All action buttons with a text label need a tooltip that adds detail.** The tooltip grows the label: "Export" → "Export all items as a CSV file."
   - _Derives from:_ Layouts ("All action buttons should have a tooltip that adds detail").

---

### P3: Error messages

No part doc yet has error message rules in its "Content" section. This standard draws on best practices and patterns from other docs. Parts that need error message help: TextInput, Dialog, Card (with `tone="critical"`), and Toast.

#### Rules

1. **Name the problem in plain words.** Tell the user what went wrong. Do not show error codes, jargon, or stack traces in the UI. "The image failed to upload" works. "Error 413: Payload over limit" does not.

2. **Tell the user what to do next.** Each error message must have a next step — what the user can do to fix it. "The image failed to upload. Try a file under 10 MB." The pattern: _what went wrong_ + _what to do about it_.

3. **Do not blame the user.** Keep it neutral. "This file type is not allowed" — not "You sent a bad file." Frame the error as a state, not a fault.

4. **Be exact.** "Something went wrong" is a last resort. Name the thing and what failed: "Could not save the document. The server did not answer."

5. **Use sentence case.** Error messages follow the same casing rule as all other UI text.

6. **Keep error messages under two sentences.** If the problem needs more, link to docs or offer a "Details" toggle.

7. **Pair `tone="critical"` with an icon.** When showing errors in Cards, Buttons, or Toasts, use `tone="critical"` and add `ErrorOutlineIcon`. Do not rely on color alone.
   - _Derives from:_
     - Button Best practices ("Pair tones with an icon that matches")
     - Card Variants ("Pair Card tone values with an icon that matches")
     - Color Principles ("Never rely on color alone to show meaning")

#### Components that need error message guidance

| Part | Why |
| --- | --- |
| TextInput (not yet documented) | Form errors display inline near inputs |
| Dialog (not yet written) | Error confirms and failure notes |
| Card | Uses `tone="critical"` but has no error message content rules |
| Toast (not yet written) | Async error notices |

---

### P4: Empty states

Empty states show up when a list has no items, a search finds nothing, or a feature is not set up yet. The docs cover empty state layout but not the words inside them.

#### Rules

1. **Name what is missing.** The first line of an empty state says what is not there: "No documents yet," "No results found," "No team members."

2. **Tell the user how to fill the space.** The next line gives an action or a call-to-action button. "Create your first document" — not "Get started."
   - _Derives from:_ Layouts Empty states ("Put a clear call-to-action in the middle of the content space: 'Create your first document,' not 'Get started'").

3. **Structure: what + why + action.** An empty state has at most three parts:
   1. What the space will hold.
   2. A one-line reason why it's empty (optional).
   3. A call-to-action button using P1's verb-first label rules.

4. **Use a warm, helpful tone.** Empty states are a chance to help, not to alarm. Avoid "Error: no data." Use "No documents yet. Create one to get started."

5. **Center empty state text.** Put the copy in the middle of the content space. Set `align="center"` on Text parts inside the empty state.
   - _Derives from:_ Text Variants Align ("Copy within a center content block, such as an empty state").

6. **Use Text `size={1}` for empty state messages.** Empty state text is low-priority.
   - _Derives from:_ Text Variants Size ("Non-critical messages, such as Toasts and empty states" maps to `size={1}`).

#### Components that should document empty state guidance

| Part | Why |
| --- | --- |
| Layouts | Already has layout empty state rules; needs content rules for the text within |
| Card | Cards can contain lists that may be empty |
| Menu | A menu with no items needs an empty state |

---

### P5: Confirm dialogs

Confirm dialogs ask the user to check an action before it runs. The Layouts doc covers patterns for destructive actions. This standard widens the pattern to cover all confirms.

#### Rules

1. **The question names the action and the thing.** "Delete 'About us' page?" — not "Are you sure?" The user must know what will happen from the dialog title alone.
   - _Derives from:_ Layouts ("a confirm dialog that states what will happen").

2. **The confirm button repeats the action verb.** If the dialog asks "Delete 3 items?", the confirm button says "Delete 3 items" — not "Confirm," "Yes," or "OK."
   - _Derives from:_ Layouts ("The confirm button repeats the action's name — 'Delete 3 items,' not 'Confirm' or 'Yes'").

3. **The cancel button says "Cancel."** Do not use "No," "Go back," "Never mind," or "Dismiss." All users know "Cancel."

4. **Destructive confirm buttons use `tone="critical"`.** The look reinforces the weight of the action.
   - _Derives from:_ Layouts ("The confirm button should also use tone='critical'").

5. **Add a brief note when the outcome is unclear.** If the action has side effects, state them in the dialog body. Keep to one or two sentences. Like: "Deleting this document will also remove 12 links to it."

6. **Use sentence case for dialog titles and body text.** The same casing rule holds for all parts.

---

### P6: Placeholder text

No current part doc covers placeholder text rules. This standard draws on best practices. Add these rules to the TextInput and Autocomplete docs when written.

#### Rules

1. **Placeholder text shows the format, not the field name.** A date field reads "YYYY-MM-DD," not "Enter date." A search field reads "Search by title or ID," not "Search."

2. **Placeholder text does not take the place of a shown label.** Give each input a shown label above or next to it. The placeholder is a hint — it fades when the user types and fails as a lasting label.

3. **Use sentence case.** Placeholder text follows the same rule as all other UI text.

4. **Keep placeholder text short.** One phrase or short line. It must fit inside the input at the input's default width with no clipping.

5. **Do not use placeholder text for rules.** If the user must know rules before typing (like "Must be at least 8 chars"), put help text below the input.

#### Components that should document placeholder text guidance

| Part | Why |
| --- | --- |
| TextInput (not yet written) | The main user of placeholder text |
| Autocomplete (not yet written) | Search-style inputs with placeholder |

---

### P7: Status messages

Status messages are toast notices, inline markers, and loading notes. They tell the user what happened or what a task is doing.

#### Rules

1. **Name the action and its result.** "Document published" — not "Success." "3 items deleted" — not "Done." Users must know what happened without thinking back to what they had clicked.

2. **Use past tense for done actions.** Write "Published," "Saved," "Deleted." Use "-ing" for actions not yet done: "Publishing…," "Saving…"

3. **Keep status messages under one sentence.** Toast messages must be easy to read at a glance. If more is needed, add a link to the item or a "Details" link.

4. **Fire a Toast for actions that take over three seconds.** When a task ends after loading for more than three seconds, show a Toast to tell the user. Do not rely on the button going back to its on state — the user may have moved on.
   - _Derives from:_
     - Button Loading state ("For tasks over three seconds, trigger a Toast when the action finishes")
     - Layouts Loading states ("trigger a Toast when the action completes")

5. **Use `tone` to match the status.** Good outcomes use `tone="positive"`. Warnings use `tone="caution"`. Failures use `tone="critical"`. Add the matching icon.
   - _Derives from:_ Card Tone table, Button Tone table, Color Principles ("Color carries meaning").

6. **Loading messages must name the task, not say "Loading."** Write "Publishing document…" or "Uploading image…" when the task is known. Use "Loading…" only when you do not know the task.

7. **Use sentence case.** Applies to all status messages.

8. **Use Text `size={1}` for toast and status messages.** Status messages are low-rank, short-lived words.
   - _Derives from:_ Text Variants Size (`size={1}` is for "small messages, such as Toasts and empty states").

---

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

2. **When not to use sentence case.** Proper nouns (Sanity, GitHub, GROQ), short forms (CSV, JSON, URL, UUID), and brand names keep their own casing. Never use all-caps text (like "MEDIA LIBRARY").

3. **No dots on short bits.** Button labels, menu items, tooltip bits, headings, and group labels do not end with a dot. Full sentences in body text, error messages, and dialog text do get dots and other marks.
   - _Derives from:_
     - Tooltip ("Avoid periods at the end of fragments")
     - Heading ("Do not end headings with a dot unless it is a question")

4. **No "!" marks in UI text.** Product copy keeps a calm, clear tone. Save "!" marks for sales copy — not buttons, errors, or status messages.

5. **Use figures, not words, for counts.** "Delete 3 items" — not "Delete three items." Users read figures faster in UI text.

6. **Use the Oxford comma in lists.** When a line lists three or more items, put a comma before "and" or "or" to keep the meaning clear.

---

### P9: Internationalization considerations

Sanity UI is used around the world. Write all text for translation, even when the source is English.

#### Rules

1. **Allow 30–50% growth for translated labels.** German, Finnish, and other languages often make labels 30–50% longer than English. A two-word English button may grow to four words in German. Plan layouts for this growth — do not treat the English length as the cap.

2. **Avoid text placed in code.** Make all user-facing strings easy to pull out. Do not hard-code labels, error messages, or status text in JSX. Pass them as props or through a locale file.

3. **Do not join strings to build sentences.** "You have " + count + " items" breaks in languages where word order is not the same. Use template strings with slots a translator can move: "You have {count} items."

4. **Support RTL scripts.** Labels, tooltips, error messages, and all other text must look right in right-to-left languages (like Hebrew). Use `inline-start` and `inline-end` in place of `left` and `right`.
   - _Derives from:_
     - Text Variants Align ("`left` for LTR, `right` for RTL")
     - Heading Best practices ("Start-align headings (left in LTR languages)")

5. **Avoid sayings and word games.** "Hit the ground running," "low-hanging fruit," and "out of the box" do not translate well. Use plain, straight words.
   - _Aligns with:_ Text Content ("Avoid jargon, acronyms, and hard sentences. Aim for an 8th-grade reading level").

6. **Test labels at their longest.** When building a part, test with the longest likely translated string (such as a 50%-longer German form). Check that the layout does not break, clip text, or push buttons off screen.

---

### P10: Truncation

Truncation is a last resort. All parts that handle text overflow must follow clear rules about when and how to truncate.

#### Rules

1. **Shorten the text before clipping.** The best clip is no clip at all. If users can change the text (like a title they typed), you may need to cut it. If the system sets the text (like a button label), write it shorter.
   - _Derives from:_
     - Heading TextOverflow ("Before truncating, try to shorten the text. The best truncation is no truncation")
     - Text TextOverflow ("Before truncating, try to shorten the text")

2. **Use ellipsis (`…`) to show clipping.** The default `textOverflow="ellipsis"` works for most cases. Do not use `clip` unless the cut part is only for looks.
   - _Derives from:_ Button API (`textOverflow` defaults to `'ellipsis'`).

3. **Show the full text with a Tooltip or `title`.** When you clip text, let the user see the full string on hover or focus. Use the Tooltip part or the HTML `title` tag.
   - _Derives from:_
     - Heading TextOverflow ("make sure the full text is within reach via Tooltip or title tag")
     - Text TextOverflow (same rule)

4. **Save clipping for user-made or changing text.** Write system-set labels (buttons, menu items, section headings) short enough to never clip. Clipping is for text the system cannot control: user-typed titles, machine-made IDs, and long web links.
   - _Derives from:_
     - Text TextOverflow ("Text that is user/machine made and edge cases may exist")
     - Heading TextOverflow (same)

5. **Clipping in grids and lists.** When grid or list items would cause odd sizes or layout jumps if they wrapped, clipping works. Make sure users can still see the full text.
   - _Derives from:_
     - Text TextOverflow ("Text within a grid where wrapping would cause odd sizes or shifts")
     - Heading TextOverflow (same)

---

## Part Content sections to update

All items from the initial audit have been resolved. The table below tracks only remaining work — docs not yet written, and Box/Flex layout primitives that still need minimal Content sections.

| Document | Standard | What needs to change |
| --- | --- | --- |
| `box.md` | P8 | Add a Content section noting that Box does not set text styles. Child Text/Heading components own casing and styling. Cite P8 for sentence case. |
| `flex.md` | P8 | Same as Box. Add a Content section noting that Flex does not set text styles. Cite P8. |
| `dialog.md` (not yet written) | P3, P5, P6 | When written, include a Content section covering confirm dialog rules (P5), error message structure (P3), and placeholder text in dialog inputs (P6). |
| `textinput.md` (not yet written) | P3, P6 | When written, include a Content section covering placeholder text rules (P6) and inline error messages (P3). |
| `toast.md` (not yet written) | P7 | When written, include a Content section covering status message rules (P7). |

---

## How to use this file

### For people building interfaces with Sanity UI

1. **Before writing any user-facing text**, read the right standard (P1 for button labels, P2 for tooltips, P3 for errors, etc.).
2. **Use P8 (casing and format) on all text.** Use sentence case, skip dots on bits, use figures for counts.
3. **When in doubt, check the quick lookup table** in P1 for label length and form.
4. **Think about translation.** Even if you write in English, follow P9 — allow for 30–50% growth, avoid string joining, use plain words.
5. **Clipping is a last resort.** Follow P10 — shorten the text first. If you cannot avoid clipping, show the full text with a Tooltip.

### For reviewers checking Content sections

1. **Check each part's Content section against all rules in this file.** Use the audit as a checklist to start.
2. **When a part's Content section adds a new rule**, see if it belongs here. If the rule goes past that one part, add it here and cite it from the part doc.
3. **When a part's Content section clashes with a rule here**, the system rule wins. Change the part doc to match, or pitch a change with proof.
4. **Flag missing Content sections.** The "Parts with NO Content section" table lists parts that need them. When you write a new part doc, add a Content section that cites the right rules from this file.

### For maintaining this file

1. **This file grows over time.** Each review adds to or makes the rules better. Do not repeat — update in place.
2. **All new rules must cite proof.** Ground each rule in part doc Content sections. Where no part doc has a given content type, note the gap and write the rule from best practices.
3. **Run the feedback loop.** When you add or change a rule, also update the audit and the "Part Content sections to update" table. A rule that lives only here and never gets into part docs does not work.
4. **Version the changes.** Add a row to the changelog below when you add, refine, or retire standards.

---

## Standards changelog

| Date | Change | Standards changed |
| --- | --- | --- |
| 2025-01-01 | Made. Drew standards from button.md, card.md, heading.md, text.md, tooltip.md, popover.md, menu.md, stack.md, layouts.md, icon.md, color.md. Set P1–P10. | P1, P2, P3, P4, P5, P6, P7, P8, P9, P10 |
| 2025-01-01 | Resolved all initial audit items. Updated Content sections in button.md (P2, P5, P9, P10), card.md (P3, P4, P8), heading.md (P9), text.md (P1, P9), tooltip.md (P9), popover.md (P9), menu.md (P5, P9). Added Content sections to iconography.md (P1, P2, P8), layouts.md (P1, P4, P5, P7, P8), color.md (P3, P7). Updated conformance audit to reflect all changes. | P1, P2, P3, P4, P5, P7, P8, P9, P10 |

# Typography

## Best practices

**Do**
- Always use vertically stacked Text/Heading pairings with `<Stack>` or `<Flex>`. Text and Heading components require explicit vertical spacing between them because they have all vertical spacing stripped.
- Use `<Heading>` along with the `as` prop for all interface waypoints. 

**Don’t**
- Don't replace text with icons for critical or complex topics. 
-

# Color



Overview Color is a potent and volatile design tool. What appears vibrant to one person may be gray to another, and cultural interpretations of color can vary wildly. Within our design system, color is not merely decorative; it is a functional tool used to communicate hierarchy, indicate interactive states, and guide the user.

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

- **Don't use hardcoded hex values** for colors that `@sanity/ui` components manage. Every `color`, `background-color`, and `border-color` in the system flows through CSS custom properties. Hardcoded values break in dark mode, ignore tone contexts, and diverge from the palette.
- **Don't reference `--card-*` variables** in component styles unless building a custom component that takes part in the Card color context. Prefer `@sanity/ui` components with `tone` and `muted` props.
- **Don't use `ThemeColorProvider` directly** unless you are building infrastructure-level components. Use Card's `tone` and `scheme` props, which wrap `ThemeColorProvider` with the correct semantics.
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

# Space

The spacing scale controls padding, margin, and gap across all Sanity UI components. Every spacing prop maps to the same scale of 10 values.

## The spacing scale

| Value | Pixels | rem | Common use |
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

| Prop | What it controls |
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

```jsx
/* padding={2} at small screens, padding={4} at 600px+ */
<Card padding={[2, , 4]}>Content</Card>

/* gap={2} at small screens, gap={3} at medium, gap={4} at large */
<Stack gap={[2, 3, 4]}>
  {items}
</Stack>
```

An empty slot (`, ,`) means "keep the previous value."

## Choosing a spacing value

Pick spacing based on content density:

**Tight (1–2).** Items that form a single unit. A label and its input. An icon and its caption. The gap should feel like a pause, not a break.

**Standard (3–4).** Distinct items in the same group. Form fields, cards in a list, paragraphs. The gap should feel like a clear separator. Most UI uses these values.

**Generous (5+).** Sections that need visual distance. Use these to create breaks without adding a divider. Values 6–9 are rarely needed outside of page-level layouts.

### Common patterns

| Context | Prop | Value | Pixels |
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



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
  - 
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

| Purpose | Icon name | When to use |
| --- | --- | --- |
| **Navigation** | | |
| | `ChevronDownIcon` | Dropdown or menu trigger |
| | `ChevronRightIcon` | Drill into nested navigation |
| | `ChevronLeftIcon` | Go back |
| | `ArrowRightIcon` | Navigate to a new page |
| | `LaunchIcon` | Open an external link or new tab |
| | `MenuIcon` | Open a sidebar or mobile menu |
| | `CloseIcon` | Close a panel, dialog, or sidebar |
| **Actions** | | |
| | `AddIcon` | Create or add an item |
| | `EditIcon` | Edit content |
| | `TrashIcon` | Delete an item |
| | `CopyIcon` | Duplicate or copy |
| | `SearchIcon` | Search or filter |
| | `UploadIcon` | Upload a file |
| | `PublishIcon` | Publish content |
| **Status** | | |
| | `CheckmarkIcon` | Success or completion |
| | `CheckmarkCircleIcon` | Success in a badge or inline context |
| | `WarningOutlineIcon` | Caution or warning — pair with `tone="caution"` |
| | `ErrorOutlineIcon` | Error or critical state — pair with `tone="critical"` |
| | `InfoOutlineIcon` | Informational note — pair with `tone="primary"` |
| | `SpinnerIcon` | Loading state |
| **Editing** | | |
| | `BoldIcon` | Bold text toggle |
| | `ItalicIcon` | Italic text toggle |
| | `LinkIcon` | Insert or edit a link |
| | `ImageIcon` | Insert or manage an image |
| | `OlistIcon` | Ordered list |
| | `UlistIcon` | Unordered list |

For the full list of 200+ icons, see the icon guidelines reference

1. **Use the most specific icon available.** Prefer `DocumentTextIcon` over `DocumentIcon` when representing a text document. Prefer `ImageRemoveIcon` over a generic `CloseIcon` when indicating image removal.
1. **Don't use a "close enough" icon.** If no icon in the library clearly represents the concept, it's better to use no icon at all than one that could be misinterpreted. Consider requesting a new icon for the specific use case.
1. **Be consistent across the product.** Once an icon is chosen for a concept, use that same icon everywhere the concept appears. Don't use `CogIcon` for settings in one place and `ControlsIcon` in another.
1. **Match established conventions.** Users bring expectations from other software. A magnifying glass means search. A trash can means delete. A pencil means edit. Don't repurpose universally understood icons for novel meanings.

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

**When to use them.** Reference `--card-*` properties only when you build a custom element that must follow the current Card color context — for example, a custom border, a custom divider, or a status dot that inherits the tone's foreground color. Always prefer component props (`tone`, `muted`, `scheme`) over raw CSS variables. If a Sanity UI component already has a prop for the color you need, use the prop.

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

# Layout guidelines

## General structure

Layouts consist of three main sections:

1. Navigation sidebar (optional): An inline-start aligned column used to navigate through the application and perform critical application-level actions. Present only when the application has multiple pages or views.
1. Content: The main window used to present the application's content and data. This is the only required section and is present in every layout type. It is subdivided into Content toolbar (a block-start bar for title and actions) and Content display (the primary content area).
1. Inspection sidebar (optional): An inline-end aligned column used to view and edit metadata for content presented in the Content window.

Layouts follow these rules:

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

`<AppShell>`

`<AppShell.Main>`

`{content}`

`</AppShell.Main>`

`</AppShell>`

#### When to use

- The application consists of one view/page and all content, logic, and actions are contained within the main content window. Example: A single form with a submit action.

#### When NOT to use

- When critical actions need to be persistent, regardless of scroll position. Use Shell with Toolbar instead.
- When an application has multiple pages/views to navigate across. Use Shell with Navigation instead.
- When one or more items in the application need a dedicated area to view/edit metadata.  Use Shell with Inspector instead.

### Shell with Toolbar

This layout supports a single view application with persistent actions. It’s ideal for simple management of content.

[https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/7a1ac4bcc6e9058cb9fa1061c573de9c1129d2e6-2460x1664.png](https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/7a1ac4bcc6e9058cb9fa1061c573de9c1129d2e6-2460x1664.png)





#### When to use

- The application consists of one view/page with important actions and filtering needing easy access. Example: A read-only content navigator.

#### When NOT to use

- When an application has multiple pages/views to navigate across. Use Shell with Navigation instead.
- When one or more items in the application needs a dedicated area to view/edit metadata. Use Shell with Inspector instead.

### Shell with Inspector

This layout supports a single view application with persistent actions and viewing/editing of content metadata. It’s ideal for simple management of content and its metadata.

[https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/657db2d89170b0d29b1b29d7a53c632b664af245-2460x1684.png](https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/657db2d89170b0d29b1b29d7a53c632b664af245-2460x1684.png)





#### When to use

- When one or more items in the application needs a dedicated area to view/edit metadata.

#### When NOT to use

- When an application has multiple pages/views to navigate across. Use Shell with Navigation and Inspector instead.
- When all editing of content metadata can be handled in the main content window. Use Shell or Shell with Toolbar instead.

### Shell with Navigation

This layout supports a multi-vew application with persistent navigation and actions. It’s ideal for more organized and fine-grained management of content.

[https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/52929b4932b2ce4220010c04a152f45ec8968d98-2460x1684.png](https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/52929b4932b2ce4220010c04a152f45ec8968d98-2460x1684.png)





#### When to use

- When an application has more than one page/view to navigate across.

#### When NOT to use

- When an application has only one view and requires no navigation. Use Shell, Shell with Toolbar, or Shell with Inspector instead.
- When at least one page/view in the application needs a dedicated area to view/edit metadata. Use Shell with Navigation and Inspector instead.

### Shell with Navigation and Inspector

This layout supports a multi-vew application with persistent navigation, actions and viewing/editing of content metadata. It’s ideal for more organized and fine-grained management of content and its metadata. **Note:** It’s recommended to hide the Inspector sidebar on pages/views where it’s not used.

[https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/d7ac09129bd1fd904410122297e346ef8d947a57-2460x1684.png](https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/d7ac09129bd1fd904410122297e346ef8d947a57-2460x1684.png)





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

Navigation content displays all navigation options or filters for content. Navigation/filters should ONLY use Sanity UI's `' component. The content section should be able to scroll independently to accommodate for overflow.

#### Navigation Footer

The Navigation footer is for ancillary actions, such as:

- Help/support/feedback
- Light/dark mode toggle
- Settings

### Content

The main Content window is comprised of two sub-components

1. Content Toolbar: A block-start bar that orients the user to provide actions for editing/managing the presented content.
1. Content Display: The main content area to present information.

#### Content Toolbar

- The toolbar should have a block-end border to act as a visual break between it and Content display.
- The controls should aim for a height of 50px, but grow in height when necessary.

The Content Controls block-start bar is comprised of two sub-components

1. Content Toolbar Title: Content title is an inline-start aligned slot that contains the title of what's being presented. When the Navigation sidebar does not exist, the title should display the name of the application. Otherwise, the title should display the name of the current page or view being presented to the user.
1. Content Toolbar Actions: An inline-end aligned slot containing horizontally-stacked buttons that allow the user to perform actions on the content.

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
1. **Full width: **Full width is used to display grids of content, tabular data or any other content that requires as much horizontal space as possible.

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
1. Content inspector properties
1. Content inspector footer (optional)

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
1. **Simplicity**: A single navigation surface eliminates the cognitive overhead of understanding multiple navigation models on the same screen.
1. **Scalability**: One well-structured sidebar can accommodate simple and complex information architectures without introducing new layout patterns.

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

# Box



#### Used as the lowest-level building block for containing UI elements.

### **API documentation**

#### _Refer to TypeDocs in Box.tsx_

### **Usage guidelines**

#### **When to use:**

- As a container for child elements
- To  apply padding or margin to a group of elements
- To create basic visual styling (such as background, border, shadow, etc.) for the purposes of composing a custom component

#### **When not to use:**

- As an interactive element
- As a way to lay out child elements. Use Flex, Stack, or Inline instead.
- To act as a container for content that would otherwise be reserved for Card.
- To center content at a max width. Use **Container** instead — it sets `max-width` and centers itself.

#### **Choosing between Box, Card, and Container:**

| **Component** | **Purpose** | **Adds visual styling** | **Use case** |
| --- | --- | --- | --- |
| Box | Spacing and structure | No (transparent by default) | Wrapping elements with padding or margin |
| Card | Content surface | Yes (background, border, shadow, tone) | Grouping related content on a distinct surface |
| Container | Centered column | No | Constraining content width and centering it |

### **Best practices**

#### **Do**

- Use padding over margin when possible to avoid spacing issues related to margin collapse

#### **Don't**

- Avoid adding margin/padding to individual elements like Buttons or Text to set placement.  Instead, wrap elements in Box with margin/padding.
- Don't add onClick to Box

### **Variants**

#### Padding

### Accessibility

- **Layout only.** Box provides spacing and structure. It does not add keyboard handling, focus management, or ARIA state. If you render Box as a semantic element via `as`, you are responsible for the behavior that element requires.
- **Semantic elements via **`as`**.** Box accepts an `as` prop. Use it to render semantic HTML when the content requires it:
  - `as="nav"` — requires `aria-label` when more than one `<nav>` exists on the page (WCAG 1.3.1 A).
  - `as="section"` — requires a heading child or `aria-label` to register as a landmark (WCAG 1.3.1 A).
  - `as="form"` — requires an accessible name via `aria-label`, `aria-labelledby`, or `<legend>` (WCAG 1.3.1 A).
  - `as="main"` — should appear once per page.
  - `as="aside"` — should have `aria-label` when the role is not clear from context.
- **Behavioral elements.** Do not use `as` to render `<button>`, `<dialog>`, `<select>`, `<details>`, `<summary>`, or `<fieldset>`. Box does not fulfil the keyboard, focus, or ARIA contracts those elements require (WCAG 4.1.2 A). Use the matching Sanity UI component instead.
- **Lists.** When rendering `as="ul"` or `as="ol"`, add `role="list"` if `list-style: none` is applied. WebKit strips list semantics without it (WCAG 1.3.1 A). Children must be `<li>` elements.
- **Visual-to-DOM order.** Do not use CSS `order` or grid placement on Box children to reorder them from source order. Screen readers and keyboard navigation follow DOM order, not visual order (WCAG 1.3.2 A).
- **Spacing and reflow.** Box spacing tokens use `rem` units and scale with user font-size settings. Content inside Box must reflow at 320px viewport width without horizontal scrolling (WCAG 1.4.10 AA).

### Content

- **Box does not set text styles.** Box provides spacing and structure. It does not set font size, line height, weight, or color. Use Text, Heading, or Label for text styling.
- **Casing (P8).** All text inside Box must use sentence case. The child components (Text, Heading, Button) own the styling. Box does not override it.

# Flex



Used as the lowest-level building block for laying out UI elements.

### **API documentation**

_Refer to TypeDocs in Flex.tsx_

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

### **Best practices**

**Do**

- Consider responsive breakpoints when stacking items horizontally. In cases where the number of items can vary, make sure to use `wrap="wrap"` so that items do not clip.

**Don't**

- Don’t rely on `row-reverse` or `column-reverse` as a way to change sort order or logical order of items. These direction settings only change the visual layer and will not impact tab index or the way screen readers interpret Flex items.
- Don’t add onClick to Flex. Flex is not intended to be an interactive element.

### Accessibility

- **Layout only.** Flex provides layout along an axis. It does not add keyboard handling, focus management, or ARIA state. If you render Flex as a semantic element via `as`, you are responsible for the behavior that element requires.
- **Semantic elements via **`as`**.** Flex accepts an `as` prop. Use it to render semantic HTML when the content requires it:
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
  - [ ] Toolbar Flex (heading + buttons) has `wrap="wrap"` and `gap={2}`
  - [ ] Actions row inside each Card has `wrap="wrap"`
  - [ ] No Flex child uses a fixed `px` width without a `maxWidth` fallback
  - [ ] Outer Flex uses `minHeight`, not `height`

### Content

- **Flex does not set text styles.** Flex provides layout along an axis. It does not set font size, line height, weight, or color. Use Text, Heading, or Label for text styling.
- **Casing (P8).** All text inside Flex must use sentence case. The child components (Text, Heading, Button) own the styling. Flex does not override it.

# Stack



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

- To lay out items with custom gaps, alignment, and/or wrapping values. Use Flex instead.
- To create a two-axis grid of items. Use **Grid** instead.
- To flow inline items that wrap to the next line. Use **Inline** instead.
- To wrap a single child with no spacing needs. Use **Box** instead.
- To create overlapping layers on the z-axis. Use CSS `position` and `z-index` instead. Stack does not layer items — it lines them up in sequence.

### Best practices

**Do**

- Use `gap` to control spacing. Stack is built for this. Avoid adding margins to children.
- Match `gap` to content density. Use `1`–`2` for tightly grouped items. Use `3`–`4` for distinct siblings. Use `5`+ for section-level breaks.
- Set `as="ul"` or `as="ol"` when children form a list. Add `role="list"` and wrap each child in an `<li>`. See the accessibility section for details.
- Set `as="nav"` when children form a set of navigation links.
- Nest Stacks to create grouped layouts. A form can use an outer Stack with `gap={5}` for field groups, and inner Stacks with `gap={2}` for label-input pairs.

**Don't**

- Don't add `margin-bottom` or `margin-top` to children to create spacing. Use `gap` on the Stack. Manual margins conflict with the grid gap and cause uneven results.
- Don't set `as` to a semantic element without meeting its contract. A `<nav>` needs navigation links. A `<fieldset>` needs a `<legend>`. A `<section>` needs a heading. See the accessibility section.
- Don't use `as="button"` or `as="dialog"` on Stack. Stack provides layout, not behavior. Use the **Button** or **Dialog** components for those roles.
- Don't reorder children with CSS `order`. This breaks the link between visual order and DOM order, which harms screen reader and keyboard users.

### Variants

#### Gap

`gap` sets the vertical space between children. Values map to the spacing scale. The prop accepts responsive values.

| **Value** | **Size** | **Content pattern** | **Use case** |
| --- | --- | --- | --- |
| `0` | 0px | No gap | Mimicking rows in tabular data |
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

- **Tight (1–2).** Items that form a single unit. A label and its input. An icon and its caption. The gap should feel like a pause, not a break.
- **Standard (3–4).** Distinct items that belong to the same group. Form fields, paragraphs, cards. The gap should feel like a clear separator.
- **Generous (5+).** Major sections that need visual distance. Use this to create breaks without adding a divider. The gap should feel like a new section.

**Responsive example:** `<Stack gap={[2, , 4]}>` — uses `2` at the smallest breakpoint and `4` at the 600px breakpoint.

#### As (semantic element)

`as` sets the rendered HTML element. The default is `'div'`.

Avoid `as="button"`, `as="dialog"`, or `as="select"`. These elements carry behavior contracts that Stack does not fulfil. Use the matching component instead.

#### Padding

`padding` adds inner spacing around all children. It does not affect the gap between them. The prop accepts responsive values.

Use `paddingX` and `paddingY` to set inline and block padding one by one. Use side-specific props (`paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`) for fine control.

Example: `<Stack gap={3} padding={4}>` — 12px between children, 20px of inner padding.

#### Border

`border` adds a visible border around the Stack. Use `borderTop` or `borderBottom` alone to create visual dividers at the edges of a section.

Example: `<Stack gap={3} padding={3} border>` — a bordered vertical group.

#### Overflow

`overflow` controls how content behaves when it exceeds the Stack's bounds. Set `overflow="auto"` on a Stack with a fixed `height` to create a scrollable vertical region.

### Accessibility

**Semantic elements and landmarks.** Stack renders a `<div>` by default. This is correct for most cases. When the content has a semantic role, change the element with `as`. Each semantic element has rules:

- `as="nav"` creates a navigation landmark. Add `aria-label` when two or more `<nav>` elements exist on the same page. Without a label, screen readers cannot tell them apart (WCAG 1.3.1).
- `as="section"` only registers as a landmark when it has an accessible name. Add a heading inside it, or set `aria-label`. Without either, `<section>` is the same as `<div>` to screen readers (WCAG 1.3.1).
- `as="fieldset"` requires a `<legend>` as its first child. The `<legend>` gives the group its accessible name.

**List semantics and VoiceOver.** When using `as="ul"` or `as="ol"`, add `role="list"` to the Stack. WebKit and Safari strip list semantics from `<ul>` and `<ol>` elements when `list-style: none` is applied via CSS. Adding `role="list"` restores the behavior. Without it, VoiceOver does not announce the element as a list or report the item count (WCAG 1.3.1).

Each child of a list Stack must be an `<li>` element. Wrap each child in `<li>` or use `as="li"` on child components that support it.

Example:

`<Stack as="ul" role="list" gap={2}>`

`  <li>First item</li>`

`  <li>Second item</li>`

`  <li>Third item</li>`

`</Stack>`

**Reading order.** Stack places items in DOM order. Visual order and DOM order match by default. Do not use CSS `order` on children. It breaks the link between what users see and what screen readers announce. Keyboard navigation also follows DOM order, not visual order (WCAG 1.3.2).

**Content spacing.** For text content, use `gap` of `3` (12px) or higher. Smaller values can make text blocks feel cramped. This harms readability for users with cognitive or visual needs (WCAG 1.4.12).

**Reflow.** Stack uses a single-column layout with `minmax(0, 1fr)` width. Content reflows well on narrow screens. No extra work is needed for WCAG 1.4.10 (Reflow).

**Zoom.** Spacing tokens use `rem` values. Content scales when users adjust browser zoom or font size settings.

### Content

**Common children patterns:**

- **Form field groups.** Label, input, and help text stacked with `gap={2}`.
- **Text content blocks.** Heading followed by body paragraphs, stacked with `gap={3}` or `gap={4}`.
- **Card or item lists.** Repeated items of the same type, stacked with `gap={3}`.
- **Navigation groups.** Vertical nav links stacked with `gap={2}`.
- **Mixed content sections.** Heading, body text, form, and action buttons stacked with `gap={5}`.

**Spacing choices.** Pick `gap` based on the relationship between items, not the pixel value. Tightly related items (label + input) use a small gap. Distinct peers (form fields) use a medium gap. Separate sections use a large gap. See the gap section for the full tier breakdown.

**Width behavior.** Stack fills its parent's width. Each child stretches to the full width of the Stack. This is not adjustable — if you need children with varied widths, use **Flex** or **Grid**.

**No text styling.** Stack is a layout primitive. It does not set font size, line height, or color. Use **Text**, **Heading**, or **Label** inside the Stack to style text content.

# Text



Used for the majority of UI copy, including body paragraphs, captions, and metadata. It is distinct from other typography components, such as Code, Heading, KBD, and Label.

### **API documentation**

_Refer to TypeDocs in Text.tsx_

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

- Use `align=”left”` in the majority of cases. Sanity’s typographic system prefers start-aligned text.
- Use the `muted` prop for helper text or metadata to visually de-emphasize it compared to primary content.
- Use responsive arrays (e.g., `size={[1,2,3]}`) to ensure text is readable across mobile and desktop viewports.
- Aim for 55-70 characters per line in a multiline block of text for optimal legibility.

**Don’t**

- Don’t center-align long blocks of paragraph text; this disrupts the reading flow and is difficult for users with dyslexia.
- Don’t rely on color or the `accent` prop to capture attention or convey importance. People with certain visual impairments may not distinguish the change. Pair the text with an icon or badge instead.
- Don’t italicize or underline to emphasize text. Use Text’s weight prop instead.
- Don’t truncate text unless it is completely necessary. Text truncation makes information less available to people which can become a point of friction or confusion.

### Variants

#### Muted

Used to visually deemphasize a text element. It’s specifically helpful in situations where the text is objectively less important than other text in a composition. Examples include captions or subheadings. Muting text can be an effective method to increase focus on the most important textual information on the screen.

Deemphasizing secondary information is the preferred method for increasing focus compared to over-reliance on bolding text using `weight`. It’s recommended to begin with muting text to aid in emphasis before attempting treatments such as using `accent` or `weight`.

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
| `"left"` | Text that is left/start aligned. | Acts as the primary alignment for text within Sanity UI within LTR languages. | Displaying body copy for LTR languages. Headers and content for numeric data within table cells in RTL languages. |
| `"center"` | Text that is center aligned. | Used rarely in situations where the text element’s parent is centered. | Copy within a pure-center content block, such as an empty state. Labels within UI elements, such as Buttons, Tabs, etc. |
| `"right"` | Text that is right/end aligned. | Acts as the primary alignment for text within Sanity UI within RTL languages. | Displaying body copy for RTL languages. Headers and content for numeric data within table cells in LTR languages. |

#### TextOverflow

Determines whether the Text component truncates as opposed to wrapping. This should be used as a last resort. Some examples where TextOverflow should be used are:

- Text used within a grid of elements where text wrapping would cause irregular sizes or shifts in content.
- Extremely long strings, like UUIDs, in small areas where the text won’t wrap elegantly and will push the container to unsupported widths.
- Situations where text is user/machine generated and extreme edge cases may exist.

Before truncating, attempt to shorten the text if possible. The ideal kind of truncation is no truncation. When truncation is necessary, make sure the full text string is available via `Tooltip` component or `title `attribute.

### Accessibility

To ensure content is accessible to all users, including those using assistive technologies:

- **Contrast Compliance:** Ensure that the text color maintains a contrast ratio of at least **4.5:1** against the background for standard text, and **3:1** for large text. Be particularly careful when using `muted` or `accent` props on non-standard backgrounds.
- **Don't rely on color:** Do not use the `accent` prop as the _only_ way to indicate status (e.g., errors or success). Always pair color with text labels or icons.
- **Semantic Structure:** While the `Text` component defaults to a `div`, use the `as` prop to render semantically appropriate tags (e.g., `as="p"`) to help screen readers understand the content structure.
- **Scaling:** Ensure text remains legible when the browser is zoomed up to 200%. Avoid using fixed pixel units if overriding styles manually.

### **Content**

- **Sentence case:** Use sentence case for UI labels and body text (e.g., "Edit profile" not "Edit Profile").
- **Clear language:** Avoid jargon, acronyms, and complex sentence structures. Aim for an 8th-grade reading level to maximize comprehension.
- **Conciseness:** Be succinct. Avoid "filling space" with flowery language. Users scan text rather than reading word-for-word.
- **Actionable:** When Text is used for instructions, frame the content as actionable steps rather than passive descriptions.

# Heading



Headings are used to create a logical hierarchy and page structure. They guide the user's eye, group related content, and enable users of assistive technologies to navigate the interface quickly.

### API documentation

_Refer to TypeDocs in Heading.tsx_

### Usage guidelines

**When to use:**

- You need to establish the semantic structure of a page (e.g., Page Title, Section Header).
- You need to group text and elements into logical sections.

**When not to use:**

- Don’t use Heading for large text for a number or a callout that does not define a section. Use the **Text** component with a `size` prop instead.
- Don’t use Heading to emphasize text inside a paragraph. Use **Text** with a `weight="bold"` prop.

### Best practices

**Do**

- Use a logical hierarchy. Start with H1 for the main page title and descend to H2, H3, etc., based on the depth of the content.
- Use the `as` prop (e.g., `as="h2"`) to ensure the visual size matches the semantic tag. The component defaults to a `div` if not specified, which provides no semantic value.
- Start-align headings (left-aligned in LTR languages) for easier reading. This provides a consistent starting edge for the eye.

**Don’t**

- Avoid center-aligning headings–especially when the text is long. This disrupts the reading flow and can be difficult for users with dyslexia.
- Don’t skip heading levels (e.g., jumping from H1 to H3) simply to achieve a specific visual size. Use the `size` prop to adjust visuals while keeping the `as` prop semantically correct.
- Don’t use Headings for visual differentiation. Headings are functional in nature.

### Variants

#### Size

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `0` | Heading’s smallest size | To act as a way to deemphasize content and/or accommodate for extreme high-density compositions. | No common use cases.  Most uses are better supported by  the Text component. |
| `1` | Heading’s small size | The default size for Headings within the UI chrome. | Adding title for toolbars and sidebars. Titles for groups of elements, like menuitems. |
| `2` | Heading’s medium size | The emphasized size for Headings within the UI chrome. | Subheadings within Studio editor |
| `3` | Heading’s large size | For adding titles within high density layouts. | Content titles within a sidebar. |
| `4` | Heading’s extra large size | For adding titles within moderate density layouts. | Document titles within Studio editor content. |
| `5` | Heading’s largest size | For adding titles within low density layouts. | Document titles within Canvas editor content. |

#### Align

Sets the Heading’s horizontal alignment. **Use with caution. **Headings should almost always be left/start aligned. In certain cases on mobile devices `align=”center”` may be preferable.

#### Weight

Adjusts the Heading’s font weight. **Use with caution. **Maintaining a consistent typographic weight for headings helps establish visual markers in the interface. It’s recommended to not set a custom weight for Heading.

#### Muted

Used to visually deemphasize a heading element. **Use with caution. **Heading’s purpose is to be emphasized above regular text. Setting Heading to muted reduces the visual separation.

#### Accent

Accent is deprecated and should be avoided. Use `size` instead of accent to increase emphasis.

#### TextOverflow

Determines whether the Heading component truncates as opposed to wrapping. This should be used as a last resort. Some examples where TextOverflow should be used are:

- Titles used within a grid of elements where text wrapping would cause irregular sizes or shifts in content.
- Situations where text is user/machine generated and extreme edge cases may exist.

Before truncating, attempt to shorten the text if possible. The ideal kind of truncation is no truncation. When truncation is necessary, make sure the full text string is available via `Tooltip` component or `title `attribute.

### Accessibility

- **Navigation and orientation. **Use Heading to create explicit waypoints within an interface. Screen reader users rely on headings to navigate complex interfaces. Headings address common orientation issues in Sanity Studio.
- **Semantic structure.** Always use the `as` prop to render `<h1>`–`<h6>` tags. The default `<div>` rendering provides no heading role. Screen readers will skip it.
- **Logical order.** Heading levels must descend in sequence (H1 → H2 → H3). Do not skip levels (e.g. H1 to H4). Screen reader users navigate by heading level — a gap breaks their mental model.
- **Color contrast.** `muted` headings must maintain **3:1** contrast against the background for large text (24px+ regular or 19px+ bold) and **4.5:1** for smaller text (WCAG 1.4.3 AA).
- **Zoom and reflow.** Heading sizes must remain legible at 400% zoom / 320px viewport width (WCAG 1.4.10 AA). Long headings should wrap, not clip. When using `textOverflow="ellipsis"`, verify clipped headings still make sense in context. Spacing tokens use `rem` and scale with user font-size settings (WCAG 1.4.12 AA).

### **Content**

- **Concise:** Keep headings short and glanceable. Avoid overly long titles that wrap to multiple lines if possible.
- **Sentence case:** Use sentence case for headings (e.g., "Page settings" rather than "Page Settings") to maintain a conversational tone and improve scanability.
- **No punctuation:** Do not use punctuation (periods) at the end of headings unless the heading is a direct question.
- **Descriptive:** Headings should clearly describe the content of the section they introduce.

# Tooltip



**Description** The Tooltip is a floating text label that displays information when a user hovers, focuses, or taps on an element. Its purpose is to provide helpful, non-essential context to a UI element. It succinctly describes the function of an element (like an icon-only button) or enhances baseline understanding without cluttering the interface.

### **API Documentation**

The Tooltip component accepts the following specific properties. It extends `LayerProps` (excluding `as`) .

| **Attribute** | **Type** | **Accepted Values** | **Default** | **Optional** | **Description** |
| --- | --- | --- | --- | --- | --- |
| **content** | ReactNode | `ReactNode` | `undefined` | Yes | The content to be displayed inside the floating tooltip card . |
| **children** | ReactElement | `ReactElement` | `undefined` | Yes | The anchor element (trigger) that the tooltip is attached to . |
| **placement** | String | `'top'`, `'bottom'`, `'left'`, `'right'`, etc. | `'bottom'` | Yes | The preferred position relative to the reference element . |
| **fallbackPlacements** | Array | `Placement[]` | `undefined` | Yes | A list of alternative positions to try if the primary `placement` does not fit in the viewport . |
| **delay** | Number / Object | `number` \|`{ open: number; close: number }` | `0` | Yes |  |
| **arrow** | Boolean | `true` \|`false` | `false` | Yes |  |
| **animate** | Boolean | `true` \|`false` | `false` | Yes |  |
| **disabled** | Boolean | `true` \|`false` | `false` | Yes |  |
| **portal** | Boolean / String | `boolean` \|`string` | `undefined` | Yes |  |
| **padding** | Number / Array | `number` \|`number[]` | `2` | Yes |  |
| **radius** | Number / Array | `number` \|`number[]` | `2` | Yes |  |
| **shadow** | Number / Array | `number` \|`number[]` | `2` | Yes |  |
| **scheme** | String | `'light'`, `'dark'` | `undefined` | Yes | Forces a specific color scheme for the tooltip . |
| **boundaryElement** | HTMLElement | `HTMLElement` | `null` | Yes | Defines the element boundary that the tooltip should not overflow . |

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



Used to trigger an action–like submitting a form, opening a dialog, or performing a command.

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

### Best practices

**Do**

- Use the `tone=”critical”` when an action is destructive, such as delete actions.
- Ensure buttons have a logical tab order in the document flow (left to right, top to bottom).
- Bias towards using text labels in buttons to aid in comprehension.
- Limit the number of primary buttons on the screen. Display one primary action per logical section (example: actions in a toolbar, or a card).
- Add tooltips to icon-icon buttons. Wrap the button in a tooltip, and use `aria-label` – `<Tooltip text="Text"><Button aria-label="Text" icon={...} />`
- Set `iconRight` to `chevron-down` when using `Button` in `MenuButton`
- When using `selected` for toggle buttons, always pass `aria-pressed={selected}`. Sanity UI does not set this for you.
- Use `mode="bleed"` for toggle buttons. The light resting state makes the selected state more visible.

**Don’t**

- Don’t rely on color alone to convey the button's meaning (e.g., an error state should not just be red; use icons or text).
- Don’t use vague labels. Avoid terms like "Click here"; use descriptive labels that explain the action.
- Don’t disable buttons as a blocking function, such as disabling a submit button until all required fields are filled. People may not immediately understand what’s causing the button to be disabled. Instead, allow buttons to be pressed and provide appropriate feedback in response.
- Don’t hide buttons that represent critical actions. Actions that represent primary actions should be visible at all times.
- Don’t overuse icons and text together in buttons. Only use when it doesn't prevent scannability–typically in situations where 3 or less buttons are grouped together.

### States

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `"enabled"` | Button’s standard state (default) | To represent that a button is clickable |  |
| `"hovered"` | Provides a visual cue that the cursor is resting over the component |  |  |
| `“pressed”` | Provides a visual cue that the button is actively being pressed via keyboard input, finger tap, or mouse press. |  |  |
| `“focused”` | Provides a visual cue that the button is in a focused state and is interactable with keyboard inputs |  |  |
| `"disabled"` | Removes the ability to interact with the button in any way | To remove the ability to interact with an action. | When allowing the user to perform an action can cause destructive or harmful outcomes When button is set to a `loading` state |
| `“selected”` | Provides a visual cue that the button has been set as “activated” or “on”. Applies the pressed color state. Sets `data-selected` on the element. | Toggle buttons — switching between on and off. | Bold/italic toolbar, show/hide panel, filter toggles. See the Selected section below |
| `“loading”` | Provides a visual cue that the button’s action is initiated and in the process of completing | To show that a button’s action is in progress when an action is asynchronous or where there is a perceivable delay (+300ms). | Sync actions with large volumes of data Intensive processes like publishing content |

**Note: **It's possible to pass `data-{state}` props to achieve the same styling as CSS pseudo classes. These are equal:

`:hover / [data-hovered]`

`:active / [data-pressed]`

`:disabled / [data-disabled]`



#### Selected

Marks a button as "on" or active. Use `selected` when the button acts as a toggle — switching between two states on each press. Examples: bold/italic in a rich-text toolbar, showing/hiding a panel, activating a filter.

**What **`selected`** does:**

- Sets `data-selected` on the DOM element.
- Applies the pressed color state (darker background, inverted foreground).
- Does NOT set `aria-pressed`. You must add it yourself.

**Single toggle button:**

`const [bold, setBold] = useState(false)`

`<Button`

`  icon={BoldIcon}`

`  mode="bleed"`

`  selected={bold}`

`  aria-pressed={bold}`

`  aria-label="Bold"`

`  onClick={() => setBold(!bold)}`

`/>`



**Toggle group (toolbar):**

`const [format, setFormat] = useState({ bold: false, italic: false })`

`<Flex gap={1}>`

`  <Button`

`    icon={BoldIcon}`

`    mode="bleed"`

`    selected={format.bold}`

`    aria-pressed={format.bold}`

`    aria-label="Bold"`

`    onClick={() => setFormat(f => ({ ...f, bold: !f.bold }))}`

`  />`

`  <Button`

`    icon={ItalicIcon}`

`    mode="bleed"`

`    selected={format.italic}`

`    aria-pressed={format.italic}`

`    aria-label="Italic"`

`    onClick={() => setFormat(f => ({ ...f, italic: !f.italic }))}`

`  />`

`</Flex>`



**Label change for show/hide toggles.** When the button controls visibility of a panel, update both the label and `aria-pressed`:

`<Button`

`  icon={showInspector ? EyeOpenIcon : EyeClosedIcon}`

`  mode="bleed"`

`  selected={showInspector}`

`  aria-pressed={showInspector}`

`  aria-label={showInspector ? 'Hide inspector' : 'Show inspector'}`

`  onClick={() => setShowInspector(!showInspector)}`

`/>`



When NOT to use `selected`:

- To switch between views on a page. Use **Tab** instead.
- To toggle a form boolean (yes/no). Use **Switch** or **Checkbox** instead.
- To mark a chosen item in a list. Use Card with `selected` instead.

When a button is set to selected:

- Pair with label change
- **Combine with **`mode="bleed"` for clean toggle appearance

#### Disabled

Used to prevent a person from performing an action or to show when an action is unavailable. A common use case is marking Button as disabled when `loading={true}`.

Disabled should be used sparingly and only when there’s a high degree of confidence that a person will understand why the button is disabled. For example, buttons for submitting information should remain enabled at all times–even when required fields are not filled.

People should know why an action is disabled. Provide context through an info icon, tooltip, or status message that describes why an action is disabled and steps they can take to enable it.

#### Loading

Used to show that the action initiated is in the process of completing. Loading should only be used for processes that take a noticeable amount of time to complete (typically a process that’s consistently longer than 500ms). The action should be `disabled `until the action has completed. For processes that take over three seconds to complete, consider triggering a Toast to reinforce that the action has been completed.

### **Variants**

The Sanity UI Button supports high-level modes and tones to fit different contexts:

#### Mode

Used to indicate the importance of an action.

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `"bleed"` | No background, minimal visual weight | Used for tertiary actions–which represent uncommon or background actions in a workflow | Forgot password at authentication Close/dismiss in a sheet or modal |
| `"ghost"` | Outlined/bordered appearance | Used for secondary actions–which represent common, but not the most critical action in a workflow. | Cancel button in dialogs Save as draft button when editing content |
| `"default"` | Solid background, full visual weight | Used for primary actions–which represent the most critical action in a workflow. | Publish button when editing content Log in button at authentication |

As a rule of thumb, bleed should represent the majority of actions, followed by ghost, with default being the least used. A common ratio is 60%/30%/10% of bleed/ghost/default.

#### Tone

Used to indicate the semantic meaning of an action.

| **Value** | **Description** | **Purpose** | **Use case** |
| --- | --- | --- | --- |
| `"default"` | Neutral gray | Used to represent general actions within the product. | General actions, Publish |
| `"primary"` | Brand blue | THIS IS TONE IS DEPRECATED. DO NOT USE. | THIS IS TONE IS DEPRECATED. DO NOT USE. |
| `"positive"` | Green | Used for celebratory moments or actions that reinforce success | Success, Publish, Confirm positive |
| `"caution"` | Yellow/Orange | Used for actions that may have high consequences. | Warning states, Changing a role |
| `"critical"` | Red | Used for destructive or dangerous actions. | Destructive actions, Delete |

Buttons using `positive`, `caution`, or `critical `should utilize the `icon `prop with `<CheckmarkIcon />`,` <WarningOutlineIcon />`, or `<ErrorOutlineIcon />` respectively to reinforce state for people with color vision issues.

#### Type

Used to represent the type of action that will occur.

| **Value** | **Description** | **Purpose** | **Use case** |
| --- | --- | --- | --- |
| `"button"` | Standard button (default) | Used to represent all actions outside of the form context. | General functionality not associated with form submission or resetting. |
| `"submit"` | Form submission | Used exclusively for submitting form data. | Form submission. |
| `"reset"` | Form reset | Used exclusively for resetting form data. | Form resetting. |

#### Icon

Typically used to represent an icon button within the interface. Icon buttons should be used in high-density spaces, such as toolbars, or button groups with a large number of actions. Icon buttons should never be used in critical situations where clarity is a must. Decision-based prompts, such as dialogs are another use case where icon buttons should be avoided. Icon buttons should **always** be paired with a tooltip which provides additional context of the button’s action.

While `icon` can be used in conjunction with text, `icon` plus `text` should only be used in two specific circumstances. First, to visually reinforce buttons with a `tone` of `positive`, `caution`, or `critical`. Second, to create even greater emphasis on a primary action. The second use case should be reserved for only the most critical use cases.

#### IconRight

Used to reinforce specific actions within an interface–specifically as visual hints for navigational actions. Examples include:

1. **Use ChevronDownIcon** for dropdown/menu triggers
1. **Use LaunchIcon** for external links
1. **Use ArrowRightIcon** to navigate to a new page
1. **Use ChevronRightIcon** for to drill into nested, column-based navigation
1. **Use chevrons for expand/collapse** with dynamic direction

### Accessibility

- **Accessible names.** Buttons with a `text` prop get their accessible name from the label. Icon-only buttons must have an `aria-label`. The `tooltip` prop does not set an accessible name. Example: `aria-label="Add content"`.
- **Keyboard interaction.** Buttons are focusable via `Tab`. They activate with both `Enter` and `Space`. `Space` activates on key-up and must not scroll the page on key-down. Disabled buttons are removed from the tab order via HTML `disabled`.
- `as`** prop and keyboard behavior.** When `as="a"`, the element activates with `Enter` only — `Space` does not trigger links. Other `as` values may change the implicit ARIA role. Do not use `as` for elements whose behavioral contract Button does not fulfil.
- **Disabled strategy.** Button uses HTML `disabled`, which removes it from tab order. For cases where the user must discover the disabled element, consider `aria-disabled="true"` instead — it keeps the element focusable but blocks activation (WCAG 2.1.1 A). Do not place tooltips on disabled buttons. Keyboard users cannot reach them.
- **Focus indicators.** A visible focus ring appears on keyboard focus. Do not suppress it without a high-contrast replacement.
- **Color contrast.** Button text vs. background must meet **4.5:1** for standard-size text (WCAG 1.4.3 AA). The button's visual edge against nearby colors must meet **3:1** (WCAG 1.4.11 AA). These are separate criteria — do not conflate them.
- **Minimum target size.** Button's default padding produces targets that meet the **24×24 CSS px** minimum (WCAG 2.5.8 AA). Custom padding values must not shrink the target below this size.
- **Tone and icons.** Do not rely on tone color alone to convey meaning. Pair `'positive'`, `'caution'`, and `'critical'` tones with icons.
- 

### **Content**

- **Be concise:** Button labels should be short and predictable. Use simple and direct language.
- **Start with verbs:** Labels should describe the action taken (example: "Publish", "Edit", "Upload"). For extra clarity, add the subject of the action, (example: Upload image).
- **Sentence case:** Use sentence case for button labels (example: "Add item").

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
- **`onChange` uses `currentTarget`.** Use `event.currentTarget.value` to read the input value. This follows the React `SyntheticEvent` pattern. `event.target` may require a type cast to `HTMLInputElement`.

# Toast

Used to show brief status messages about completed actions, warnings, or errors. Toasts appear at the edge of the screen and disappear after a short time.

---

## Setup — ToastProvider is required

`ToastProvider` must wrap your app for `useToast()` to work. It is NOT included in `ThemeProvider`. Omitting it causes a runtime error with no helpful message.

`ToastProvider` must be **inside** `ThemeProvider`. The nesting order matters.

```jsx
// main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, studioTheme, ToastProvider } from '@sanity/ui'
import App from './App'
import './reduced-motion.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={studioTheme}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
```

**If `useToast()` throws at runtime**, the most likely cause is a missing `ToastProvider`. Check that it wraps the component tree above the component calling `useToast()`.

---

## Basic usage — useToast() and toast.push()

Call `useToast()` inside any component to get the `toast` object. Call `toast.push()` to show a toast.

```jsx
import { useToast, Button } from '@sanity/ui'

function PublishButton() {
  const toast = useToast()

  const handlePublish = () => {
    // ... perform the action ...
    toast.push({
      status: 'success',
      title: 'Document published',
    })
  }

  return <Button text="Publish" onClick={handlePublish} tone="default" />
}
```

---

## toast.push() API

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `title` | `string` | Yes | The main message. Keep to one sentence. |
| `status` | `'success'` \| `'error'` \| `'warning'` \| `'info'` | No | Sets the tone and icon. Defaults to `'info'`. |
| `description` | `string` | No | A secondary line below the title. Keep short. |
| `closable` | `boolean` | No | Shows a close button. Defaults to `true`. |
| `duration` | `number` | No | Auto-dismiss time in milliseconds. Defaults to `5000`. Set to `0` to keep the toast visible until closed. |

### Status values

| Status | Tone | Icon | Use case |
| --- | --- | --- | --- |
| `'success'` | `positive` | `CheckmarkCircleIcon` | Action completed — "Document published" |
| `'error'` | `critical` | `ErrorOutlineIcon` | Action failed — "Upload failed. Try a smaller file." |
| `'warning'` | `caution` | `WarningOutlineIcon` | Non-blocking issue — "Connection unstable" |
| `'info'` | `default` | `InfoOutlineIcon` | Neutral update — "3 items moved to drafts" |

---

## Code examples

### Success toast

```jsx
toast.push({
  status: 'success',
  title: 'Document published',
})
```

### Error toast with description

```jsx
toast.push({
  status: 'error',
  title: 'Upload failed',
  description: 'The file exceeds the 10 MB limit. Try a smaller file.',
})
```

### Warning toast

```jsx
toast.push({
  status: 'warning',
  title: 'Unsaved changes',
  description: 'Save your work before leaving this page.',
})
```

### Persistent toast (no auto-dismiss)

```jsx
toast.push({
  status: 'error',
  title: 'Connection lost',
  description: 'Changes will not be saved until the connection is restored.',
  closable: true,
  duration: 0,
})
```

### Toast after a long-running action

Fire a toast when an action takes over 3 seconds. The user may have moved on.

```jsx
const handleExport = async () => {
  setLoading(true)
  try {
    await exportData()
    toast.push({
      status: 'success',
      title: '3 items exported',
    })
  } catch (err) {
    toast.push({
      status: 'error',
      title: 'Export failed',
      description: err.message,
    })
  } finally {
    setLoading(false)
  }
}
```

---

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

---

## Content

- **Name the action and its result (P7).** Write "Document published" — not "Success." Write "3 items deleted" — not "Done." Users must know what happened without looking back.
- **Use past tense for done actions (P7).** Write "Published," "Saved," "Deleted." Use "-ing" for actions not yet done: "Publishing…," "Saving…"
- **Keep the title under one sentence (P7).** Toast messages must be easy to read at a glance.
- **Use `description` for extra detail.** If the problem needs more context, put it in `description`. Do not cram two sentences into `title`.
- **Use `status` to match the outcome (P7).** `'success'` for good outcomes. `'error'` for failures. `'warning'` for non-blocking issues. `'info'` for neutral updates.
- **Loading messages must name the task (P7).** Write "Publishing document…" or "Uploading image…" when the task is known. Use "Loading…" only when the task is unknown.
- **Casing (P8).** Use sentence case for title and description.
- **Translation (P9).** Toast text can grow 30–50% in other languages. Keep base text short to leave room for growth.

---

## Accessibility

- **Live region.** `ToastProvider` renders a container with `aria-live`. Success and info toasts use `aria-live="polite"`. Error toasts use `aria-live="assertive"`. Screen readers announce the text when it appears (WCAG 4.1.3 AA).
- **Do not rely on color alone.** Each `status` value pairs a tone with an icon. The icon is added by the component. If you build a custom toast layout, pair `tone="critical"` with `ErrorOutlineIcon` and `tone="positive"` with `CheckmarkCircleIcon` (WCAG 1.4.1 A).
- **Auto-dismiss timing.** Toasts auto-dismiss after 5 seconds by default. For error toasts that require user attention, set `duration: 0` to keep the toast visible until the user closes it. All auto-dismissing toasts must stay visible long enough to be read — do not set `duration` below 3000ms.
- **Known Sanity UI issue.** `ToastProvider` renders a `<ul>` element with `list-style: none`. WebKit strips list semantics from unstyled lists. VoiceOver may not announce the container as a list. This is a library-level issue. See `accessibility-standards.md` §9.

---

## Common mistakes

### Missing ToastProvider

```jsx
/* ✗ useToast() throws — no ToastProvider in the tree */
<ThemeProvider theme={studioTheme}>
  <App /> {/* App calls useToast() */}
</ThemeProvider>

/* ✓ ToastProvider wraps the app inside ThemeProvider */
<ThemeProvider theme={studioTheme}>
  <ToastProvider>
    <App />
  </ToastProvider>
</ThemeProvider>
```

### ToastProvider outside ThemeProvider

```jsx
/* ✗ Wrong order — ToastProvider has no theme context */
<ToastProvider>
  <ThemeProvider theme={studioTheme}>
    <App />
  </ThemeProvider>
</ToastProvider>

/* ✓ Correct order */
<ThemeProvider theme={studioTheme}>
  <ToastProvider>
    <App />
  </ToastProvider>
</ThemeProvider>
```

### Vague toast messages

```jsx
/* ✗ Vague — user does not know what happened */
toast.push({ status: 'success', title: 'Success!' })
toast.push({ status: 'error', title: 'Something went wrong' })

/* ✓ Specific — names the action and the result */
toast.push({ status: 'success', title: 'Document published' })
toast.push({ status: 'error', title: 'Image upload failed. File exceeds 10 MB.' })
```

# Card



The Card component is a foundational layout primitive that serves as a container for content. It functions similarly to a Box but includes specific properties for managing background color, foreground text color, borders, radii, and shadows. It’s used to create distinct zones or "surfaces" within the UI.

### API Documentation

_Refer to TypeDocs in Card.tsx_

### **When to Use / When Not to Use**

**When to use:**

- You need to group related content together on a distinct background surface.
- You need to invert the color scheme of a specific section (e.g., a dark card inside a light view) using the `scheme` prop.

**When not to use:**

- To group elements for layout without visible boundaries or background colors. Use **Box** or **Flex** instead to avoid unnecessary DOM nesting and style calculations.
- You are building a button. While `pressed` and `selected` props exist, use the **Button** component for interactive actions to ensure full keyboard accessibility and semantic validity.
- As a layout element. Use Box, Flex, Grid, Inline, or Stack instead.

### **Usage Dos and Don’ts**

**Do	**

- Use the `tone` prop to communicate the semantic state of the content (e.g., use `'critical'` for error messages or destructive zones).
- Limit the scope of content within a Card to a single topic.
- Use the `as` prop to change the semantic HTML tag (e.g., `as="article"` or `as="section"`) to improve document structure and navigation for screen readers.

**Don’t**

- Don’t manually set text colors inside a Card unless absolutely necessary. Rely on the Card to automatically provide high-contrast text colors based on the selected `tone`.
- Don't rely on color alone to convey meaning (e.g., a red card background) for users with color blindness; ensure text labels or icons accompany the color change.
- Use caution when nesting cards. Cards are intended to be an atomic composition. Use Box, Flex, Grid, Inline, or Stack instead.
- Don't add interactive elements to Card when paired with an onClick event.

**Horizontal dividers.** Sanity UI does not export a general-purpose `Divider` component (`MenuDivider` is for menus only). To create a horizontal rule between sections, use `<Card borderBottom />` with no padding. This renders a thin border line that inherits the Card color context.

```jsx
/* Horizontal divider between sections */
<Stack space={4}>
  <Text>Section one content</Text>
  <Card borderBottom />
  <Text>Section two content</Text>
</Stack>
```

### **Variants & Examples**

#### Tone

Sets the color of the Card. Should be set to `default` in typical use cases.

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `default` | Uses the default background color. | For general use to display content with no emphasis or semantic meaning. This represents the vast majority of use cases. | A normal item in a dashboard. |
| `transparent` | DO NOT USE | DO NOT USE | DO NOT USE |
| `positive` | Uses a green background color. | For indicating content associated with success or completion. | Representing a successful billing transaction.. Representing a process that is healthy. |
| `caution` | Uses a yellow background color. | For indicating content that needs attention, but is not critical or blocking. | Representing a credit card that is no longer valid for the next billing cycle. Representing a process that is at risk. |
| `critical` | Uses a red background color. | For indicating content that represents a critical or blocking error. | Representing a recent transaction that failed. Representing a process that is not working. |
| `primary` | Uses a blue background color. | For indicating high-priority or branded content. | Displaying content as an upsell. Providing contextual, educational, or onboarding information. |
| `brand` | DO NOT USE | DO NOT USE | DO NOT USE |

**Note: **Card’s semantic tone values should be paired with an associated icon (ex: `ErrorOutlineIcon` for `critical `to visually reinforce the semantic meaning of the content.

#### Muted

**Use with caution.**This prop darkens Card’s background. Use in rare situations when greater emphasis is needed when using a tone of `positive`, `caution`, `critical`, or `primary`.

#### Border

Provides a visual border for the Card. Should be enabled in Card’s typical use cases. Border should be used instead of `shadow={0}.`

Individual borders can be set with `borderLeft`, `borderRight`, `borderTop`, `bottomBottom`, `borderX`, or `borderY`. These props should be used with caution.

#### Radius

Sets the corner radius for Card. Should be set to `2` in typical use cases.

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `0` | No border radius | To act as a container of content with a specific background. | Creating visual separation of specific content with the background. Providing a semantically toned background to content in order to provide visual meaning. |
| `1` | Hairline border radius | USE WITH CAUTION | USE WITH CAUTION |
| `2` | Extra-small border radius | Used in the majority of cases–typically where Card’s padding is set to `3` or below. | The majority of Card use cases–specifically in normal to high density compositions. |
| `3` | Small border radius | To create greater visual balance in cases where Card’s padding is set to `4` or above. | In lower-density compositions. |
| `4` | Medium border radius | USE WITH CAUTION | USE WITH CAUTION |
| `5` | Large border radius | USE WITH CAUTION | USE WITH CAUTION |
| `6` | Extra-large border radius | USE WITH CAUTION | USE WITH CAUTION |
| `“full”` | A pill shaped border-radius. | USE WITH CAUTION | USE WITH CAUTION |

#### Shadow

Shadow is intended to denote elevation. Cards that are floating above the base UI layer should have a shadow applied. The higher the elevation, the larger the shadow. Note: Avoid using `shadow={0}` as a substitute for a border. It’s not recommended to use shadow for the purpose of visual emphasis. Use `tone={transparent}` instead.

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `0` | A hairline shadow. | USE WITH CAUTION | USE WITH CAUTION |
| `1` | A low-elevation shadow for when a card is displayed directly above the base layer. | To create visual separation between a floating Card and the immediate background. | When a Card is used as a makeshift notification or floating message. |
| `2` | A mid-elevation shadow for when a card is displayed directly above low-elevation elements and the base layer. | USE WITH CAUTION | USE WITH CAUTION |
| `3` | A high-elevation shadow for when a card is displayed at the highest elevation. | USE WITH CAUTION | USE WITH CAUTION |

#### Scheme

**Use with caution. **Used to explicitly set the color scheme to light or dark. This can be used to invert the palette for a card. Inverting the scheme can be used to create greater emphasis–when `muted` is not enough.

#### Pressed

**Use with caution. **Applies a pressed visual state to the card. Card’s primary use case is to contain content. Consider other options unless absolutely necessary.

#### Selected

**Use with caution.  **Applies a selected visual state to the card. Card’s primary use case is to contain content. Consider other options unless absolutely necessary.

#### Padding

Sets the internal padding for content within Card.

| **Value** | **Description** | **Purpose** | **Use case(s)** |
| --- | --- | --- | --- |
| `0` | No padding | USE WITH CAUTION | USE WITH CAUTION |
| `1` | Smallest padding | USE WITH CAUTION | USE WITH CAUTION |
| `2` | Extra-extra-small padding | Displaying a chunk of content in very high density compositions. | Displaying a high-volume list of content in a sidebar |
| `3` | Extra-small padding | Displaying a chunk of content in medium to high density compositions. | Displaying a collection of cards in a grid, such as Canvas templates |
| `4` | Small padding | Displaying a chunk of content in low to medium density compositions. | Displaying a collection of content within a dashboard |
| `5` | Medium padding | Displaying a chunk of content in very low density compositions. | Displaying form fields within an auth flow |
| `6` | Large padding | USE WITH CAUTION | USE WITH CAUTION |
| `7` | Extra-large padding | USE WITH CAUTION | USE WITH CAUTION |
| `8` | Extra-extra large padding | USE WITH CAUTION | USE WITH CAUTION |
| `9` | Largest padding | USE WITH CAUTION | USE WITH CAUTION |

Individual padding can be set with `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`, `paddingX`, or `paddingY`. These props should be used with caution.

### Accessibility

- **Semantic elements via `as`.** Card accepts an `as` prop. Choose the value based on the content:
  - `as="section"` — creates a landmark, but only if it has a heading child or `aria-label`. Without an accessible name, `<section>` is the same as `<div>` (WCAG 1.3.1 A).
  - `as="article"` — marks self-contained content. Does not require a label to be a landmark.
  - `as="aside"` — marks supplementary content. Add `aria-label` when the role is not clear from context.
  - `as="form"` — requires an accessible name via `aria-label`, `aria-labelledby`, or `<legend>`.
- **Behavioral elements.** Card does not fulfil the behavioral contract of `<button>`, `<dialog>`, `<form>`, or `<fieldset>` (WCAG 4.1.2 A). Using `as="button"` on Card does not add keyboard activation, focus management, or the implicit ARIA button role. Use the Button component for interactive actions.
- **Interactive cards.** If a Card is clickable:
  - It must have a valid `tabindex` to be focusable.
  - It must respond to `Enter` and `Space` key events.
  - It must have an accessible name. A clickable card with only visual content is announced as a plain container. Add `aria-label` or include a text element that names the action (WCAG 4.1.2 A).
  - Prefer a stretched link inside the Card over adding `onClick` to the Card itself.
- **Contrast.** Card handles text color contrast for its tones. If you nest custom components, verify text maintains a **4.5:1** ratio against the Card's `tone` (WCAG 1.4.3 AA).
- **Focus indication.** If Card is interactive, it must have a visible focus style. Do not suppress the outline without a high-contrast replacement.
- **Heading hierarchy.** Heading levels inside a Card must follow the page hierarchy. Do not start with `<h1>` inside a Card if the page already has a main title (WCAG 1.3.1 A, 2.4.6 AA).
- **`selected` does not set `aria-selected`.** The `selected` prop sets `data-selected` for styling only. It does NOT set `aria-selected`. Do not add `aria-selected` to a `<div>` Card — it is invalid on elements without a supporting role like `option`, `row`, or `tab` (WCAG 4.1.2 A). For a selectable list, use `role="listbox"` on the container and `role="option"` on each Card. Or avoid `aria-selected` and use `aria-current="true"` to mark the active item instead.
- **Selectable list pattern.** When building a list of selectable Cards, structure it as a listbox:

  ```jsx
  /* ✗ Invalid — aria-selected on a plain <div> Card */
  <Stack space={2}>
    <Card selected={activeId === 1} aria-selected={activeId === 1}>Doc 1</Card>
  </Stack>

  /* ✓ Valid — role="listbox" + role="option" supports aria-selected */
  <Stack space={2} role="listbox" aria-label="Documents">
    <Card role="option" aria-selected={activeId === 1} selected={activeId === 1}
      tabIndex={0} padding={3} border>
      Doc 1
    </Card>
  </Stack>

  /* ✓ Also valid — aria-current avoids the role requirement */
  <Stack space={2}>
    <Card selected={activeId === 1}
      aria-current={activeId === 1 ? 'true' : undefined}
      padding={3} border>
      Doc 1
    </Card>
  </Stack>
  ```

  **Do not nest interactive elements inside a `role="option"` Card.** A Card with `role="option"` is itself interactive. Placing a Button, MenuButton, or link inside it creates nested interactive elements — screen readers cannot announce them and keyboard focus breaks. Move action buttons outside the selectable Card, or place them in a separate column that is not inside the `role="option"` element.

  ```jsx
  /* ✗ Nested interactive — Button inside role="option" */
  <Card role="option" aria-selected={active} tabIndex={0} padding={3}>
    <Flex align="center" justify="space-between">
      <Text>{doc.title}</Text>
      <Button icon={EllipsisVerticalIcon} mode="bleed" aria-label="Options" />
    </Flex>
  </Card>

  /* ✓ Actions outside the selectable element */
  <Flex align="center" gap={2}>
    <Card role="option" aria-selected={active} tabIndex={0} padding={3} flex={1}>
      <Text>{doc.title}</Text>
    </Card>
    <Button icon={EllipsisVerticalIcon} mode="bleed" aria-label="Options" />
  </Flex>
  ```
- **Clickable card pattern.** Do not add `onClick` to Card. Use a stretched link inside the Card instead:

  ```jsx
  <Card padding={3} border radius={2} style={{ position: 'relative' }}>
    <Stack space={2}>
      <Heading as="h2" size={1}>
        <a href={`/doc/${doc.id}`}
          style={{ textDecoration: 'none', color: 'inherit',
            position: 'absolute', inset: 0 }}>
          {doc.title}
        </a>
      </Heading>
      <Text size={1} muted>{doc.type}</Text>
    </Stack>
  </Card>
  ```

### **Content Guidelines**

- **Hierarchy:** Cards often act as containers for grouped information. Ensure the heading levels (H2, H3, etc.) inside the card respect the page's overall outline. Do not start with an H1 inside a card if the page already has a main title.
- **Grouping:** Content within a card should be logically related. If the content describes different distinct topics, split them into separate cards to reduce cognitive load.

# Menu



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

**When not to use:**

- You have fewer than 3 actions; consider displaying them inline as buttons or links for better discoverability.

### **Best practices**

**Do	**

- Use `MenuDivider` to group related actions (e.g., separating "Edit" actions from "Destructive" actions).
- Use the `hotkeys` prop to indicate keyboard shortcuts for power users.
- Use `tone="critical"` on `MenuItem`s that perform destructive actions like deletion.

**Don’t**

- Use caution when nesting `MenuGroup`s more than 2 levels deep. Menus nested beyond 2 levels are hard to navigate and prone to closing by accident.
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
- **`MenuButton` requires an `id` prop.** The `id` connects the trigger button to the menu for ARIA. Omitting it causes no console error, but screen readers cannot link the trigger to its popup.
- **`popover={{ portal: true }}` for clipped containers.** When a MenuButton sits inside a container with `overflow: hidden`, the menu gets clipped. Pass `popover={{ portal: true }}` to render the menu in a portal outside the overflow container.

### **Content Guidelines**

- **Concise Labels:** Keep `MenuItem` text short (1-3 words). Use verbs that describe the action (e.g., "Rename", not "Change the name").
- **Sentence Case:** Use sentence case for all menu items (e.g., "Open in new tab").
- **Predictable Grouping:** Place destructive actions (like Delete) at the bottom of the list, ideally separated by a `MenuDivider` to prevent accidental clicks.
- **Consistent Icons:** If you use icons for some items in a group, try to use icons for all items in that group to maintain visual alignment.

# Popover



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


# List of all Sanity Icons in TSV format

Icon name	Alternative names	Purpose	When to use	When not to use	Additional best practices
FilledIcon		Represents content in use	- To show that something is used (opposite of EmptyIcon)	- To indicate success or completion. Use CheckmarkIcon or CheckmarkCircleIcon instead.
CheckmarkCircleFilledIcon		Represents a completed task or successful step	- To represent general tasks in a completed state. - To represent success at small sizes where greater visual weight/distinction is important.	- To represent success when the icon is displayed at a normal or large size. Use CheckmarkIcon instead.
CloseCircleIcon	Cancel Circle | Remove Circle | Exit Circle
CheckmarkCircleIcon	Success Circle | Confirmed Circle | Done Circle	Represents an incompleted task	- To represent general tasks independent of completion state. - To view/manage tasks. 	- For tasks with an explicitly defined deadline. Use TaskIcon instead. - To explicitly a completed task. Use CheckmarkCircleFilledIcon instead. - To explicitly indicate an incompleted task. Use CircleIcon instead. - To indicate success. Use CheckmarkIcon or CheckmarkCircleFilledIcon instead.
CircleIcon	Dot Large | Point | Marker	Incompleted general tasks	- To represent general tasks in an incompleted state. 	- Explicitly as a radio button or checkbox. Use actual components instead.
AccessDeniedIcon	Forbidden | No Entry | Restricted	Indicates access restrictions or permissions denial	- Use when a user lacks permission to access content or features	- For errors that aren't related to user permissions. Use ErrorOutlineIcon or ErrorFilledIcon instead.  - For warnings that aren't related to user permissions. Use WarningOutlineIcon or WarningFilledIcon instead. - To represent an action to gain access. Use LockIcon instead.
AddIcon	Plus | Create | New	Adding a new or existing item to an element	"- Adding/creating a new item that doesn't benefit from the specificity of an icon with an ""add"" modifier  (example: add-document) - As a button for the primary add/create action - As a button when only one type of content can be added - As a menu button to display the options of what type of item to add"	- When there are multiple add actions on a page. Use a more specific icon is available like AddCommentIcon for comments - To indicate showing UI columns/rows in the UI. Use split-horizontal or split-vertical instead. - To indicate inviting people/members to an organization or group. Use AddUserIcon instead. - For adding content in a list where position does matters. Use InsertAboveIcon or InsertBelowIcon instead.	"- Add a label with the icon when space permits.   - When creating a new item, use ""New [ITEM TYPE]"". Example: ""New document""    - When adding an existing item, use ""Add [ITEM TYPE ]"". Example: ""Add tag"". - In cases where a label is not used, add a tooltip.    - When creating a new item, use ""Create a new [ITEM TYPE]"". Example: ""Create a new document""    - When adding an existing item, use ""Add a [ITEM TYPE ]"". Example: ""Add a tag""."
AddCommentIcon	Comment Add | New Comment | Reply	To provide an affordance for adding a comment or reply. 	- To represent the ability to add a comment or reply to a thread. Especially when commenting is a secondary action.	- To view comments. Use CommentIcon instead. - When commenting is the primary action within a feature. Consider AddIcon instead.
AddUserIcon		To add a role or add/invite users to a group 	- For adding people to a user group or a team - To add people to a permissions group - To add a role	- As a general action for sharing. Use ShareIcon instead.
ClipboardIcon	Copy | Paste | Buffer	To represent pasting text from clipboard	- For pasting from clipboard actions only. 	- To represent copying or copying to clipboard. Use CopyIcon instead. - To represent pasting an image from clipboard. Use  ClipboardImageIcon instead.
ClipboardImageIcon	Copy Image | Image Buffer | Screenshot	To represent pasting an image from clipboard	- Specifically for pasting image data from the clipboard.	- For general pasting actions. Use ClipboardIcon instead.
CloseIcon	X | Exit | Dismiss	Close or dismiss UI elements	- Closing a menu or popover. - Dismissing a modal, panel, or sheet. - Removing a Card from view.	- For deleting or removing items. Use RemoveIcon instead.  - For errors. Use ErrorIconOutline instead.  - For permission issues. Use AccessDeniedIcon instead. - For clearing content from an input. Use CloseCircleIcon instead. - Concealing a panel. Use PanelLeftIcon/PanelRightIcon instead.
CogIcon	Settings | Configuration | Preferences	View or manage settings	- Use to indicate settings for an item or application	- For general tools or maintence. Use WrenchIcon instead. - To represent local computer settings. Use DesktopIcon instead. - To indicate configurations. Use ControlsIcon instead.
CollapseIcon	Minimize | Contract | Fold	To exit the interface out of a maximized state or mode.	- For exiting a full screen mode in the interface - For exiting a focus mode in the interface	- For closing UI elements. Use CloseIcon instead. - For collapsing UI elements. Use ChevronUp instead. - For hiding UI elements. Use EyeClosedIcon instead.
CommentIcon	Message | Feedback | Discussion	To represent comments, discussions, or threads	- To demarcate comment sections  - To show comments within the UI - To use as a visual indicator for the number of comments	- For creating new comments. Use AddCommentIcon instead. - For referencing or soliciting feedback. Use FeedbackIcon instead.
CopyIcon	Duplicate | Clone | Copy	Copying or duplicating actions	- For copying general text to clipboard - For duplicating items or cloning operations	- For copying a link/URL to the clipboard. Use LinkIcon instead.
DocumentsIcon	Multiple Files | Collection | Archive	To represent multiple documents or a group of documents	- To represent multiple documents or general files	- For single documents. Use DocumentIcon instead.
DownloadIcon	Save | Get | Pull	To represent downloading or exporting of content	- To indicate downloads or downloading actions.  - To indicate exports or exporting actions.  	- For uploads or uploading actions. Use UploadIcon instead. - For imports or importing actions. Use UploadIcon instead. - For actions associated with publishing. Use UnpublishIcon instead.
EllipsisHorizontalIcon	More Options | Menu | Additional	Reveal additional actions in a menu	- Revealing additional options or actions in an overflow menu 	- For revealing a navigation menu. Use MenuIcon instead. - To indicate truncated text. Use typographic ellipses instead.
EmptyIcon		To indicate that no results exist or that something is in a blank state	- To indicate that parent has no children - To show that there are no results or instances of something   - To show that something isn't used	- To indicate null values
ErrorOutlineIcon	Error | Alert | Failed	To represent a general error within the application.	- To represent a critical or blocking error - When an operation or process fails - To visually demarcate an error message	- To represent issues that are neither critical nor blocking. Use WarningOutlineIcon instead. - To represent issues related to user permissions. Use AccessDeniedIcon instead.
ExpandIcon	Maximize | Grow | Enlarge	To enter the interface into a maximized state or mode.	- For entering full screen mode in the interface - For entering focus mode in the interface 	- For expanding UI elements. Use ChevronDown instead. - For making UI elements visible. Use EyeOpenIcon instead.
EyeClosedIcon	Hidden | Invisible | Off	To indicate that an item is hidden from view or to make an item hidden from view	- For hiding content from view, such as passwords or content elements.	- For hiding, closing or dismissing UI elements. Use CloseIcon instead.  - For collapsing UI elements. Use ChevronUpIcon instead. - To represent private content or making something private. Use LockIcon instead.
EyeOpenIcon	Visible | Show | View	To indicate that an item is visible or to make an item visible	- For showing content in a view, such as passwords or content elements.	- For opening new content, such as tabs, windows, previews or applications. Use LaunchIcon instead. - For exposing UI elements. Use ChevronDownIcon instead. - To represent pubilc content or making something public. Use EarthGlobeIcon instead.
FeedbackIcon		To represent a feature or action to collect feedback from users	- When asking for feedback or to indicate that a feature is open for feedback	- To represent comments. Use CommentIcon instead. - To represent discussion threads. Use CommentIcon instead.
FilterIcon	Funnel | Sort Options | Refine	Filtering or refine a group of items	- To reveal a filter menu or a group of filters - To reveal a group of filters and sort options. - To perform a filtering action  	- For sorting or reordering items. Use SortIcon instead. - To reveal a free-form text input filter. Use SearchIcon instead.
HomeIcon	House | Main | Start	Home or main page	- To provide a direct link to the top-most page of Sanity.	- To link to the entry page of an individual application or plugin.
ImageIcon	Picture | Photo | Media	To represent a single image	- To represent an image or image file.  - As a placeholder for an image before it's fully loaded	- To represent multiple images. Use ImagesIcon instead. - To represent a video. Use VideoIcon instead.
ImageRemoveIcon	Delete Image | Remove Photo | Clear	Removing or deleting an image	- For image removal or deletion 	- For general removal. Use RemoveIcon instead. - For any actions associated with image editing.
ImagesIcon	Gallery | Multiple Photos | Collection	To represent a collection of images or a collection of mixed media formats	- To represent multiple images or media files	- To represent a single image. Use ImageIcon instead. - To represent a general collection. Use PackageIcon instead.
JsonIcon	Data | JSON Format | Code	To represent JSON data.	- For JSON editors - For JSON data display	- To represent inline code. Use CodeIcon instead. - To represent a code blocks. Use CodeBlockIcon instead.
LinkIcon	Hyperlink | Connection | URL	Links or connections	- To represent a link or copying a link to the clipboard - To represent linking one item to another	- For unlinked items. Use LinkRemovedIcon instead. - For broken links. Use UnlinkIcon instead.
LockIcon	Locked | Secure | Private	To represent locked or secured content	- To represent locked content or an action to lock content. - To represent an action to gain access to private content. - To represent private content/items - To represent that content cannot be altered.	- As a general toggle for locking/unlocking. Use UnlockIcon and LockIcon in conjunction. - To represent locking/docking of interface elements. For sidebar locking/docking use PanelLeftIcon or PanelRightIcon instead.
MasterDetailIcon	Split View | Layout | Detail Pane	To represent the Sanity Studio	- Representing the Structure tool within Sanity Studio	- For any purpose other than representing the Structure tool within Sanity Studio
MenuIcon	Hamburger | Navigation | Drawer	Reveal main navigation in a menu or panel	- To represent the main navigational menu.	- For any menu that is not the primary navigation.  - For filter menus, use FilterIcon instead. - For options menus, use EllipsisHorizontalIcon instead. - For secondary menus, use ChevronDown instead. 	- MenuIcon should be used once in a screen. Avoid multiple menu affordances to represent different navigational elements.
OlistIcon	Ordered List | Numbered | Sequence	Ordered/numbered lists	- To represent numbered lists - List formatting for ordered lists	- To represent a general list. Use ListIcon instead. - For unordered lists. Use UlistIcon instead.
PanelLeftIcon	Sidebar Left | Left Panel | West	Toggle the visibility of a left panel or sidebar	- Toggling the visibility, docking or locking a left sidebar/panel	- Don't use for navigation. Use MenuIcon instead. - Don't use to indicate closing the PanelRightIcon. Use PanelLeftIcon instead.	"- Consider RTL languages when using panel left/right. - Make sure to reinforce which toggle action will occur in the label (ex: ""Open the navigation panel"")"
PanelRightIcon	Sidebar Right | Right Panel | East	Toggle the visibility of a left panel or sidebar	- Toggling the visibility, docking or locking a right sidebar/panel	- Don't use for navigation. Use MenuIcon instead. - Don't use to indicate closing the PanelLeftIcon. Use PanelRightIcon instead. 	"- Consider RTL languages when using panel left/right. - Consider RTL languages when using panel left/right. - Make sure to reinforce which toggle action will occur in the label (ex: ""Close the inspector panel"")"
PauseIcon	Stop | Hold | Wait	Pausing media playback or holding actions	- For pausing media playback  - For holding processes or actions	 - Don't use for stopping playback completely or terminating actions. Use StopIcon instead.
PlayIcon	Start | Run | Begin	Starting media playback or initiating actions	- To represent media playback or starting media playback  - For initiating processes or actions	- For toggling visibility of items within a tree view. Use ToggleArrowRightIcon instead.
SearchIcon	Find | Magnify | Look	Search/find content/information	- Used to represent any form of search or text-input filtering	- For code inspection. Use JsonIcon instead. - For non-text-input filtering of list items or table rows. Use FilterIcon instead.
SortIcon	Order | Arrange | Organize	Sorting or ordering a group of items	- For sorting items in a group - For toggling the sort order of items in a group	- For filtering. Use FilterIcon instead. - When filter and sort actions are combined. Use FilterIcon instead. - To indicate a transfer of information. Use TransferIcon instead.
SparkleIcon	AI	Used exclusively to represent Sanity's branded Content Agent feature	- To represent Sanity's Content Agent feature	- For any purpose other than representing Sanity's Content Agent feature
SparklesIcon	Magic | AI | Enhanced	To represent AI or agentic features	- As a general purpose represention for AI-powered features	- When there are more specific AI icons. For AI-writing features, use ComposeSparklesIcon instead. - For in-product celebrations or announcements. Use ConfettingIcon instead.
StackCompactIcon	List Compact | Dense | Tight	To represent general vertically stacked content at higher density 	- To set a higher viewing density for a stack of items	- To represent a stack with normal density. Use StackIcon instead.
StackIcon	List | Layers | Pile	To represent general vertically stacked content at normal density	- To toggle a group of items to be vertically oriented - To set a normal viewing density for a stack of items	- For compact/dense stacked views. Use StackCompactIcon instead. - For collections of content. Use PackageIcon instead. - To represent lists. Use ListIcon instead. - To represent files or documents or any form of content. Use DocumentsIcon instead.
StarFilledIcon	Starred | Favorited | Rating	To represent content that is currently set as a favorite	- Displaying an item as being favorited - As a toggle for removing an item to their favorites	- Showing that an item can be set as a favorite. Use StarIcon instead. - Adding a favorite or toggling a favorite off. Use StarIcon instead.  - For new features. Use [TBD] instead. - For bookmarks. Use BookmarkIcon instead. - For liking. Use HeartIcon instead. - For rating. Use [TBD] instead.
StarIcon	Unstarred | Favorite | Featured | Rating	To represent content that can be favorited	- View/managing favorites - Displaying that an item can be favorited - As a toggle for adding an item to their favorites 	- Showing that an item is set as a favorite. Use StarIconFilled instead. - Removing a favorite or toggling a favorite off. Use StarIconFilled instead.  - For new features. Use [TBD] instead. - For bookmarks. Use BookmarkIcon instead. - For liking. Use HeartIcon instead. - For rating. Use [TBD] instead.
StopIcon	End | Terminate | Cancel	Stopping media playback or terminating actions	- For stopping media playback - For terminating processes or actions	- Don't use for pausing playback temporarily or holding actions. Use PauseIcon instead.
TagIcon	Label | Category | Keyword	Single tag, label or keyword	- To represent the action of adding a tag.  - To indicate text as a tag or keyword	- To represent multiple tags. Use TagsIcon instead.
TagsIcon	Labels | Categories | Keywords	Multiple tags, labels or keywords	- To indicate multiple tags or keywords exist for an item - To indicate editing a groupd of keywords/tags.	- For a single tag or keyword. Use TagIcon instead. - To represent adding a tag. Use TagIcon instread.
ThLargeIcon	Grid Large | Tiles | Gallery	To present a grid or tile view	- To represent grid views or tile layouts	- For tables or tabular data lists. Use ThListIcon instead. - For general lists. Use ListIcon instead.
ThListIcon	List View | Rows | Table	To represent a table view	- To represent a table view or tabular data	- To represent a general list. Use ListIcon instead.
UlistIcon	Unordered List | Bullets | Items	Unordered/bulleted lists	- To represent bulleted lists - List formatting for unordered lists 	- To represent a general list. Use ListIcon instead. - For numbered lists. Use OlistIcon instead.
UnlockIcon	Unlocked | Open | Public	Unlocked or open state	- To represent unlock content or an action to unlock content. - To represent content/items that the user can access but is not publicly available. - To explicitly represent that content can be altered. 	- As a general toggle for locking/unlocking. Use UnlockIcon and LockIcon in conjunction. - To represent unlocking/undocking of interface elements. For sidebar locking/docking use PanelLeftIcon or PanelRightIcon instead. - To represent public content. Use EarthGlobeIcon instead.
UploadIcon	Send | Push | Import	To represent uploading or importing of content	- To indicate uploads or uploading actions.  - To indicate imports or importing actions.  	- For downloads or downloading actions. Use DownloadIcon instead. - For exports or exporting actions. Use DownloadIcon instead. - For actions associated with publishing. Use PublishIcon instead.
UserIcon	Person | Profile | Account	To represent an inidividual person	- To represent a person, role or profile	- To represent multiple users, a group, or a team. Use UsersIcon instead. - To add a user. Use AddUserIcon instead.
UsersIcon	People | Team | Group	To represent multiple people, or group, or a team	- To represent people, a group, or a team.	- To represent a single user. Use UserIcon instead. - To add a user. Use AddUserIcon instead.
VideoIcon		To represent a single video	- To represent a video - As a placeholder for an video before it's loaded	- To represent a video file. Use DocumentVideoIcon instead. - To represent playback. Use PlayIcon instead.
WarningOutlineIcon	Caution | Alert | Warning	To represent a general warning within the application.	- To represent issues that are neither critical nor blocking. - When an operation or process needs attention, but has not failed - To visually demarcate a warning message	- To represent issues that are either critical or blocking. Use ErrorOutlineIcon instead. - To represent issues related to user permissions. Use AccessDeniedIcon instead.
CheckmarkIcon	Check | Done | Confirmed	Success or selection	- To represent general positive outcomes - To indicate selection of an item - To indicate success of a flow or operation	- To represent tasks. Use TaskIcon instead. - As a interactive element for toggling an item. Use the Checkbox component instead.
DotIcon	Point | Bullet | Marker Small	Minimal status indicator	- To visually highlight an item as updated  - To mark an item with a minimal status indicator	- As a bullet for unordered lists. Use unicode characters instead. - To mark items with a warning or error status. Use WarningOutlineIcon or ErrorOutlineIcon respectively.
ActivityIcon	Feed | Timeline | EKG	Represents activity feeds, monitoring, or diagnostics.	- For activity logs or feeds.  - For performance or health checks.	- For general analytics or data visualization tools. Use BarChartIcon instead. - To represent usage or a general line chart. Use ChartUpwardIcon instead. - To represent a trend in data. Use TrendIcon instead.
AddDocumentIcon	New document	Adding or creating a document	- For adding a document to a group/collection/list  - For creating a new document as a secondary action	- When adding/creating a document is the primary action. Use AddIcon instead. - For general adding or creation. Use AddIcon instead.
ArchiveIcon	Box | Storage | Deprecated	Archiving or storing items for later reference	- For archival actions - For stashing changes	- For removal actions. Use RemoveIcon instead. - For delete actions. Use TrashIcon instead. - To represent adding to a collection. Use PackageIcon instead. - To represent download or export actions. Use DownloadIcon instead.
BarChartIcon	Chart | Statistics | Analytics	Analytics or general data visualization	- For general analytics or data visualization tools - Displaying data as a bar chart	- To represent activity or health metrics. Use ActivityIcon instead. - To represent trends in data. Use TrendUpwardIcon instead. - To represent usage or a general line chart. Use ChartUpwardIcon instead.
BillIcon	Invoice | Receipt | Payment	Financial information or invoices	- For billing information or invoice management. - To view payment history	- For general documents. Use DocumentIcon instead. - For documentation. Use BookIcon instead. - For payment actions. Use CreditCardIcon instead.
BoldIcon	Strong | Emphasis | Heavy	Bold text formatting	- For toggling text as bold within a text editing feature.	- Outside text editing. This icon is intended for formatting toolsets.
CalendarIcon	Date | Schedule | Event	Calendar or date selection	- To indicate date selection or scheduling. - To represent calendar views or features.	- For time or duration. Use ClockIcon instead. - To represent a collection of events. Use TimelineIcon instead.
ChartUpwardIcon	Growth | Trend | Increase	Product/feature usage or specific line chart data visualization	- To represent usage reports for a product or feature - Displaying data as a line chart	- For, general analytics, data visualization or charts. Use BarChartIcon instead. - To represent activity or health metrics. Use ActivityIcon instead. - To represent trends in data. Use TrendUpwardIcon instead.
CodeBlockIcon	Code Snippet | Pre | Programming Block	Multiline code blocks	- Code block formatting in rich text 	- To represent inline code. Use CodeIcon instead. - For general API references. Use PlugIcon instead. - To represent JSON. Use JsonIcon instead.
CodeIcon	Programming | Markup | Syntax	General indicator of code or Inline code snippets	- To indicate something as code - Inline code formatting in rich text 	- To represent multiline code blocks. Use CodeBlockIcon instead. - For general API references. Use PlugIcon instead. - To represent JSON. Use JsonIcon instead.
DashboardIcon	Overview | Home | Main	Dashboard pages/screens	- To represent pages/screens that act as a dashboard of information.	- To represent Sanity's home page. Use HomeIcon instead. - To represent a gallery of media. Use ImagesIcon instead.
DocumentIcon	File | Doc | Paper	To represent files or general documents	- As an indicator for a file or general document 	- To represent specific document types when an icon exists - For binary files, use BinaryDocumentIcon instead. - For PDF files, use DocumentPdfIcon instead. - For spreadsheets or tabular files like CSV of TSV, use DocumentSheetIcon instead. - For purely text-based files like .txt or Markdown use DocumentTextIcon instead. - For video files, use DocumentVideoIcon  instead. - For compressed files like Zip or .tar, use DocumentZipIcon instead.
DragHandleIcon	Grip | Reorder | Move	Reorder items in a group through drag and drop interactions	- Used exclusively for sortable lists or draggable items	- For non-draggable items.
EditIcon	Modify | Change | Update	Edit or modify actions	- For editing, modifying or updating content.	- For creating new general content. Use AddIcon instead. - For creating new written content. Use ComposeIcon instead.
EnvelopeIcon	Email | Mail | Message	Email or email communication	- Specifically for email-based communication/features	- For in-app chat. Use CommentIcon instead. - For general feedback. Use FeedbackIcon instead.
FolderIcon	Directory | Collection | Group	To represent folders or directories.	- For folder navigation or representing directory structures.  - For grouping items in the context of a file system.	- For individual files. Use DocumentIcon instead. - For representing packages or collections. Use PackageIcon instead.
HelpCircleIcon	Question | Help | Support	Help or support	- For help sections - For links to Support  - For any link/affordance in which the primary purpose is help	- For contextual information in UI. Use InfoOutlineIcon instead. - For documentation. Use BookIcon instead.
InfoOutlineIcon	Information | Details | About	To represent additional information or details	- For informational tooltips  - Indicators for details or additional information - To demarcate notifications that are for general information/context	- To represent help/support. Use HelpCircleIcon instead. - To represent documentation. Use BookIcon instead.
ItalicIcon	Emphasis | Slant | Italic Text	Italic text formatting	- For toggling text as italic within a text editing feature.	- Outside text editing. This icon is intended for formatting toolsets.
LeaveIcon	Exit | Logout | Sign Out	Leaving or exiting	- For logout or exiting actions	- For closing or dismissing views. Use CloseIcon instead. - For toggling sidebars or panels. Use PanelLeftIcon or PanelRightIcon instead.
MoonIcon	Dark Mode | Night | Theme	Dark mode setting	- For setting a color scheme to dark mode	- For light mode. Use SunIcon instead.
PinFilledIcon	Pinned 	To represent a pinned item	- To represent an item that has been pinned to a view	- To represent favorited or saved content. Use StarFIlledIcon instead.
PinIcon	Unpinned	To represent an item that can be pinned	- As an affordance for pinning an item to a view	- For representing an actively pinned item. Use PinFilledIcon instead. - For favoriting or saving content. Use StarIcon instead.
SelectIcon	Choose | Pick | Cursor	A visual affordance for select components	Exclusively within Select components to visually indicate the input has a menu.	- For dropdowns, menus or popovers. Use ChevronDownIcon instead. - To indicate sorting order. Use SortIcon instead. - To act as an afforance for reordering items in a list. Use DragHandeIcon instead.
ShareIcon	Export | Send | Distribute	Sharing or general social media	- For share action or general social media sharing	- For exporting actions. Use DownloadIcon instead. - For sharing on a specific social media platform. Use GithubIcon, LinkedInIcon, or TwitterIcon instead.
SpinnerIcon	Loading | Processing | Wait	To represent an active and indeterminate loading or processing states	- For active and indeterminate loading indicators or processing states.	- When progress is known. Use a progress bar for determinate loading instead. - To represent an action related to beginning a loading or processing activity.  - To repesent syncing. Use SyncIcon instead. - To represent a reload/refresh process. Use RefreshIcon instead.
TranslateIcon	Language | Localization | Interpret	Translation or language features	- For representing translation or localization features. - For language settings/switching.	- For representing global or international concepts. Use EarthGlobeIcon instead.
UnarchiveIcon	Box	Moving items out of an archived/stashed state	- For restoring items from an archive	- To represent removing from a collection. Use RemoveIcon instead. - To represent upload or import actions. Use UploadIcon instead.
UnderlineIcon	Underlined | Emphasis | U	Underline text formatting	For toggling text as underlined within a text editing feature.	- Outside text editing. This icon is intended for formatting toolsets.
UnknownIcon	Question | Mystery | Undefined	An unknown/undefined thing or state	- For unknown types or undefined states  - As a fallback icon for contents that are unspecified	- To represent help or support. Use HelpCircleIcon instead - To represent something that is empty or unused. Use EmptyIcon instead.
BinaryDocumentIcon	Code File | Binary | Data File	To represent binary or executable files	- As an indicator for a binary file or executable	- For general documents or files. Use DocumentIcon instead.
ComposeIcon	Edit | Write | Create Content	Creating new written content	- For creating new written content or documents. 	- For AI-powered creation of new written content. Use ComposeSparklesIcon instead. - For editing existing written content. Use EditIcon instead. - For creating new general content. Use AddIcon instead.
ComposeSparklesIcon	AI compose	AI-powered creation of new written content	- For creating new written content or documents with AI assistance. 	- To represent an AI-powered feature. Use SparklesIcon instead. - To represent Sanity's Content Agent feature. Use SparkleIcon instead. - For manual creation of new written content. Use ComposeIcon instead.
DocumentRemoveIcon	Delete Document | Remove File | Discard	Removing or deleting a document	- For document removal or deletion 	- For general removal. Use RemoveIcon instead.
DocumentSheetIcon	Spreadsheet | Table | Grid	Spreadsheet or tabular documents	- As an indicator for spreadsheet or tabular-data files, such as Excel, CSV, or TSV	- For general documents or files. Use DocumentIcon instead. - For representing tabular data. Use ThListIcon instead.
DocumentTextIcon	Text File | Article | Written	Text-based documents	- As an indicator for text-based files, such as .txt, .rtf, or Markdown 	- Don't use for rich text. Use BlockContentIcon instead.
DocumentWordIcon	Word Document | DOC | Text Processing	Word processor documents	- As an indicator for .doc, .docx, or other Word processor file formats	- For general documents or files. Use DocumentIcon instead. - To represent a general text-based document. Use DocumentTextIcon instead.
DocumentZipIcon	Archive | Compressed | Package	Compressed or archived files	- As an indicator for .zip, .tar, /.gzip or other compression file formats 	- For general archives or archiving data. Use ArchiveIcon instead.
OverageIcon	Excess | Limit | Quota	Overage or exceeding limits	- For quota warnings, exceeded limit indicators, or overage alerts	- For general warnings Use WarningOutlineIcon instead. - To represent usage or a general line chart. Use ChartUpwardIcon instead. - To represent activity or health metrics. Use ActivityIcon instead. - To represent trends in data. Use TrendUpwardIcon instead.
PackageIcon	Bundle | Module | Dependency	Packages, or bundles, or collections	- To represent package management, bundles, or collections of data.	- For shipping general groups of documents. Use DocumentsIcon instead. - For directories/folders of files. Use FolderIcon instead.
ReadOnlyIcon	View Only | Locked | No Edit	Read-only or view-only state	- For read-only fields or to reinforce when content is not editable. - To represent a view-only mode. 	- For locked content. Use LockIcon instead. - For content a user is not allowed to access. Use AccessDeniedIcon instead.
RedoIcon	Repeat | Forward | Reapply	Redo or reapply actions	- For redo operations 	- For retrying an operation. Use RetryIcon instead. - For going foward in history. Use ArrowRight instead. - For refreshing content. Use RefreshIcon instead.
RefreshIcon	Reload | Sync | Update	Refresh or reload actions	- For reloading or refreshing content - To mimic the browser's reload action	- To represent syncing data or as an action to sync data. Use SyncIcon instead. - To retry a process or operation. Use RetryIcon instead. - To redo or reapply an action. Use RedoIcon instead.
StrikethroughIcon	Crossed | Deleted Text | Strike	Strikethrough text formatting	- For toggling text as striked within a text editing feature.	- Outside text editing. This icon is intended for formatting toolsets.
SunIcon	Light Mode | Day | Bright	Light mode setting	- For setting a color scheme to light mode	- For dark mode. Use MoonIcon instead.
SyncIcon	Synchronize | Refresh | Update	Synchronization or bi-directional sync	- For bi-directional syncing of content/information. 	- For general refreshing of information. Use RefreshIcon instead. - For transferring information from one location to another. Use TransferIcon instead. - To represent loading content. Use SpinnerIcon instead.
UndoIcon	Revert | Back | Cancel	To undo the last user action 	- For undo operations 	- For reverting changes. Use RevertIcon instead. - For going backward in history. Use ArrowLeft instead.
DocumentPdfIcon	PDF | Portable Document | PDF File	To specifically represent PDF documents	- As an indicator for a PDF document	- For general documents or files. Use DocumentIcon instead. - To represent text-based documents. Use DocumentTextIcon instead.
DocumentVideoIcon	Video File | Movie | Recording	Video files	- As an indicator for a video file	- For representing video playback or video in the interface. Use VideoIcon instead.
ToggleArrowRightIcon	Switch Right | Navigate Toggle | Expand	A visual affordance for expanding/collapsing items within a hierarchical tree view.	- For expanding/collapsing items within a hierarchical tree view.	- To expand or collapse content within an accordion view. Use ChevronUpIcon and ChevronDownIcon instead. - For playing media or starting a process. Use PlayIcon instead. - For navigating forward to a new page or drilling in through nested content in a column view. Use ChevronRightIcon instead.
BugIcon	Issue	Code debugging	- To indicate a debugging action, mode, or process.	- To represent user-facing errors. Use ErrorOutlineIcon instead.
ControlsIcon	Adjustments | Sliders | Tuning	Configuration or advanced controls	- To represent a configuration action or mode - To represent advanced controls/actions (ex: Advanced search)	- To represent general settings. Use CogIcon instead. - To represent configuring content filters. Use FilterIcon instead.
NumberIcon	Hash | Numeric | Count	Numeric data or Number type	- To indicate that a numeric data or a Number type value	- To represent underlined text style. Use UnderlineIcon instead.
StringIcon	Text | Characters | ABC	Text data or String type	- To reference or indicate text data or a String type value	- To represent a link. Use LinkIcon instead. - To represent underlined text style. Use UnderlineIcon instead. - To indicate general text. Use TextIcon instead.
ColorWheelIcon	Color Picker | Palette | Hue	Color collections, palettes, or themes	- To reference or represent a color theme or collection of colors.	- For targeting an individual color or coloring an individual element. Use DropIcon instead.
DropIcon	Liquid | Water | Fluid	Individual coloring of an element	- To reference or represent the color of an individual element	- For targeting a color theme or creating a color palette. Use ColorWheelIcon instead.
CubeIcon	3D | Box | Object	Generic data/metadata	- To represent an individual and general piece of data or metadata. - As a fallback icon for data types that are too abstract to be represented with a more specific icon.	- To represent a collection of data or items. Use PackageIcon instead. - To represent unknown or unidentified data. Use UnknownIcon instead.
DatabaseIcon	Storage | Data | Server	Database or data storage	- To represent general databases or database features - Data management or storage settings	- For GROQ-specific features or queries. Use GroqIcon instead. - To represent a collection of data or items. Use PackageIcon instead. - To represent an individual and general piece of data or metadata. Use CubeIcon instead.
MobileDeviceIcon	Phone | Smartphone | Mobile	Mobile device or phone	- To represent a mobile device when choosing between different device types - To represent general touch-based devices	- To represent tablets. Use TabletDeviceIcon instead.
PlugIcon	Plugin | Extension | Connection	Represents API endpoints or integrations	- Referencing API integrations, features, or endpoints	- For general code references. Use CodeIcon or CodeBlockIcon instead. - For code inspection. Use JsonIcon instead.
PublishIcon	Release | Deploy | Go Live	Publishing or releasing	- For publishing, deploying or releasing content.	- For unpublishing content. Use UnpublishIcon instead. - For uploading content. Use UploadIcon instead. - For collapsing content vertically. Use ChevronUpIcon instead.
UnpublishIcon	Retract | Take Down | Draft	Unpublishing or reverting content to a draft	- For unpblishing or taking content offline	- For publishing content. Use PublishIcon instead. - For downloading content. Use DownloadIcon instead. - For expanding content vertically. Use ChevronDownIcon instead.
TaskIcon	Todo | Checklist | Assignment	For inidicating one or more tasks with a deadline	- To represent tasks with a explicitly defined deadline.	- As a general representation for tasks. Use CheckmarkCircleIcon instead.
TabletDeviceIcon	Tablet | iPad | Device	Tablet device	- To represent a tablet device when choosing between different device types	- To represent general touch-based devices. Use MobileDeviceIcon instead.
TerminalIcon	Console | Command Line | Shell	Command line tools and output	- For CLI features/tools or console access	- For general code or code editing. Use CodeIcon instead.
TimelineIcon	Gantt chart	A sequence or timeline of events	- To represent a sequence or timeline of events 	- To represent tasks. Use TaskIcon instead. - To represent general dates. Use CalendarIcon instead.
TrendUpwardIcon	Growth | Increase | Rising	Trends in data 	- For representing trending indicators in data. 	- To represent a general data visualization or a line chart. Use BarChartIcon instead. - To represent usage or a general line chart. Use ChartUpwardIcon instead. - To represent usage overages. Use OverageIcon instead. - To represent activity or health metrics. Use ActivityIcon instead.
ChevronLeftIcon	Collapse Left | Previous	Moving, resizing, transitioning, or revealing/concealing an element in a leftward direction.	- Drilling out through a column based heirarchical view - Moving backward in a carousel view	- Expanding/collapsing sidebars. Use PanelLeftIcon or PanelRightIcon instead - Moving/resizing/revealing a group of elements. Use DoubleChevronLeftIcon instead. - Navigating backward to a previous surface. Use ArrowLeftIcon instead.	- Consider RTL languages when using chevrons.
ChevronRightIcon	Expand Right | Next	Moving, resizing, transitioning, or revealing/concealing an element in a rightward direction.	- Drilling out through a column based heirarchical view - Moving forward in a carousel view	- Expanding/collapsing sidebars. Use PanelLeftIcon or PanelRightIcon instead - Moving/resizing/revealing a group of elements. Use DoubleChevronRightIcon instead. - Navigating to a new surface. Use ArrowRightIcon instead.	- Consider RTL languages when using chevrons.
ChevronDownIcon	Expand | Dropdown | More	Moving, resizing, transitioning, or revealing/concealing an element in a downward direction.	- As a general affordance for expanding content for an element when direction is not explicitly known (example: a menu button) - For expanding an elements's content in a top-to-bottom direction (example: accordions) - For collapsing an element in a bottom-to-top direction (example: a fixed footer) 	- As the trailing affordance for Select inputs. Use SelectIcon instead. - Moving/resizing/revealing a group of elements. Use DoubleChevronDownIcon instead. - To represent downloads or the download action. Use DownloadIcon instead. - As an affordance to scroll down to an element. Use ArrowDownIcon instead.
ChevronUpIcon	Collapse | Hide | Less	Moving, resizing, transitioning, or revealing/concealing an element in an upward direction.	- As a general affordance for concealing additional content when direction is not explicitly known (example: a menu button) - For collapsing an element's content in a top-to-bottom direction (example: accordions) - For expanding an element in a bottom-to-top direction (example: a fixed footer) 	- Moving/resizing/revealing a group of elements. Use DoubleChevronUpcon instead. - For concealing a popover menu. Use Close instead. - To represent uploads or the upload action. Use UploadIcon instead. instead. - As an affordance to scroll up to an element or back to top. Use ArrowUpIcon instead.
ArrowLeftIcon	Left | Back | Previous	Backward navigation across surfaces.	- Navigating back to a previous page - Paginating backward/previous	- To move, resize or reveal elements within a page. Use ChevronLeftIcon instead.
ArrowRightIcon	Right | Forward | Next	Forward navigation across surfaces.	- Navigating forward to a new page - Paginating forward/next 	- To move, resize or reveal elements within a page. Use ChevronRightIcon instead.
ArrowDownIcon	Down | Descend | Download Direction	Downward screen-level movement/scrolling.	- Moving/scrolling down within a page	- As an indicator for downloads. Use DownloadIcon for viewing instead. - To represent unpublish actions. Use UnpublishIcon instead. - To move, transition or resize elements within a page. Use ChevonDownIcon instead.
ArrowUpIcon	Up | Ascend | Upload Direction	Upward screen-level movement/scrolling.	- Moving/scrolling up within a page - Scrolling back to the top of a page	- To represent uploads. Use UploadIcon instead. - To represent publish actions. Use PublishIcon instead. - To move, transition or resize elements within a page. Use ChevonUpIcon instead. - To represent opening a new window or tab. Use LaunchIcon instead.
DoubleChevronLeftIcon	Fast Left | Jump Previous | Rewind	Moving, resizing, transitioning, or revealing/concealing a group of elements in a leftward direction.	- For expanding a group of elements' content in a right-to-left direction (example: a leading floating panel)	- For moving, resizing, or expanding/collapsing a single element. Use ChevronLeftcon instead. - To navigate back to a previous page. Use ArrowLeftIcon instead.
DoubleChevronRightIcon	Fast Right | Jump Next | Fast Forward	Moving, resizing, transitioning, or revealing/concealing a group of elements in a rightward direction.	- For expanding a group of elements' content in a left-to-right direction (example: a trailing floating panel)	- For moving, resizing, or expanding/collapsing a single element. Use ChevronRightcon instead. - To navigate foward to a new page. Use ArrowRightIcon instead.
DoubleChevronDownIcon	Fast Down | Jump Down | Scroll Bottom	Moving, resizing, transitioning, or revealing/concealing a group of elements in a downward direction.	- As a general affordance for expanding content for a group of elements when direction is not explicitly known - For expanding a group of elements' content in a top-to-bottom direction (example: all accordion sections) - For collapsing a group of elements' content in a bottom-to-top direction 	- For moving, resizing, or expanding/collapsing a single element. Use ChevronDownIcon instead. - To scroll down within a page. Use ArrowDownIcon instead.
DoubleChevronUpIcon	Fast Up | Jump Up | Scroll Top	Moving, resizing, transitioning, or revealing/concealing a group of elements in an upward direction.	- For collapsing a group of elements' content in a top-to-bottom direction (example: all accordion sections) - For expanding a group of elements' content in a bottom-to-top direction	- For moving, resizing, or expanding/collapsing a single element. Use ChevronUpIcon instead. - To scroll up within a page. Use ArrowUpIcon instead.
ArrowTopRightIcon	External | Open New | Diagonal Up Right	To outside a link outside of the current application context	- To open a link to another Studio or application - To open content from the existing Studio/application in a new tab/window or preview	- To represent opening an external link in a new window or tab. Use LaunchIcon instead.
LaunchIcon	Open | External | Start	To indicate a link external from Sanity 	- To indicate an external link 	- For internal navigation with the current Studio or application. Use ArrowRightIcon instead. - For navigation to a different Studio or application. Use ArrowTopRightIcon instead.
BulbOutlineIcon	Idea | Light | Suggestion	Product tips and suggestions	- To represent product tips/suggestions for user onboarding or revealing new features	- For deeper learning or to represent documentation. Use BookIcon instead.
TextIcon	Typography | Font | Letters	Representation of general text content	- As an indicator for setting font size or family.  - To represent general text content.	- To represent text data or a String type value. Use StringIcon instead.
BlockContentIcon	Content Block | Rich Text | Structured Content	Block-based content or structured text	- To represent a block of text, like a paragraph. - To indicate rich text formatting.	- As a prompt for editing or composing content. Use EditIcon or ComposeIcon respectively.
BlockquoteIcon	Quote | Citation | Excerpt	Blockquote text formatting	- For toggling text as a blockquote within a text editing feature.	- Outside text editing. This icon is intended for formatting toolsets. - To represent a general text block. Use BlockContentIcon instead.
BookIcon	Documentation | Manual | Guide	Represent documentation or reading material	- To represent reading material–most notably documentation or learning guides.	- For product tips or suggestions. Use BulbOutlineIcon instead. - To represent help or support. Use HelpCircleIcon instead.
EarthAmericasIcon	Globe Americas | World | International	Representation of geo-region or time zones	- Representing geo-region (example: Asia, Europe, etc.) or time zones. 	- Represending specific geo-location. Use MarkerIcon instead. - Representing public content. Use EarthGlobeIcon instead.
EarthGlobeIcon	World | Global | International	To represent global concepts or public features	- To represent public content 	- To select a geo-region or timezone. Use EarthAmericasIcon instread.  - To represent language. Use TranslateIcon instead.
GroqIcon	Query | GROQ | Sanity Query	Sanity's GROQ query language	- For GROQ queries or query builders - To represent Sanity-specific query features	- Don't use outside Sanity context. For general representation of data queries, use DatabaseIcon instead.
InsertAboveIcon	Add Above | Insert Before | Up	Inserting content above an element in a vertical list	- For adding content above current position - For adding a preceding row in a table	- For adding of content where position does not matter. Use AddIcon instead.
InsertBelowIcon	Add Below | Insert After | Down	Inserting content below an element in a vertical list	- For adding content below current position - For adding a proceding row in a table	- For adding of content where position does not matter. Use AddIcon instead.
LinkRemovedIcon	Broken Link | Disconnected | Unlinked	To represent removing a link or a connection	- As an action to remove a link or disconnect two items	- To represent a broken/missing link or disconnected state. Use UnlinkIcon instead.
RocketIcon	Launch | Fast | Performance	Launch or high performance	- As an indicator for premium features–typically within the context of an upsell	- To represent performance health metrics. Use ActivityIcon instead. - To represent business metrics or performance. Use TrendIcon insead.
SplitHorizontalIcon	Divide Horizontal | Split Panes Horizontal | Layout	Horizontal split layout	- As an action to horizontally split a layout.	- For vertical UI splits. Use SplitVerticalIcon instead. - For displaying a sidebar/panel. Use PanelLeftIcon or PanelRightIcon
SplitVerticalIcon	Divide Vertical | Split Panes Vertical | Layout	Vertical split layout	- As an action to vertically split a layout.	- For horizontal UI splits. Use SplitVerticalIcon instead. - For displaying a sidebar/panel. Use PanelLeftIcon or PanelRightIcon
TransferIcon	Move | Exchange | Swap	Transfer or swapping of items or data	- For transferring items or data to different locations. 	- For bi-directional syncing of content/information. Use SyncIcon instead. - To represent general direction or movement. Use arrow icons instead.
UnlinkIcon	Broken Link | Disconnected | Unlinked	Broken/missing links or disconnected items	- To represent a broken or missing web link. - To represent a disconnected state between two previously connected items	- To represent the action of removing a link or disconnecting two items. Use LinkRemovedIcon instead.
ThumbsUpIcon	Like	Providing a positive vote on yes/no questions.	- To represent a positive vote on a yes/no question.	- For any purpose other than a positive vote on a yes/no question. - To favorite/save content. Use StarIcon instead.
ThumbsDownIcon	Unlike | Dislike	Providing a negative vote on yes/no questions.	- To represent a negative vote on a yes/no question.	- For any purpose other than a negative vote on a yes/no question.
BlockElementIcon	Block | Container | Box	Block layout elements	- To represent content that is displayed as a block element (taking the full width of its parent and starting a new line). 	- To represent the size or aspect ratio of an element. - For spliting a layout vertically. Use SplitVeticalIcon instead.
InlineElementIcon	Inline | Span | Text Element	Inline layout elements	- To represent content that is displayed as an inline element (taking up as much width as necessary for its content and flows within the current line without forcing a line break). 	- To represent the size or aspect ratio of an element. - For spliting a layout horizontally. Use SplitHoritonztalIcon instead.
BellIcon	Notification | Alert | Ring	Viewing, recieving, or managing notifications/alerts	- For notifications, alerts, or reminders.	- For reminders related to a task. Use TaskIcon instead.
ClockIcon	Time | History	To represent time or duration.	- To indicate a time or duration based value - To represent a timestamp 	- To represent specific dates. Use CalendarIcon instead. - To view the history or activity log of an item. Use RestoreIcon instead. - To represent time-zones. Use EarthAmericasIcon instead.
ResetIcon	Restart | Clear | Default	To reset an item to its original state or defaults	- For resetting or clearing all saved values for an item. - For restoring an item to its original state.	- For undo a single action. Use UndoIcon instead. - To represent the history or activity log for an item. Use RestoreIcon instead. - To represent an error in history. Use ErrorOutlineIcon instead.
RestoreIcon	Recover | Unarchive | Bring Back | Roll Back	To restore an item to a previous version	- To view the history or activity log of an item  - To see previous/recent actions 	- To represent time or duration. Use ClockIcon instead. - For undo a single action. Use UndoIcon instead. - To indicate explicit versions. Use VersionsIcon instead. - To reset to the original state. Use ResetIcon instead.
CropIcon	Trim | Cut Image | Adjust	Image cropping or trimming	- To represent image cropping or cropping tools	- For image resizing - For broader image or video editing features. Use ControlsIcon instead.
DesktopIcon	Monitor | Screen	To represent desktop devices or a person's local computer settings	- To represent a desktop when choosing between different device types - To represent a a computer's system settings (example: system-level light/dark mode preference)	- As an indicator for responsiveness. Use MobileDeviceIcon instead.
RemoveIcon	Minus | Delete | Subtract	Non-permanenet removal or subtraction of content/data	- For removing items from a list, collection or view.	- For permanent delection of content/data. Use TrashIcon instead.
SchemaIcon	Structure | Model | Definition	Schema, data structure or heirarchical content	- For schema editors or data models - To represent general heirarchical structure of content	- For general representation of data queries. Use DatabaseIcon instead. - For GROQ-specific features or queries. Use GroqIcon instead.
TrashIcon	Delete | Remove | Discard	Permanenet deletion of content/data	- For permanent deletion/removal actions.	- For archiving of content. Use ArchiveIcon instead. - For any form of non-destructive deletion. Use RemoveIcon instread.
TokenIcon	Key | Authentication | API Key	To represent AI tokens	- Exclusively to represent AI token counts	- To represent API or access tokens. Use PlugIcon instead.
BasketIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
BoltIcon	Lightning | Fast | Energy	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
ComponentIcon	Module | Part | Building Block	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
AsteriskIcon	Star Symbol | Required | Wildcard	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
ApiIcon	Code Interface | Integration	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
BookmarkFilledIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
BookmarkIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
BottleIcon	Container | Liquid | Product	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
BoxIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
CaseIcon	Briefcase | Portfolio | Business	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
CreditCardIcon	Payment | Card | Transaction	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
EnterIcon	Return | Submit | Go	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
EnterRightIcon	Enter Direction | Go Right | Navigate In	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
ErrorScreenIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
FaceHappyIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
FaceIndifferentIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
FaceSadIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
GithubIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
HeartFilledIcon	Favorite | Like | Love	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
HeartIcon	Favorite | Like | Love	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
IceCreamIcon	Treat | Dessert | Sweet	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
JoystickIcon	Game | Controller | Gaming	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
LemonIcon	Citrus | Fresh | Fruit	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
LinkedinIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
ListIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
LogoJsIcon	JavaScript | JS | ECMAScript	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
LogoTsIcon	TypeScript | TS | Type Script	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
MarkerIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
MarkerRemovedIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
MicrophoneIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
MicrophoneSlashIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
OkHandIcon	Okay | Approved | Good	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
PresentationIcon	Slideshow | Present | Display	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
Progress50Icon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
Progress75Icon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
RobotIcon	Bot | Automation	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
SquareIcon	Box | Rectangle | Shape	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
TargetIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
TiersIcon	Levels | Hierarchy | Pricing	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
TriangleOutlineIcon	Triangle | Shape | Pointer	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
TrolleyIcon	Cart | Shopping | E-Commerce	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
TruncateIcon	Cut | Shorten | Ellipsis	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
TwitterIcon	Social | X | Tweet	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
WrenchIcon	Tool | Maintenance | Fix	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
VersionsIcon		DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
GenerateIcon	AI | Create | Automatic	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
InlineIcon	Inline Text | Continuous | Flow	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
ConfettiIcon	Celebration | Party | Success	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
DiamondIcon	Gem | Premium | Value	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
HashIcon	Hashtag | Tag | Number	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.
HighlightIcon	Mark | Emphasis | Note	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.	DECORATIVE. USE WITH DISCRETION. ONLY USE IF ANOTHER ICON DOES NOT FIT THE NEED.

