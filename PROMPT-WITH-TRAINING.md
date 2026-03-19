Create a simple interface that mimics Sanity Studio using Sanity UI.  

# Instructions
* Use the latest version of Sanity Icons and Sanity UI v3.1.14 for the interface. 
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
                <Heading as="h2" size={1}>Studio</Heading>
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
              <Heading as="h1" size={2} style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>All Documents</Heading>
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
                      <Heading as="h2" size={1}>{title}</Heading>
                      <Text size={1} muted>Last edited 2 hours ago</Text>
                    </Stack>
                    <Badge tone="positive" text="Published" />
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

Stack adds even spacing between children. Use `space` to set the gap.

```tsx
<Stack space={3}>
  <Heading as="h2" size={1}>Title</Heading>
  <Text size={1}>Description</Text>
</Stack>
```

### Flex lays children out in a row

Flex defaults to horizontal direction. Use `align`, `justify`, `gap`, and `wrap` to control the layout. Add `wrap="wrap"` to any row that might overflow at narrow widths.

```tsx
<Flex align="center" justify="space-between" wrap="wrap" gap={2}>
  <Heading as="h1" size={2}>Page Title</Heading>
  <Button text="Action" />
</Flex>
```

### Heading needs an `as` prop

The Heading component renders a `<div>` by default. That has no heading role. Always set `as` to `h1`–`h6`. Use `size` for visual sizing.

```tsx
{/* ✗ No heading role — screen readers skip it */}
<Heading size={2}>Title</Heading>

{/* ✓ Renders as <h1> with heading role */}
<Heading as="h1" size={2}>Title</Heading>
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

For guidelines on building or documenting Sanity UI components themselves, see `component-authoring-accessibility.md`.

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

### Every page needs at least one heading

Headings give screen reader users an outline of the page. A page with zero headings forces users to read every element in sequence. Use `<Heading as="h1">` for the page title and `<Heading as="h2">` for each major section.

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

```jsx
/* ✗ Skips h2 — breaks the heading outline */
<Heading as="h1" size={3}>All Documents</Heading>
<Heading as="h3" size={1}>Getting Started</Heading>

/* ✓ No levels skipped — use size for visual sizing */
<Heading as="h1" size={3}>All Documents</Heading>
<Heading as="h2" size={1}>Getting Started</Heading>
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

The default Sanity UI theme produces white text (`#fff`) on a blue background (`#556bfc`) for `tone="primary"` buttons in default mode. The contrast ratio is 4.29:1 — below the 4.5:1 AA threshold. Automated tests flag this every time.

The fix: **use `tone="default"`** for primary actions. If you need a blue button, use `mode="ghost"` with `tone="primary"` — this renders dark text on a light blue tint and passes AA.

```jsx
/* ✗ Fails contrast — 4.29:1 */
<Button tone="primary" text="New document" />

/* ✓ Passes contrast */
<Button tone="default" text="New document" />

/* ✓ Also passes — ghost mode with primary tone */
<Button tone="primary" mode="ghost" text="New document" />
```

### Pair semantic color with a non-color indicator

Color must not be the only way to convey meaning. Every use of `tone="positive"`, `tone="caution"`, or `tone="critical"` must include an icon, a text label, or both (WCAG 1.4.1 A).

```jsx
/* ✗ Color alone — users with color vision differences miss the meaning */
<Button tone="critical" text="Delete" />

/* ✓ Icon reinforces the meaning */
<Button tone="critical" text="Delete" icon={TrashIcon} />
```

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

### Do not use bare native checkboxes or radios

Browser-default `<input type="checkbox">` and `<input type="radio">` render at about 13×13px. Use the Sanity UI `Checkbox`, `Radio`, or `Switch` components instead — they render at compliant sizes.

If you must use a native input, wrap it in a `<label>` with enough padding to reach 24×24px, or set `width` and `height` via CSS.

---

## 7. Responsive layout — 320px reflow

Layouts must work at 320px viewport width with no horizontal scrolling (WCAG 1.4.10 AA). This simulates 400% zoom on a 1280px screen.

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

### Toolbar rows must wrap

Any horizontal `Flex` that holds a heading, buttons, or other inline content must use `wrap="wrap"`. A heading + button toolbar is the second most common overflow source.

```jsx
/* ✗ Heading + button exceed 320px in one line */
<Flex align="center" justify="space-between">
  <Heading as="h1" size={2}>All Documents</Heading>
  <Button text="New document" icon={AddIcon} />
</Flex>

/* ✓ Button wraps to next line at narrow widths */
<Flex align="center" justify="space-between" wrap="wrap" gap={2}>
  <Heading as="h1" size={2}>All Documents</Heading>
  <Button text="New document" icon={AddIcon} />
</Flex>
```

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

### `tone="primary"` contrast in default mode

White text on `tone="primary"` default-mode buttons produces a 4.29:1 ratio. This is below the 4.5:1 AA threshold. Use `tone="default"` or `mode="ghost"` with `tone="primary"` instead. See §4 above.

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
      {/* page content */}
    </Card>
  </Flex>
</ThemeProvider>
```

**What this gives you:**

| Feature | How |
| --- | --- |
| Landmarks | `Card as="nav"` and `Card as="main"` |
| Heading hierarchy | `<h1>` for the page title, `<h2>` for sections |
| Page language | Set `<html lang="en">` in `index.html` |
| Responsive reflow | `wrap="wrap"` + flex sizing (no fixed widths) |
| Toolbar wrap | `wrap="wrap"` on toolbar Flex |
| Contrast | `tone="default"` instead of `tone="primary"` |
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

### buildTheme

The `buildTheme` function from `@sanity/ui/theme` produces the default Sanity UI theme. Call it with no arguments to get the standard configuration. This is the starting point for all custom themes.

```jsx
import {buildTheme} from '@sanity/ui/theme'

// Default theme — no options needed
const theme = buildTheme()
```

The returned object contains color definitions for every tone, scheme, and state, plus typography scales, spacing values, and shadow definitions.

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

- The root scheme is set on `ThemeProvider`.
- Any `Card` can override the scheme for its subtree using the `scheme` prop. This is how a dark panel appears inside a light interface.
- Every color token stores two values internally: one for light, one for dark. The active scheme picks the right one.

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
| `"primary"` | Blue | Brand or informational emphasis |
| `"suggest"` | Purple | Suggestions or AI-related content |
| `"positive"` | Green | Success, completion, health |
| `"caution"` | Yellow | Attention needed, non-blocking warning |
| `"critical"` | Red | Error, failure, destructive action |

Not every component supports every tone. Check the component doc for its accepted values. The visual treatment of a tone (hue, saturation, contrast) varies by component. A `"critical"` Button is a solid red fill. A `"critical"` Card is a light red tint. The meaning is the same. The intensity differs.

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
| 5 | 28px | Generous padding (onboarding cards) |
| 6 | 36px | Large padding (rarely needed) |
| 7 | 48px | Extra-large (rarely needed) |
| 8 | 64px | Page-level spacing |
| 9 | 80px | Largest step (rarely needed) |

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
| Set up theming | Wrap in `ThemeProvider` with `buildTheme()` |
| Apply semantic color | Set `tone` on Card, Button, Badge, or other component |
| Switch to dark mode | Set `scheme="dark"` on a Card or at the root |
| De-emphasize content | Use the `muted` prop on Text or Card |
| Style a custom component | Use `--card-*` CSS custom properties |
| Override Studio colors | Use `buildLegacyTheme()` in `sanity.config.ts` |
| Reference raw palette | Import hues from `@sanity/color` (last resort) |

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



Used as the lowest-level building block for containing UI elements.

### **API documentation**

_Refer to TypeDocs in Box.tsx_

### **Usage guidelines**

**When to use:**

- As a container for child elements
- To  apply padding or margin to a group of elements
- To create basic visual styling (such as background, border, shadow, etc.) for the purposes of composing a custom component

**When not to use:**

- As an interactive element
- As a way to lay out child elements. Use Flex or Stack or Whatever instead.
- To act as a container for content that would otherwise be reserved for Card.
- To center content at a max width. Use **Container** instead — it sets `max-width` and centers itself.

**Choosing between Box, Card, and Container:**

| Component | Purpose | Adds visual styling | Use case |
| --- | --- | --- | --- |
| Box | Spacing and structure | No (transparent by default) | Wrapping elements with padding or margin |
| Card | Content surface | Yes (background, border, shadow, tone) | Grouping related content on a distinct surface |
| Container | Centered column | No | Constraining content width and centering it |

### **Best practices**

**Do**

- Use padding over margin when possible to avoid spacing issues related to margin collapse

**Don't**

- Avoid adding margin/padding to individual elements like Buttons or Text to set placement.  Instead, wrap elements in Box with margin/padding.
- Don't add onClick to Box

### **Variants**

#### Padding

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

### Content

- **Box does not set text styles.** Box provides spacing and structure. It does not set font size, line height, weight, or color. Use Text, Heading, or Label for text styling.
- **Casing (P8).** All text inside Box must use sentence case. The child components (Text, Heading, Button) own the styling. Box does not override it.

# Flex

Used as the lowest-level building block for laying out UI elements.

### **API documentation**

_Refer to TypeDocs in Flex.tsx_

### **Usage guidelines**

**When to use:**

- To lay items out in a row. Flex defaults to horizontal direction.
- To control alignment: center children, space them apart, or push one to the end.
- To lay items in a column with alignment or wrap control. Use `direction="column"` when you need more control than Stack provides.
- To create responsive layouts that change direction at breakpoints: `direction={['column', , 'row']}`.

**When not to use:**

- To stack items in a simple vertical column with even spacing. Use **Stack** instead — it is simpler and locks direction to vertical.
- To create a two-axis grid. Use **Grid** instead.
- To wrap a single child with spacing or visual styling. Use **Box** instead.
- To flow inline items that wrap to the next line. Use **Inline** instead.

**Choosing a layout primitive:**

| Component | Direction | Key props | Use case |
| --- | --- | --- | --- |
| Flex | Any (default: row) | `direction`, `align`, `justify`, `wrap`, `gap` | Rows, columns with alignment, responsive direction changes |
| Stack | Vertical only | `gap` | Simple vertical column with even spacing |
| Grid | Two-axis | `columns`, `rows`, `gap` | Grid-based layouts |
| Inline | Horizontal | `space` | Tags, chips, inline groups that wrap |
| Box | None (block) | `padding` | General container for spacing and visual styling |

### **Best practices**

**Do**

- 

**Don't**

-

### Accessibility

- **Layout only.** Flex provides layout along an axis. It does not add keyboard handling, focus management, or ARIA state. If you render Flex as a semantic element via `as`, you are responsible for the behavior that element requires.
- **Semantic elements via `as`.** Flex accepts an `as` prop. Use it to render semantic HTML when the content requires it:
  - `as="nav"` — requires `aria-label` when more than one `<nav>` exists on the page (WCAG 1.3.1 A).
  - `as="section"` — requires a heading child or `aria-label` to register as a landmark (WCAG 1.3.1 A).
  - `as="form"` — requires an accessible name via `aria-label`, `aria-labelledby`, or `<legend>` (WCAG 1.3.1 A).
  - `as="main"` — should appear once per page.
  - `as="aside"` — should have `aria-label` when the role is not clear from context.
- **Behavioral elements.** Do not use `as` to render `<button>`, `<dialog>`, `<select>`, `<details>`, `<summary>`, or `<fieldset>`. Flex does not fulfil the keyboard, focus, or ARIA contracts those elements require (WCAG 4.1.2 A). Use the matching Sanity UI component instead.
- **Lists.** When rendering `as="ul"` or `as="ol"`, add `role="list"` if `list-style: none` is applied. WebKit strips list semantics without it (WCAG 1.3.1 A). Children must be `<li>` elements.
- **Visual-to-DOM order.** Do not use `flex-direction: row-reverse` or `flex-direction: column-reverse` when children contain interactive or readable content. Do not use CSS `order` on Flex children. Screen readers and keyboard navigation follow DOM order, not visual order (WCAG 1.3.2 A, WCAG 2.4.3 A). If visual reordering cannot be avoided, confirm the DOM order produces a logical reading sequence.
- **Reflow at 320px.** Layouts built with Flex must work at 320px viewport width without horizontal scrolling (WCAG 1.4.10 AA). Use `wrap="wrap"` for content that should flow to the next line. Avoid fixed `px` widths on Flex children — use percentage-based or `flex-grow` sizing. Flex spacing tokens use `rem` and scale with user font-size settings (WCAG 1.4.12 AA).

### Content

- **Flex does not set text styles.** Flex provides layout along an axis. It does not set font size, line height, weight, or color. Use Text, Heading, or Label for text styling.
- **Casing (P8).** All text inside Flex must use sentence case. The child components (Text, Heading, Button) own the styling. Flex does not override it.

# Stack

Arranges children in a single vertical column with consistent spacing between them.

[Figma component](https://www.figma.com/design/5mhVqXlldJEEB2VWZeKQ4i/%F0%9F%A7%AC-Sanity-UI?node-id=29358-183&m=dev) · [React component](https://github.com/sanity-io/ui/blob/v4-beta/packages/ui/src/primitives/stack/Stack.tsx)

### API documentation

Stack takes the following props:

### Usage guidelines

**When to use:**

- To arrange items in a vertical column with even spacing. Examples: form fields, card lists, text blocks.
- To stack related content where each child spans the full width of the parent.
- To create vertical rhythm in a section without writing custom CSS.

**When not to use:**

- To lay out items side by side. Use **Flex** instead.
- To create a two-axis grid of items. Use **Grid** instead.
- To flow inline items that wrap to the next line. Use **Inline** instead.
- To wrap a single child with no spacing needs. Use **Box** instead.
- To create overlapping layers on the z-axis. Use CSS `position` and `z-index` instead. Stack does not layer items — it lines them up in sequence.

**Layout primitive comparison:**

| **Component** | **Direction** | **Spacing prop** | **Wrapping** | **CSS model** | **Use case** |
| --- | --- | --- | --- | --- | --- |
| Stack | Vertical only | `gap` | None | CSS Grid | Vertical column of items |
| Flex | Any | `gap` + alignment | Optional | Flexbox | Rows, columns, or mixed layouts |
| Grid | Two-axis | `gap` + columns/rows | Implicit | CSS Grid | Grid-based layouts |
| Inline | Horizontal | `space` | Wraps by default | Flexbox | Tags, chips, inline groups |

### Best practices

**Do**

- Use `gap` to control spacing. Stack is built for this. Avoid adding margins to children.
- Match `gap` to content density. Use `1`–`2` for tightly grouped items. Use `3`–`4` for distinct siblings. Use `5`+ for section-level breaks.
- Set `as="ul"` or `as="ol"` when children form a list. Add `role="list"` and wrap each child in an `<li>`. See the accessibility section for details.
- Set `as="nav"` when children form a set of navigation links.
- Nest Stacks to create grouped layouts. A form can use an outer Stack with `gap={5}` for field groups, and inner Stacks with `gap={2}` for label-input pairs.

**Don't**

- Don't add `margin-bottom` or `margin-top` to children to create spacing. Use `gap` on the Stack. Manual margins conflict with the grid gap and cause uneven results.
- Don't use Stack when items need to sit side by side. Use **Flex** or **Inline** instead.
- Don't set `as` to a semantic element without meeting its contract. A `<nav>` needs navigation links. A `<fieldset>` needs a `<legend>`. A `<section>` needs a heading. See the accessibility section.
- Don't use `as="button"` or `as="dialog"` on Stack. Stack provides layout, not behavior. Use the **Button** or **Dialog** components for those roles.
- Don't reorder children with CSS `order`. This breaks the link between visual order and DOM order, which harms screen reader and keyboard users.

### Variants

#### Gap

`gap` sets the vertical space between children. Values map to the spacing scale. The prop accepts responsive values.

| **Value** | **Size** | **Content pattern** | **Use case** |
| --- | --- | --- | --- |
| `0` | 0px | No gap | Items that must touch (rare) |
| `1` | 4px | Tight grouping | Label paired with its input |
| `2` | 8px | Tight grouping | Icon paired with a text line |
| `3` | 12px | Standard spacing | Form fields in a group |
| `4` | 20px | Standard spacing | Cards in a list, paragraphs |
| `5` | 28px | Generous spacing | Sections within a view |
| `6` | 36px | Generous spacing | Major content blocks |
| `7` | 44px | Generous spacing | Page-level sections |
| `8` | 52px | Generous spacing | Reserved for large layouts |
| `9` | 60px | Generous spacing | Reserved for large layouts |

**Content density tiers:**

- **Tight (1–2).** Items that form a single unit. A label and its input. An icon and its caption. The gap should feel like a pause, not a break.
- **Standard (3–4).** Distinct items that belong to the same group. Form fields, paragraphs, cards. The gap should feel like a clear separator.
- **Generous (5+).** Major sections that need visual distance. Use this to create breaks without adding a divider. The gap should feel like a new section.

**Responsive example:** `<Stack gap={[2, , 4]}>` — uses `2` at the smallest breakpoint and `4` at the 600px breakpoint.

#### As (semantic element)

`as` sets the rendered HTML element. The default is `'div'`.

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

`<Stack as="ul" role="list" gap={2}>`

`  <li>First item</li>`

`  <li>Second item</li>`

`  <li>Third item</li>`

`</Stack>`



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

### v3 to v4 migration

| **Area** | **v3** | **v4** |
| --- | --- | --- |
| Spacing prop | `space={3}` | `gap={3}` (renamed) |
| Responsive format | Array only: `space={[2, 3]}` | Array, object, or scalar: `gap={3}`, `gap={[2, , 4]}`, `gap={{sm: 2, lg: 4}}` |
| List handling | `as="ul"` applied `list-style: none` on its own | Removed. Apply `list-style: none` and `role="list"` yourself. |
| Styling engine | styled-components | CSS class composition |
| `forwardRef` | Required for ref forwarding | Not needed (React 19 ref-as-prop) |
| Breakpoints | Theme-driven (varied) | Fixed: `[0, 360, 600, 900, 1200, 1800, 2400]` px |

**Rename **`space`** to **`gap`**.** Find all uses of `<Stack space={…}>` and change them to `<Stack gap={…}>`. The values (0–9) stay the same.

**Update list Stacks.** In v3, `as="ul"` stripped list markers on its own. In v4, you must add `role="list"` and style `list-style: none` yourself. Without `role="list"`, VoiceOver does not treat the element as a list.

**Check responsive values.** v3 only accepted arrays. v4 accepts arrays, objects, and scalars. No changes are needed — arrays still work. Objects and scalars are new options.

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

- **Semantic elements via `as`.** Text defaults to a `<div>`. Use `as` to render the correct element:
  - `as="p"` — for paragraph text.
  - `as="span"` — for inline text within another element.
  - `as="label"` — for form labels. Pair with `htmlFor` to link to an input.
  - Do not use `as` for behavioral elements like `<button>` or `<a>`. Text does not add keyboard handling or ARIA roles (WCAG 4.1.2 A).
- **Color contrast.** Text must maintain **4.5:1** contrast against its background for standard sizes, and **3:1** for large text (24px+ regular or 19px+ bold) (WCAG 1.4.3 AA). Take care with `muted` or `accent` on non-standard backgrounds.
- **Color independence.** Do not use the `accent` prop as the only way to mark status. Pair color with text labels or icons (WCAG 1.4.1 A).
- **Zoom and reflow.** Text must remain legible at 400% zoom / 320px viewport width (WCAG 1.4.10 AA). Text spacing must hold up when users override line height to 1.5×, paragraph spacing to 2×, letter spacing to 0.12×, and word spacing to 0.16× (WCAG 1.4.12 AA). Spacing tokens use `rem` units and scale with user font-size settings. Do not use fixed `px` units when overriding styles.

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

Accent should only be used in rare circumstances where adding color is considered essential to communication. Use `size` ahead of accent.

#### TextOverflow

Determines whether the Heading component truncates as opposed to wrapping. This should be used as a last resort. Some examples where TextOverflow should be used are:

- Titles used within a grid of elements where text wrapping would cause irregular sizes or shifts in content.
- Situations where text is user/machine generated and extreme edge cases may exist.

Before truncating, attempt to shorten the text if possible. The ideal kind of truncation is no truncation. When truncation is necessary, make sure the full text string is available via `Tooltip` component or `title `attribute.

### Accessibility

- **Navigation and orientation.** Screen reader users rely on headings to navigate complex interfaces. Headings address common orientation issues in Sanity Studio.
- **Semantic structure.** Always use the `as` prop to render `<h1>`–`<h6>` tags. The default `<div>` rendering provides no heading role. Screen readers will skip it.
- **Logical order.** Heading levels must descend in sequence (H1 → H2 → H3). Do not skip levels (e.g. H1 to H4). Screen reader users navigate by heading level — a gap breaks their mental model.
- **Color contrast.** `muted` or `accent` headings must maintain **3:1** contrast against the background for large text (24px+ regular or 19px+ bold) and **4.5:1** for smaller text (WCAG 1.4.3 AA).
- **Zoom and reflow.** Heading sizes must remain legible at 400% zoom / 320px viewport width (WCAG 1.4.10 AA). Long headings should wrap, not clip. When using `textOverflow="ellipsis"`, verify clipped headings still make sense in context. Spacing tokens use `rem` and scale with user font-size settings (WCAG 1.4.12 AA).

### **Content**

- **Concise:** Keep headings short and glanceable. Avoid overly long titles that wrap to multiple lines if possible.
- **Sentence case:** Use sentence case for headings (e.g., "Page settings" rather than "Page Settings") to maintain a conversational tone and improve scanability.
- **No punctuation:** Do not use punctuation (periods) at the end of headings unless the heading is a direct question.
- **Descriptive:** Headings should clearly describe the content of the section they introduce.

# Tooltip

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

`<Tooltip content={<Text>Edit Profile</Text>}>`

`  <Button icon={EditIcon} mode="ghost" />`

`</Tooltip>`



**2. With Arrow and Animation** Provides a smoother visual transition and clearer connection to the trigger.

`<Tooltip`

`  arrow`

`  animate`

`  content={<Box padding={2}><Text>Helpful information</Text></Box>}`

`>`

`  <Button text="Hover me" />`

`</Tooltip>`



**3. Delayed Interaction** Adds a 500ms delay before opening to prevent accidental triggers.

`<Tooltip`

`  delay={{ open: 500, close: 0 }}`

`  content={<Text>Delayed tip</Text>}`

`>`

`  <Button icon={InfoIcon} />`

`</Tooltip>`



### Accessibility

- **Keyboard trigger.** Tooltips must appear on keyboard focus, not only on mouse hover. The child element must be interactive (a `<button>`, `<a href>`, or other focusable element).
- **Escape to dismiss.** Pressing `Escape` must hide the tooltip without moving focus.
- **Tab behavior.** The tooltip is not a Tab stop. When the user presses Tab, focus moves to the next focusable element and the tooltip closes. The tooltip should close on Tab away from the trigger (per the APG Tooltip pattern).
- **Disabled elements.** Never attach a tooltip to a disabled button (`<button disabled>`). Disabled elements leave the tab order. Keyboard users will never reach the tooltip. Place the tooltip on a wrapper element instead, or provide context through nearby text.
- **Reduced motion.** The `animate` prop respects the user's `prefers-reduced-motion` setting. When reduced motion is on, the tooltip appears and hides with no transition.
- **Screen readers.** Tooltip content must not repeat the trigger's `aria-label`. If the button is labeled "Settings," the tooltip should add context or be omitted.

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
- `.` To submit data in a form context. In such cases, set Button to `type="submit"`.

**When not to use:**

- To navigate the user to a new view or URL within  a line of text or paragraph. Use **Link** instead. Users of assistive technology expect buttons to perform actions and links to navigate.
- To switch between different views on a screen. Use **Tab** instead. The Tab component family has several `aria` tags that make navigation accessible for people relying on assistive technology.

### Best practices

**Do**

- Use the `tone=”critical”` when an action is destructive, such as delete actions.
- Ensure buttons have a logical tab order in the document flow (left to right, top to bottom).
- Bias towards using text labels in buttons to aid in comprehension.
- Limit the number of primary buttons on the screen. Display one primary action per logical section (example: actions in a toolbar, or a card).
- Add tooltips to icon-icon buttons. Wrap the button in a tooltip, and use `aria-label` – `<Tooltip text="Text"><Button aria-label="Text" icon={...} />`
- Set `iconRight` to `chevron-down` when using `Button` in `MenuButton`

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
| `“selected”` | Provides a visual cue that the button has been set as “activated” or “on” | To allow Button to act as a toggle between two states. | Text formatting options within a rich-text editor toolbar |
| `“loading”` | Provides a visual cue that the button’s action is initiated and in the process of completing | To show that a button’s action is in progress when an action is asynchronous or where there is a perceivable delay (+300ms). | Sync actions with large volumes of data Intensive processes like publishing content |

**Note: **It's possible to pass `data-{state}` props to achieve the same styling as CSS pseudo classes. These are equal:

`:hover / [data-hovered]`

`:active / [data-pressed]`

`:disabled / [data-disabled]`



#### Selected

When a button opens a panel or activates an action

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
| `"primary"` | Brand blue | THIS IS TONE IS DEPRECATED. DO NOT USE. | Brand moments, Account creation |
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

### **Content**

- **Be concise:** Button labels should be short and predictable. Use simple and direct language.
- **Start with verbs:** Labels should describe the action taken (example: "Publish", "Edit", "Upload"). For extra clarity, add the subject of the action, (example: Upload image).
- **Sentence case:** Use sentence case for button labels (example: "Add item").

### Accessibility

- **Accessible names.** Buttons with a `text` prop get their accessible name from the label. Icon-only buttons must have an `aria-label`. The `tooltip` prop does not set an accessible name. Example: `aria-label="Add content"`.
- **Keyboard interaction.** Buttons are focusable via `Tab`. They activate with both `Enter` and `Space`. `Space` activates on key-up and must not scroll the page on key-down. Disabled buttons are removed from the tab order via HTML `disabled`.
- **`as` prop and keyboard behavior.** When `as="a"`, the element activates with `Enter` only — `Space` does not trigger links. Other `as` values may change the implicit ARIA role. Do not use `as` for elements whose behavioral contract Button does not fulfil.
- **Disabled strategy.** Button uses HTML `disabled`, which removes it from tab order. For cases where the user must discover the disabled element, consider `aria-disabled="true"` instead — it keeps the element focusable but blocks activation (WCAG 2.1.1 A). Do not place tooltips on disabled buttons. Keyboard users cannot reach them.
- **Focus indicators.** A visible focus ring appears on keyboard focus. Do not suppress it without a high-contrast replacement.
- **Color contrast.** Button text vs. background must meet **4.5:1** for standard-size text (WCAG 1.4.3 AA). The button's visual edge against nearby colors must meet **3:1** (WCAG 1.4.11 AA). These are separate criteria — do not conflate them.
- **Minimum target size.** Button's default padding produces targets that meet the **24×24 CSS px** minimum (WCAG 2.5.8 AA). Custom padding values must not shrink the target below this size.
- **Tone and icons.** Do not rely on tone color alone to convey meaning. Pair `'positive'`, `'caution'`, and `'critical'` tones with icons.

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

# Toast

Used to show brief status messages about completed actions, warnings, or errors. Toasts appear at the edge of the screen and disappear after a short time.

### API documentation

_Refer to TypeDocs in Toast.tsx_

### Usage guidelines

**When to use:**

- To confirm an action that completed in the background (e.g. "Document published").
- To report an error from an async task (e.g. "Upload failed. Try a smaller file.").
- To warn about a non-blocking issue.

**When not to use:**

- For actions that need a response. Use **Dialog** instead.
- For inline form errors. Show the error next to the input instead.
- For persistent information. Use a **Card** with a tone instead.

### Content

- **Name the action and its result (P7).** Write "Document published" — not "Success." Write "3 items deleted" — not "Done." Users must know what happened without thinking back to what they clicked.
- **Use past tense for done actions (P7).** Write "Published," "Saved," "Deleted." Use "-ing" for actions not yet done: "Publishing…," "Saving…"
- **Keep status messages under one sentence (P7).** Toast messages must be easy to read at a glance. If more is needed, add a link to the item or a "Details" link.
- **Use `tone` to match the status (P7).** Good outcomes use `tone="positive"`. Warnings use `tone="caution"`. Failures use `tone="critical"`. Pair each tone with its matching icon.
- **Loading messages must name the task (P7).** Write "Publishing document…" or "Uploading image…" when the task is known. Use "Loading…" only when the task is unknown.
- **Use Text `size={1}` for toast messages (P7).** Status messages are low-rank, short-lived text.
- **Casing (P8).** Use sentence case for all toast text.
- **Translation (P9).** Toast text can grow 30–50% in other languages. Keep base text short to leave room for growth.

### Accessibility

- **Live region.** Toast containers must use `aria-live="polite"` for status messages and `aria-live="assertive"` for errors. Screen readers announce the text when it appears (WCAG 4.1.3 AA).
- **Do not rely on color alone.** Pair `tone="critical"` with `ErrorOutlineIcon` and `tone="positive"` with `CheckmarkCircleIcon` (WCAG 1.4.1 A).
- **Auto-dismiss timing.** Toasts that auto-dismiss must stay visible long enough to be read. Allow at least 5 seconds.

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

- You simply need to group elements for layout without visible boundaries or background colors. Use **Box** or **Flex** instead to avoid unnecessary DOM nesting and style calculations.
- You are building a button. While `pressed` and `selected` props exist, use the **Button** component for interactive actions to ensure full keyboard accessibility and semantic validity.
- As a layout element. Use Box, Flex, Grid, Inline, or Stack instead.

### **Usage Dos and Don’ts**

**Do	**

- Use the `tone` prop to communicate the semantic state of the content (e.g., use `'critical'` for error messages or destructive zones).
- Limit the scope of content within a Card to a single topic.
- Use the `as` prop to change the semantic HTML tag (e.g., `as="article"` or `as="section"`) to improve document structure and navigation for screen readers.

**Don’t**

- Don’t manually set text colors inside a Card unless absolutely necessary. Rely on the Card to automatically provide high-contrast text colors based on the selected `tone`.
- Don’t rely on color alone to convey meaning (e.g., a red card background) for users with color blindness; ensure text labels or icons accompany the color change.
- Use caution when nesting cards. Cards are intended to be an atomic composition. Use Box, Flex, Grid, Inline, or Stack instead.
- Don’t add interactive elements to Card when paired with an onClick event.

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
- 

##### Selected

- `Selected` should be set to true for the currently active menu item

##### Hotkeys

- Menu hotkeys should be used explicitly when representing an action. MenuItems used for Navigation should not utilize hotkeys
- 

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

`<Popover`

`  content={<Box padding={3}><Text>Popover Content</Text></Box>}`

`  open={isOpen}`

`  placement="bottom"`

`>`

`  <Button onClick={toggle} text="Open Popover" />`

`</Popover>`



**2. With Arrow and Animation** Useful for contextual help or onboarding tips.

`<Popover`

`  arrow`

`  animate`

`  content={<Box padding={2}><Text>Helpful tip!</Text></Box>}`

`  open={true}`

`  tone="primary"`

`>`

`  <Button icon={InfoIcon} />`

`</Popover>`



**3. Dropdown Behavior (Match Width)** Ensures the popover is exactly as wide as the trigger element.

`<Popover`

`  matchReferenceWidth`

`  placement="bottom-start"`

`  content={<Menu>...</Menu>}`

`  open={isOpen}`

`>`

`  <SelectButton />`

`</Popover>`



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

# Tooltip

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

`<Tooltip content={<Text>Edit Profile</Text>}>`

`  <Button icon={EditIcon} mode="ghost" />`

`</Tooltip>`



**2. With Arrow and Animation** Provides a smoother visual transition and clearer connection to the trigger.

`<Tooltip`

`  arrow`

`  animate`

`  content={<Box padding={2}><Text>Helpful information</Text></Box>}`

`>`

`  <Button text="Hover me" />`

`</Tooltip>`



**3. Delayed Interaction** Adds a 500ms delay before opening to prevent accidental triggers.

`<Tooltip`

`  delay={{ open: 500, close: 0 }}`

`  content={<Text>Delayed tip</Text>}`

`>`

`  <Button icon={InfoIcon} />`

`</Tooltip>`



### Accessibility

- **Keyboard trigger.** Tooltips must appear on keyboard focus, not only on mouse hover. The child element must be interactive (a `<button>`, `<a href>`, or other focusable element).
- **Escape to dismiss.** Pressing `Escape` must hide the tooltip without moving focus.
- **Tab behavior.** The tooltip is not a Tab stop. When the user presses Tab, focus moves to the next focusable element and the tooltip closes. The tooltip should close on Tab away from the trigger (per the APG Tooltip pattern).
- **Disabled elements.** Never attach a tooltip to a disabled button (`<button disabled>`). Disabled elements leave the tab order. Keyboard users will never reach the tooltip. Place the tooltip on a wrapper element instead, or provide context through nearby text.
- **Reduced motion.** The `animate` prop respects the user's `prefers-reduced-motion` setting. When reduced motion is on, the tooltip appears and hides with no transition.
- **Screen readers.** Tooltip content must not repeat the trigger's `aria-label`. If the button is labeled "Settings," the tooltip should add context or be omitted.

### **Content Guidelines**

- **Concise:** Limit text to a maximum of 60–75 characters where possible. Tooltips should be succinct .
- **Action-Oriented:** Start with a verb if describing an action (e.g., "Edit profile" rather than "Profile editor") .
- **Sentence Case:** Use sentence case for tooltip labels (e.g., "Save to board" not "Save To Board") .
- **No Punctuation:** Avoid periods at the end of fragments. Only use punctuation if the tooltip contains full sentences .
