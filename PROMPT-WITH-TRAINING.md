Create a simple interface that mimics Sanity Studio using Sanity UI.  

# Instructions
* Use the latest version of Sanity Icons and Sanity UI v3 for the interface
* Rely on [Sanity UI's documentation site](https://www.sanity.io/ui) and the guidelines below for guidance on how to use the UI library.
* The project should be built on top of Vite
* Use as few NPM packagess as possible 
* Do not add unit tests of any kind
* Provide feedback on areas of friction when using Sanity UI, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.


**Sanity UI guidelines below**

---

# Color

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

## Accessibility

We adhere to WCAG AA guidelines for contrast to ensure visual clarity.

- Standard Text: Must maintain a contrast ratio of at least 4.5:1 against its background.
- Large Text: Text that is at least 24px regular or 19px semi-bold must maintain a 3:1 ratio.
- UI Components: Meaningful visual elements, such as icons or input borders, must maintain a 3:1 contrast ratio against adjacent colors.
- Dynamic Backgrounds: When text is rendered over gradient backgrounds or images, you must verify that the text color meets contrast standards in all places it appears. This is particularly critical for interfaces using animations or parallax scrolling where text and backgrounds move independently.

### CSS custom properties

The theme generates `--card-*` CSS custom properties on every Card and color context. Use these in custom styles to stay consistent with the active tone and scheme.

**Core properties:**
- `--card-bg-color` — background color
- `--card-fg-color` — foreground (text) color
- `--card-border-color` — border color
- `--card-icon-color` — icon color
- `--card-muted-fg-color` — de-emphasized text color
- `--card-link-fg-color` — link text color
- `--card-focus-ring-color` — focus ring color

These properties update when the Card's `tone` or `scheme` changes. A custom style using `color: var(--card-fg-color)` adapts to light mode, dark mode, and every tone.

Do not hardcode hex values for colors that the theme already provides. Hardcoded values break in dark mode and ignore tone contexts.

### Tone values across components

Tones map semantic meaning to color. The available tones differ by component:

| Tone | Button | Card | MenuItem | Badge |
| --- | --- | --- | --- | --- |
| `'default'` | ✓ | ✓ | ✓ | ✓ |
| `'neutral'` | ✓ | — | — | — |
| `'primary'` | ✓ (legacy) | ✓ | — | ✓ |
| `'suggest'` | ✓ | — | — | — |
| `'positive'` | ✓ | ✓ | — | ✓ |
| `'caution'` | ✓ | ✓ | — | ✓ |
| `'critical'` | ✓ | ✓ | ✓ | ✓ |

Not every component supports every tone. Check the component doc for the accepted values. The visual treatment of a tone (hue, saturation, contrast) varies by component — a `'critical'` Button is a solid red fill, while a `'critical'` Card is a light red tint. The meaning is the same; the intensity differs.

### Content

- **Color must pair with text or icons.** Never rely on color alone to convey meaning. Every use of a semantic tone (positive, caution, critical) must include a text label, an icon, or both.
- **Error messages (P3).** When using critical tones, the accompanying text should state what went wrong and what the user can do. See product-content-standards.md P3.
- **Status messages (P7).** When using positive, caution, or critical tones for status, the text should lead with the outcome and include a next step when applicable. See product-content-standards.md P7.

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


# System-level accessibility standards

This document defines the accessibility standards that apply across all parts and patterns in the Sanity UI design system. Standards are grouped by category. Each standard cites the WCAG success criteria or WAI-ARIA Authoring Practices Guide (APG) pattern it derives from, states the rule, and lists which parts it applies to.

This is a living document. Each accessibility review adds to or refines the standards here. Part docs cite these standards; they do not restate them.

---

## Table of contents

1. [Semantic structure](#1-semantic-structure)
2. [Keyboard interaction](#2-keyboard-interaction)
3. [Focus management](#3-focus-management)
4. [ARIA conventions](#4-aria-conventions)
5. [Screen reader behavior](#5-screen-reader-behavior)
6. [Contrast and color](#6-contrast-and-color)
7. [Motion](#7-motion)
8. [Touch targets](#8-touch-targets)
9. [Heading hierarchy](#9-heading-hierarchy)
10. [Conformance audit](#10-conformance-audit)
11. [Cross-component patterns](#11-cross-component-patterns)
12. [Component docs to update](#12-component-docs-to-update)

---

## 1. Semantic structure

### 1.1 Semantic element selection guidance for polymorphic components

**Derives from:** WCAG 1.3.1 Info and Relationships (Level A); WCAG 4.1.2 Name, Role, Value (Level A).

**Rule:** Every component that exposes a polymorphic `as` prop must document:

1. **Decision criteria** for picking a semantic element over the default. The doc must state _when_ to use each accepted `as` value and what user need or content structure justifies the choice.
2. **Which elements carry behavioral needs beyond layout.** Elements like `<button>`, `<dialog>`, `<select>`, `<details>`, `<summary>`, `<form>`, and `<fieldset>` have behavioral contracts defined by the HTML spec (keyboard action, focus management, form submission, implicit ARIA roles). The doc must warn that using `as` to render one of these elements does not cause the part to fulfil the behavioral contract.
3. **Clear statement that layout parts provide layout only, not action behavior.** For layout primitives (Stack, Flex, Box, Grid, Inline), the doc must state that the part provides spatial grouping only. It does not add keyboard handling, focus management, or ARIA state tied to the chosen element.

**Rationale:** When a part renders as a `<nav>` or `<form>`, assistive technology users expect the landmark or widget behavior that comes with that element. If the part only provides layout, the gap between what is announced and what is delivered creates a roadblock.

**Applies to:** Stack, Flex, Box, Card, Button, Heading, Text, and any future part with an `as` prop.

### 1.2 Landmark labeling requirement

**Derives from:** WCAG 1.3.1 Info and Relationships (Level A); WCAG 2.4.1 Bypass Blocks (Level A).

**Rule:** Every part that can render as a landmark element must document the labeling needs for that element:

| Element | Labeling requirement |
| --- | --- |
| `<nav>` | Requires `aria-label` when more than one `<nav>` exists on the same page. Without a label, screen readers list many "navigation" landmarks with no way to tell them apart. |
| `<section>` | Requires an accessible name (a heading child or `aria-label`) to count as a landmark. Without one, `<section>` is the same as `<div>`. |
| `<main>` | Should appear once per page. Multiple `<main>` elements confuse the landmark hierarchy. |
| `<aside>` | Should have `aria-label` when the role of the aside is not obvious from context. |
| `<header>`, `<footer>` | When nested inside `<main>`, `<section>`, or `<article>`, they scope to that region. The doc should note that page-level `<header>` and `<footer>` act as page-level landmarks (`banner` and `contentinfo`). |
| `<form>` | Requires an accessible name via `aria-label`, `aria-labelledby`, or a visible heading. Without one, the form landmark is unlabeled. |

**Applies to:** Stack, Flex, Box, Card, and the layouts doc (Navigation sidebar, Content, Review sidebar map to `<nav>`, `<main>`, `<aside>`).

### 1.3 WebKit list-style-none remediation

**Derives from:** WCAG 1.3.1 Info and Relationships (Level A).

**Rule:** Any part that renders `<ul>` or `<ol>` and is likely to have `list-style: none` applied must document the need for `role="list"` on the list element. This applies whether the part itself or a common CSS reset adds the style.

**Rationale:** WebKit (Safari, all iOS browsers) strips list semantics from `<ul>` and `<ol>` elements when `list-style: none` is applied. VoiceOver does not announce the element as a list and does not report the item count. Adding `role="list"` restores the expected behavior. This is a known WebKit design choice, not a bug, and it is not likely to change.

**Added rule:** The doc must state that each child of a list must be an `<li>` element. Using `<div>` children inside `<ul>` or `<ol>` produces invalid HTML no matter what `role` is set.

**Applies to:** Stack (with `as="ul"` or `as="ol"`), Menu (renders a list of items), and any future part that renders ordered or unordered lists.

### 1.4 Semantic elements carry behavioral contracts

**Derives from:** WCAG 4.1.2 Name, Role, Value (Level A).

**Rule:** When a layout or structural part allows rendering as a key HTML element — `<button>`, `<dialog>`, `<form>`, `<fieldset>`, `<details>`, `<summary>`, `<select>` — the doc must state one of:

1. **The part fulfils the behavioral contract**, including all keyboard action, focus management, and implicit ARIA semantics defined by the HTML spec for that element. _or_
2. **The part does NOT fulfil the behavioral contract**, and builders should use the matching part (Button, Dialog, etc.) instead. The doc must warn against using `as` for these elements. It must explain the result: the element will announce its role to assistive technology but will not behave as expected. This is worse than having no role at all.

**Applies to:** Stack, Flex, Box, Card, and any part with an `as` prop that accepts key behavioral elements.

---

## 2. Keyboard interaction

### 2.1 Keyboard interaction model documentation

**Derives from:** WCAG 2.1.1 Keyboard (Level A); WAI-ARIA APG interaction patterns.

**Rule:** Every interactive part must document its full keyboard interaction model. "Ensure the component is keyboard accessible" is not guidance — it is a goal statement. The doc must specify:

1. Which keys activate the part (Enter, Space, or both — and the gap in behavior between them).
2. Which keys navigate within the component (Arrow keys, Tab, Home, End).
3. Edge behavior: what happens when the user moves past the first or last item (wrap vs. stop).
4. What happens when the component is disabled: is it removed from the tab order (`tabindex="-1"`) or focusable but inert (`aria-disabled="true"`)?
5. What keyboard shortcuts exist and whether they conflict with other components on the same page.

**Applies to:** Button, Menu, MenuItem, MenuGroup, Popover, Tooltip, and any future interactive part. Layout primitives (Stack, Flex, Box) are exempt unless they render as interactive elements via `as`.

### 2.2 Visual-to-DOM order consistency

**Derives from:** WCAG 1.3.2 Meaningful Sequence (Level A); WCAG 2.4.3 Focus Order (Level A).

**Rule:** Layout parts must document whether visual order matches DOM order. The doc must warn against CSS properties that create gaps between visual display and DOM/focus order:

- `order` (Flexbox and Grid)
- `flex-direction: row-reverse` and `flex-direction: column-reverse`
- Grid placement (`grid-row`, `grid-column`) that reorders items from source order

**Rationale:** Screen readers traverse the DOM in source order. Keyboard focus follows DOM order by default. When visual order splits from DOM order, sighted keyboard users see focus jump in odd ways. Screen reader users hear content in a sequence that does not match the visual layout. Both groups lose their place.

**The doc must state:** "Do not use CSS `order`, reverse flex directions, or grid placement to reorder children. If visual reordering cannot be avoided, document the mismatch and ensure the DOM order produces a logical reading sequence."

**Applies to:** Stack, Flex, Grid, Inline, Box, and the layouts doc.

---

## 3. Focus management

### 3.1 Focus management for overlays

**Derives from:** WCAG 2.4.3 Focus Order (Level A); APG Dialog (Modal) pattern.

**Rule:** Every part that opens an overlay (dialog, popover, menu, tooltip panel, sheet) must document:

1. **Where focus moves when the overlay opens.** Name the target: the first focusable element, the overlay container, a given element, or no movement.
2. **Where focus returns when the overlay closes.** Default: focus returns to the trigger element. If the trigger no longer exists, the doc must specify the fallback.
3. **Whether the overlay traps focus.** Modal overlays must trap focus. Non-modal overlays must not.
4. **How Escape key closing works with focus.** Pressing Escape should close the overlay and return focus to the trigger.

**Applies to:** Popover, Menu (via MenuButton), Dialog, Tooltip (focus-triggered), and any future overlay part. Also applies to the layouts doc sidebar show/hide behavior.

### 3.2 Focus management for sidebar visibility

**Derives from:** WCAG 2.4.3 Focus Order (Level A); WCAG 2.4.7 Focus Visible (Level AA).

**Rule:** When a sidebar or panel is shown or hidden:

1. **On show:** Focus should move to the first focusable element inside the sidebar.
2. **On hide:** Focus should return to the toggle button that triggered the close.
3. **Hidden content must be removed from tab order.** A hidden sidebar must not contain focusable elements that keyboard users can reach.

**Applies to:** The layouts doc (Navigation sidebar toggle, Inspection sidebar toggle).

---

## 4. ARIA conventions

### 4.1 Trigger-state ARIA for expandable controls

**Derives from:** WCAG 4.1.2 Name, Role, Value (Level A).

**Rule:** Every trigger element that opens a popup, overlay, or expandable region must have:

1. `aria-expanded` set to `true` (open) or `false` (closed).
2. `aria-haspopup` set to the type of popup it owns (`menu`, `listbox`, `dialog`, `grid`, or `tree`). The default value `true` maps to `menu` — do not use `true` unless the popup is in fact a menu.

**Applies to:** Menu (via MenuButton), Popover, and any future disclosure or expandable part.

### 4.2 Disabled state strategy

**Derives from:** WCAG 4.1.2 Name, Role, Value (Level A); WCAG 2.1.1 Keyboard (Level A).

**Rule:** The design system must use a uniform approach for disabled interactive elements:

- **HTML `disabled` attribute** removes the element from tab order and blocks all action. Use for form controls where the disabled state is short-lived and the user does not need to find the element.
- **`aria-disabled="true"`** keeps the element focusable and findable but blocks activation. Use when the user needs to know the element exists and understand why it is not available.

The current pattern across the system (Button, Menu, layouts) is to use HTML `disabled`, which removes elements from tab order. The docs must state this and warn that tooltips on disabled elements cannot be reached by keyboard users.

**Applies to:** Button, MenuItem, and any future interactive part with a disabled state.

### 4.3 Live region announcement patterns

**Derives from:** WCAG 4.1.3 Status Messages (Level AA).

**Rule:**

- Status changes (loading complete, item count updates, filter results) use `aria-live="polite"`.
- Error messages and urgent alerts use `aria-live="assertive"`.
- Loading states use `aria-busy="true"` on the container.

**Applies to:** Button (loading state), Toast/notice patterns, form checking, and any part that updates content in real time.

---

## 5. Screen reader behavior

### 5.1 Accessible names for interactive elements

**Derives from:** WCAG 4.1.2 Name, Role, Value (Level A); WCAG 1.1.1 Non-text Content (Level A).

**Rule:** Every interactive element must have an accessible name that can be found by code.

- Buttons with visible text labels derive their name from the text.
- Icon-only buttons must have `aria-label` (preferred) or `aria-labelledby`.
- Form inputs must be associated with a `<label>` element via `for`/`id` or wrapping.
- Tooltips must not repeat the `aria-label` of their trigger. If the trigger already has an accessible name, the tooltip should provide _extra_ context or be omitted.

**Applies to:** Button, MenuItem, all form parts, Tooltip, and any future interactive element.

### 5.2 Landmark structure for application layouts

**Derives from:** WCAG 1.3.1 Info and Relationships (Level A); WCAG 2.4.1 Bypass Blocks (Level A).

**Rule:** Application layouts must map their regions to HTML landmarks:

| Layout region | Landmark element | Labeling |
| --- | --- | --- |
| Navigation sidebar | `<nav>` | `aria-label` required (e.g., "Application navigation") |
| Content area | `<main>` | One per page. No extra labeling needed. |
| Review sidebar | `<aside>` | `aria-label` required (e.g., "Content inspector") |
| Content toolbar | `<header>` (within `<main>`) | Scoped to `<main>`, no separate landmark. |

**Rationale:** Screen reader users move through complex layouts via landmarks. Without landmarks, a multi-region layout is a flat sequence of elements with no cues about structure.

**Applies to:** The layouts doc. Also applies to Stack, Flex, and Box when used to build layout regions.

---

## 6. Contrast and color

### 6.1 Color contrast ratios

**Derives from:** WCAG 1.4.3 Contrast (Minimum) (Level AA); WCAG 1.4.11 Non-text Contrast (Level AA).

**Rule:**

- **Standard text** (below 24px regular / 19px bold): minimum 4.5:1 contrast ratio against background.
- **Large text** (24px+ regular or 19px+ bold): minimum 3:1 contrast ratio against background.
- **UI parts and graphic objects** (icons, borders, focus markers): minimum 3:1 contrast ratio against nearby colors.
- **Disabled elements** are exempt from WCAG 1.4.11, but the doc should state the ratios and the waiver so builders do not assume disabled states are held to the same standard.

**Applies to:** Button, Card, Heading, Text, color system doc, and any component that specifies colors.

### 6.2 Color independence

**Derives from:** WCAG 1.4.1 Use of Color (Level A).

**Rule:** Color must never be the sole means of sharing meaning. Every use of semantic color — `positive`, `caution`, `critical`, `primary` — must be paired with a non-color sign: an icon, a text label, a pattern, or a shape change.

**Applies to:** Button (tone prop), Card (tone prop), color system doc, MenuItem (tone prop), and any part that uses semantic color.

---

## 7. Motion

### 7.1 Reduced motion compliance

**Derives from:** WCAG 2.3.3 Animation from Interactions (Level AAA, but treated as a baseline expectation in this design system).

**Rule:** All animations and transitions must honor the `prefers-reduced-motion` media query. When the user has asked for reduced motion:

- Transitions should be instant (0ms duration) or removed.
- No animation should be required to understand a state change.
- The `animate` prop on Tooltip and Popover must be noted as honoring this setting.

**Applies to:** Tooltip, Popover, sidebar transitions in the layouts doc, and any future part with animation.

---

## 8. Touch targets

### 8.1 Minimum target size

**Derives from:** WCAG 2.5.8 Target Size (Minimum) (Level AA).

**Rule:** All interactive targets must meet a minimum size of 24×24 CSS pixels. Inline links within text are exempt. The layouts doc states this requirement for touch-based interfaces; it applies universally.

**Enhanced target (Level AAA):** WCAG 2.5.5 Target Size (Enhanced) suggests 44×44 CSS pixels. The design system should state which level it targets and measure to match.

**Applies to:** Button, MenuItem, all form controls, inline action icons, sidebar toggle buttons, and any future interactive part.

---

## 9. Heading hierarchy

### 9.1 Configurable heading levels

**Derives from:** WCAG 1.3.1 Info and Relationships (Level A); WCAG 2.4.6 Headings and Labels (Level AA).

**Rule:** Parts that render headings must accept a heading level set via the `as` prop (e.g., `as="h2"`, `as="h3"`). No part may hardcode a heading level. The doc must:

1. State that the default rendering is a `<div>`, which provides no semantic value.
2. Instruct implementers to always set `as` to an appropriate `<h1>`–`<h6>` tag.
3. Warn against skipping heading levels (e.g., `<h1>` to `<h3>`) for visual sizing. Use the `size` prop for visual sizing and `as` for semantic level.

**Applies to:** Heading. Also applies to Card (content hierarchy guidance) and any part that contains heading content.

---

## 10. Conformance audit

This section audits each current part doc against each standard. Status values:

- **Conforms** — the doc meets the standard.
- **Partial** — the doc addresses part of the standard but has gaps.
- **Violates** — the doc breaks or omits the standard in a way that would lead to unusable results.
- **N/A** — the standard does not apply to this part.

### 10.1 Standard 1.1 — Semantic element selection guidance for polymorphic components

| Document | Status | Notes |
| --- | --- | --- |
| stack.md | **Conforms** | Lists decision criteria for each `as` value, warns against behavioral elements (`button`, `dialog`), and states that Stack provides layout only. |
| box.md | **Violates** | Has an `as` prop (implied by usage as lowest-level building block) but has no accessibility section. No guidance on semantic element choice, no warnings about behavioral elements. |
| flex.md | **Violates** | Has an `as` prop (implied by layout primitive role) but has no accessibility section at all. No semantic element guidance. |
| card.md | **Partial** | Mentions `as="section"` and `as="article"` for landmarks. Mentions `as="button"` for interactive cards. Does not warn against using `as` for elements whose behavioral contract Card does not fulfil (e.g., `<dialog>`, `<form>`, `<fieldset>`). Does not state that Card is a layout/surface primitive, not a behavioral part. |
| button.md | **Partial** | Documents `as="a"` for rendering as a link. Does not document what happens to keyboard interaction when `as` changes the element. Does not warn against `as` values that conflict with button behavior. |
| heading.md | **Conforms** | Documents `as` for setting heading level. Warns against relying on default `<div>`. The `as` prop here is for semantic heading levels, not polymorphic element choice. |
| text.md | **Partial** | Mentions `as="p"` for semantic structure but does not list other accepted values or warn about behavioral elements. |
| tooltip.md | **N/A** | Does not expose `as`. |
| popover.md | **N/A** | Does not expose `as`. |
| menu.md | **N/A** | Uses specific ARIA roles, not polymorphic rendering. |
| layouts.md | **N/A** | System-level layout doc, not a component with `as`. |

### 10.2 Standard 1.2 — Landmark labeling requirement

| Document | Status | Notes |
| --- | --- | --- |
| stack.md | **Conforms** | Documents `aria-label` for `<nav>`, accessible name requirement for `<section>`, and `<legend>` for `<fieldset>`. |
| box.md | **Violates** | No accessibility section. No landmark labeling guidance despite being usable as any element via `as`. |
| flex.md | **Violates** | No accessibility section. No landmark labeling guidance. |
| card.md | **Partial** | Mentions landmarks for `as="section"` and `as="article"` but does not document the labeling requirements (e.g., `<section>` needs an accessible name to register as a landmark). |
| button.md | **N/A** | Button does not render landmarks. |
| heading.md | **N/A** | Heading does not render landmarks. |
| text.md | **N/A** | Text does not render landmarks. |
| tooltip.md | **N/A** | No landmark rendering. |
| popover.md | **N/A** | Popover content may need ARIA role but not landmark labeling. |
| menu.md | **N/A** | Menu uses `role="menu"`, not landmarks. |
| layouts.md | **Violates** | Describes Navigation sidebar, Content area, and Inspection sidebar but never specifies the landmark elements (`<nav>`, `<main>`, `<aside>`) or their labeling requirements. The doc mentions `<Column />` components but not their semantic role. |

### 10.3 Standard 1.3 — WebKit list-style-none remediation

| Document | Status | Notes |
| --- | --- | --- |
| stack.md | **Conforms** | Documents `role="list"` requirement for `as="ul"` and `as="ol"`. Explains the WebKit behavior and VoiceOver impact. Includes code example. |
| box.md | **Violates** | Box can render as `<ul>`/`<ol>` but has no accessibility section and no list remediation guidance. |
| flex.md | **Violates** | Flex can render as `<ul>`/`<ol>` but has no accessibility section. |
| menu.md | **Partial** | Menu renders list-like content. The doc states ARIA roles are handled automatically (`role="menu"`, `role="menuitem"`) which sidesteps the list issue, but does not explain why `role="list"` is not needed (because `role="menu"` replaces list semantics). |
| card.md | **N/A** | Card does not typically render lists. |
| button.md | **N/A** | |
| heading.md | **N/A** | |
| text.md | **N/A** | |
| tooltip.md | **N/A** | |
| popover.md | **N/A** | |
| layouts.md | **N/A** | |

### 10.4 Standard 1.4 — Semantic elements carry behavioral contracts

| Document | Status | Notes |
| --- | --- | --- |
| stack.md | **Conforms** | Explicitly warns against `as="button"`, `as="dialog"`, `as="select"`. States that Stack provides layout, not behavior. |
| box.md | **Violates** | "Don't add onClick to Box" is the only warning. No mention of behavioral element contracts. |
| flex.md | **Violates** | No accessibility section. No behavioral contract warnings. |
| card.md | **Partial** | Warns against using Card as a button ("use the Button part for interactive actions to ensure full keyboard access and semantic fit"). But the doc also describes interactive Card patterns (clickable, `tabindex`, `Enter`/`Space`) without stating whether Card fulfils the `<button>` behavioral contract. |
| button.md | **N/A** | Button itself is the behavioral element. |
| heading.md | **N/A** | |
| text.md | **N/A** | |
| tooltip.md | **N/A** | |
| popover.md | **N/A** | |
| menu.md | **N/A** | |
| layouts.md | **N/A** | |

### 10.5 Standard 2.2 — Visual-to-DOM order consistency

| Document | Status | Notes |
| --- | --- | --- |
| stack.md | **Conforms** | Explicitly warns against CSS `order`. States that visual order and DOM order match by default. Cites WCAG 1.3.2. |
| flex.md | **Violates** | No accessibility section. Flex is the component most likely to use `flex-direction: row-reverse` or `order`, and the doc says nothing about the accessibility impact. |
| box.md | **Violates** | No accessibility section. No order-consistency guidance. |
| card.md | **N/A** | Card is a container, not a layout reordering tool. |
| button.md | **N/A** | |
| heading.md | **N/A** | |
| text.md | **N/A** | |
| tooltip.md | **N/A** | |
| popover.md | **N/A** | |
| menu.md | **N/A** | |
| layouts.md | **Partial** | States that the three layout sections "sit side by side along the inline axis" and "this order never changes," which implies DOM order holds. But does not warn against CSS reordering or cite the WCAG criteria. |

### 10.6 Standard 2.1 — Keyboard interaction model documentation

| Document | Status | Notes |
| --- | --- | --- |
| button.md | **Partial** | States Tab for focus, Enter and Space to activate. Does not describe Space-specific behavior (activate on keyup, prevent scroll on keydown). Does not describe disabled keyboard behavior (removed from tab order). |
| menu.md | **Conforms** | Documents Enter, Space, Arrow keys, Escape. Documents boundary behavior (ArrowDown opens, ArrowUp focuses last). Documents focus restoration on Escape. |
| popover.md | **Partial** | Documents Escape to dismiss and focus restoration. Does not document Tab behavior within the popover or whether it traps focus. |
| tooltip.md | **Partial** | Documents keyboard focus trigger and Escape to dismiss. Does not document Tab behavior or what happens when focus leaves the trigger. |
| card.md | **Partial** | Mentions Enter and Space for interactive cards, but does not describe Tab behavior or what happens when Card is not interactive. |
| stack.md | **N/A** | Layout primitive, not interactive by default. |
| box.md | **N/A** | Layout primitive. |
| flex.md | **N/A** | Layout primitive. |
| heading.md | **N/A** | |
| text.md | **N/A** | |
| layouts.md | **Partial** | Documents keyboard shortcuts for sidebar toggling (`[` and `]`) and focus management on open/close. Does not specify what happens when shortcuts conflict with other components. |

### 10.7 Standard 3.1 — Focus management for overlays

| Document | Status | Notes |
| --- | --- | --- |
| popover.md | **Partial** | States focus moves into popover on open and returns to trigger on close. Does not state whether focus is trapped or where focus lands inside the popover. |
| menu.md | **Conforms** | Documents that menu acts as a focus trap. Documents Escape restoring focus to trigger. Documents focus placement on first/last item depending on key used. |
| tooltip.md | **N/A** | Tooltips are not interactive overlays — they do not receive focus. |
| button.md | **N/A** | Button is a trigger, not an overlay. |
| card.md | **N/A** | |
| stack.md | **N/A** | |
| box.md | **N/A** | |
| flex.md | **N/A** | |
| heading.md | **N/A** | |
| text.md | **N/A** | |
| layouts.md | **Conforms** | Documents focus management for sidebar show/hide: focus moves to first focusable element on show, returns to toggle on hide, hidden content removed from tab order. |

### 10.8 Standard 4.2 — Disabled state strategy

| Document | Status | Notes |
| --- | --- | --- |
| button.md | **Partial** | States disabled buttons are removed from tab order. Warns against tooltips on disabled buttons. Does not mention `aria-disabled` as an option for findable-but-inert states. |
| menu.md | **N/A** | Does not document disabled MenuItems. |
| tooltip.md | **Conforms** | Explicitly states never to attach tooltips to disabled elements. |
| card.md | **N/A** | Card disabled behavior not documented. |
| layouts.md | **Partial** | Warns against tooltips on disabled buttons in the action guidelines. Suggests giving context via nearby messages. Does not discuss the HTML `disabled` vs. `aria-disabled` contrast. |
| stack.md | **N/A** | |
| box.md | **N/A** | |
| flex.md | **N/A** | |
| heading.md | **N/A** | |
| text.md | **N/A** | |
| popover.md | **N/A** | |

### 10.9 Standard 5.1 — Accessible names for interactive elements

| Document | Status | Notes |
| --- | --- | --- |
| button.md | **Conforms** | Documents accessible name from `text` prop. Documents `aria-label` for icon-only buttons. |
| menu.md | **Partial** | States ARIA roles are handled by default. Does not document accessible name source for MenuItems. |
| tooltip.md | **Conforms** | States tooltip content should not redundantly repeat `aria-label`. |
| popover.md | **Partial** | Mentions `aria-haspopup` and `aria-expanded` on the trigger but does not document an accessible name for the popover content. |
| layouts.md | **Partial** | Specifies `aria-label` on sidebar toggle buttons ("Show navigation", "Hide inspector"). Does not document accessible names for other interactive elements in the layout. |
| card.md | **Violates** | Describes interactive cards but does not document how they get an accessible name. A clickable card without an accessible name is read out as a plain container. |
| stack.md | **N/A** | |
| box.md | **N/A** | |
| flex.md | **N/A** | |
| heading.md | **N/A** | |
| text.md | **N/A** | |

### 10.10 Standard 6.1 — Color contrast ratios

| Document | Status | Notes |
| --- | --- | --- |
| button.md | **Partial** | States 3:1 for button text against button background (cites 1.4.11). Should specify 4.5:1 for standard text per 1.4.3, with 3:1 for UI components per 1.4.11. The current wording conflates text contrast and non-text contrast. |
| card.md | **Partial** | States 4.5:1 for nested custom components. Does not state ratios for Card's own tone colors. |
| heading.md | **Conforms** | States 3:1 for large text and 4.5:1 for smaller text. |
| text.md | **Conforms** | States 4.5:1 for standard text and 3:1 for large text. Warns about `muted` and `accent` on non-standard backgrounds. |
| color.md | **Conforms** | States 4.5:1 for standard text, 3:1 for large text, 3:1 for UI components. |
| tooltip.md | **N/A** | Inherits from Card/theme. |
| popover.md | **N/A** | Inherits from Card/theme. |
| menu.md | **N/A** | Does not document contrast. |
| stack.md | **N/A** | Layout primitive, no color. |
| box.md | **N/A** | |
| flex.md | **N/A** | |
| layouts.md | **N/A** | |

### 10.11 Standard 6.2 — Color independence

| Document | Status | Notes |
| --- | --- | --- |
| button.md | **Conforms** | Multiple mentions of pairing tone with icons. "Don't rely on color alone." |
| card.md | **Conforms** | States semantic tones should pair with icons. "Don't rely on color alone." |
| color.md | **Conforms** | "Never rely on color alone to convey meaning." |
| text.md | **Conforms** | "Don't rely on color or the `accent` prop to draw focus." |
| heading.md | **N/A** | Heading does not use semantic color. |
| menu.md | **Partial** | Uses `tone="critical"` on harmful-action items. Does not state to pair with an icon, though the layouts doc does for such actions. |
| tooltip.md | **N/A** | |
| popover.md | **N/A** | |
| stack.md | **N/A** | |
| box.md | **N/A** | |
| flex.md | **N/A** | |
| layouts.md | **Conforms** | States destructive actions should use `tone="critical"` with `ErrorOutlineIcon`. |

### 10.12 Standard 7.1 — Reduced motion compliance

| Document | Status | Notes |
| --- | --- | --- |
| tooltip.md | **Conforms** | States `animate` respects `prefers-reduced-motion`. |
| popover.md | **Conforms** | States `animate` respects `prefers-reduced-motion`. |
| layouts.md | **Conforms** | States sidebars appear at once when reduced motion is on. |
| button.md | **N/A** | No animation props. |
| card.md | **N/A** | |
| heading.md | **N/A** | |
| text.md | **N/A** | |
| menu.md | **N/A** | |
| stack.md | **N/A** | |
| box.md | **N/A** | |
| flex.md | **N/A** | |

### 10.13 Standard 8.1 — Minimum target size

| Document | Status | Notes |
| --- | --- | --- |
| button.md | **Partial** | Documents padding values that produce specific rendered sizes. Does not state minimum target size or cite WCAG 2.5.8. |
| layouts.md | **Partial** | States 24×24px minimum for touch interfaces. Does not cite WCAG 2.5.8. Does not apply the minimum to all interactive targets — only to "touch-based interfaces." The standard applies universally. |
| menu.md | **N/A** | Does not document target sizes. |
| tooltip.md | **N/A** | Tooltip is not a target. |
| popover.md | **N/A** | |
| card.md | **N/A** | |
| heading.md | **N/A** | |
| text.md | **N/A** | |
| stack.md | **N/A** | |
| box.md | **N/A** | |
| flex.md | **N/A** | |

### 10.14 Standard 9.1 — Configurable heading levels

| Document | Status | Notes |
| --- | --- | --- |
| heading.md | **Conforms** | Documents `as` for heading level. Warns against default `<div>`. Warns against skipping levels. Recommends `size` for visual sizing. |
| card.md | **Partial** | Content guidelines mention heading hierarchy ("do not start with an H1 inside a card if the page already has a main title"). They do not cite the Heading `as` prop or this standard. |
| button.md | **N/A** | |
| text.md | **N/A** | |
| tooltip.md | **N/A** | |
| popover.md | **N/A** | |
| menu.md | **N/A** | |
| stack.md | **N/A** | |
| box.md | **N/A** | |
| flex.md | **N/A** | |
| layouts.md | **N/A** | Does not mention heading hierarchy for layout regions. |

### 10.15 Spacing scale and text reflow compatibility

**Derives from:** WCAG 1.4.12 Text Spacing (Level AA); WCAG 1.4.10 Reflow (Level AA).

**Rule:** Spacing tokens must use relative units (`rem` or `em`), not fixed `px`, so that spacing scales with user font-size preferences. Layout components must confirm behavior at 400% zoom / 320px equivalent viewport width. Content must reflow into a single column without horizontal scrolling at 320 CSS px width.

| Document | Status | Notes |
| --- | --- | --- |
| stack.md | **Conforms** | States spacing tokens use `rem`. States content reflows well on narrow screens. Cites WCAG 1.4.10 and 1.4.12. |
| flex.md | **Violates** | No accessibility section. No mention of reflow or spacing units. |
| box.md | **Violates** | No accessibility section. No mention of reflow. |
| card.md | **N/A** | Card inherits spacing from children. |
| button.md | **N/A** | Button sizes are controlled by the component. |
| heading.md | **Partial** | Mentions scaling but does not cite WCAG 1.4.10 or 1.4.12. |
| text.md | **Partial** | "Ensure text remains legible when the browser is zoomed up to 200%." This is weaker than the 400% / 320px standard in WCAG 1.4.10. Does not mention spacing units. |
| tooltip.md | **N/A** | |
| popover.md | **N/A** | |
| menu.md | **N/A** | |
| layouts.md | **Partial** | Responsiveness section discusses device adaptation but does not reference WCAG 1.4.10 or test at 320px. |

---

## 11. Cross-component patterns

### 11.1 Polymorphic `as` prop accessibility pattern

**Components:** Stack, Flex, Box, Card, Button, Heading, Text.

**Pattern:** Many parts expose an `as` prop that changes the rendered HTML element. The access needs are the same across all of them: the rendered element sets the ARIA role, the landmark status, and the behavioral contract.

**Current state:** Stack documents this pattern in full. Heading documents it for heading levels. Button documents it for `as="a"`. Card partly documents it. Box, Flex, and Text do not document it at all.

**Target state:** Every part with `as` should cite standards 1.1, 1.2, and 1.4 from this document and give part-level guidance for which `as` values are fitting.

### 11.2 List rendering pattern

**Components:** Stack (with `as="ul"`/`as="ol"`), Menu, Autocomplete (future).

**Pattern:** Parts that render `<ul>` or `<ol>` need `role="list"` to preserve VoiceOver semantics when `list-style: none` is applied. Parts that render `role="menu"` do not need this fix because the menu role replaces list semantics.

**Current state:** Stack documents this well. Menu handles it through ARIA roles but does not explain the contrast. Box and Flex could render lists but have no guidance.

### 11.3 Layout-and-reflow pattern

**Components:** Stack, Flex, Grid, Inline, Box, and all layout primitives.

**Pattern:** Layout parts must confirm three things: (a) spacing tokens use `rem`, (b) content reflows at 320px viewport width, and (c) visual order matches DOM order.

**Current state:** Stack documents all three. Flex and Box document none.

### 11.4 Overlay focus management pattern

**Components:** Popover, Menu (via MenuButton), Dialog, sidebar show/hide in layouts.

**Pattern:** Every overlay follows the same lifecycle: open → move focus into overlay → trap or scope focus → close → restore focus to trigger. The details vary (menus trap focus; non-modal popovers do not), but the pattern is shared.

**Current state:** Menu documents this in full. Popover documents it in part (no focus trap detail). Layouts documents it for sidebars. No shared write-up exists.

### 11.5 Disabled element and tooltip pattern

**Components:** Button, Menu, Card (interactive), layouts (action buttons).

**Pattern:** Disabled elements are removed from tab order (HTML `disabled`). Tooltips on disabled elements cannot be reached by keyboard users. When an element is disabled, provide context through nearby text, status messages, or info icons — not tooltips.

**Current state:** Button, Tooltip, and layouts all state this rule independently with slightly different wording. The rule should be stated once here and referenced from each doc.

### 11.6 Color-and-icon pairing for semantic tones

**Components:** Button, Card, MenuItem, layouts (action buttons).

**Pattern:** Semantic tones (`positive`, `caution`, `critical`) must be paired with a matching icon. Button docs pair tones with set icons (`CheckmarkIcon`, `WarningOutlineIcon`, `ErrorOutlineIcon`). Card docs state the rule. Menu docs and layouts docs partly state it.

**Current state:** Uneven. Button and layouts are thorough. Menu mentions `tone="critical"` but does not pair it with an icon note.

---

## 12. Component docs to update

This table lists the changes needed in existing component docs to bring them into conformance with the standards defined above. Changes are ordered by severity: violations first, then partial conformance.

### Critical — no accessibility section exists

| Document | Standard(s) | What needs to change |
| --- | --- | --- |
| box.md | 1.1, 1.2, 1.3, 1.4, 2.2, 10.15 | **Add an accessibility section.** Box is a core primitive with an `as` prop. Cover six areas: (a) element choice (1.1), (b) landmark labeling (1.2), (c) `role="list"` when `as="ul"` or `as="ol"` (1.3), (d) behavioral contract warnings (1.4), (e) visual-to-DOM order (2.2), (f) `rem` spacing and reflow (10.15). |
| flex.md | 1.1, 1.2, 1.3, 1.4, 2.2, 10.15 | **Add an accessibility section.** Flex is a layout primitive with an `as` prop and is the part most likely to use `flex-direction: *-reverse` or CSS `order`. Cover all items listed for Box above, plus: (a) a warning against `flex-direction: row-reverse` and `column-reverse` per standard 2.2, (b) note that `order` on children breaks visual-to-DOM match, (c) reflow at 320px per standard 10.15. |

### High — accessibility section exists but has significant gaps

| Document | Standard(s) | What needs to change |
| --- | --- | --- |
| card.md | 1.1, 1.2, 1.4, 5.1 | (a) **Standard 1.1:** Add decision criteria for `as` values beyond `"section"` and `"article"`. List which elements Card accepts and the semantic meaning of each. (b) **Standard 1.2:** State that `as="section"` requires an accessible name (heading or `aria-label`) to count as a landmark. Now only says it "creates landmark regions" without the labeling rule. (c) **Standard 1.4:** Add a clear warning that Card does not fulfil the behavioral contract of `<button>`, `<dialog>`, `<form>`, or `<fieldset>`. The current text hints at this for `<button>` but does not state it for other elements. (d) **Standard 5.1:** Document how interactive (clickable) cards get an accessible name. A clickable card with only visual content is read out as a plain container. |
| layouts.md | 1.2, 5.2, 2.2, 10.15 | (a) **Standard 1.2 / 5.2:** Add an accessibility section with the landmark map: Navigation sidebar = `<nav aria-label="...">`, Content = `<main>`, Review sidebar = `<aside aria-label="...">`. State labeling for each. (b) **Standard 2.2:** State that the inline-start → center → inline-end order must match DOM order. Warn against CSS reordering. Cite WCAG 1.3.2. (c) **Standard 10.15:** Add reflow guidance. State that layouts must work at 320px viewport width per WCAG 1.4.10 and link to the responsive section. |

### Medium — accessibility section exists with minor gaps

| Document | Standard(s) | What needs to change |
| --- | --- | --- |
| button.md | 1.1, 2.1, 4.2, 6.1, 8.1 | (a) **Standard 1.1:** Document what happens to keyboard action and ARIA when `as` changes the element (e.g., `as="a"` means Enter-only, not Space). (b) **Standard 2.1:** Add Space key detail (activate on keyup, prevent scroll). State that disabled buttons leave the tab order via HTML `disabled`. (c) **Standard 4.2:** Mention `aria-disabled="true"` as another approach when users must find the element. (d) **Standard 6.1:** Fix the contrast cite. Button text vs. background falls under WCAG 1.4.3 (4.5:1 for standard text). 1.4.11 (3:1) applies to the button's visual edge against nearby colors. (e) **Standard 8.1:** State the minimum target size (24×24 CSS px per WCAG 2.5.8) and confirm default padding meets it. |
| popover.md | 3.1, 4.1, 5.1 | (a) **Standard 3.1:** State whether the popover traps focus (modal) or lets focus leave (non-modal). State where focus lands inside the popover. (b) **Standard 4.1:** Document `aria-haspopup` value — now says `"true"` which maps to `menu`. If the popover holds a dialog or listbox, the value should match. (c) **Standard 5.1:** Document how the popover content gets an accessible name (e.g., `role="dialog"` with `aria-label`). |
| tooltip.md | 2.1 | **Standard 2.1:** Document what happens when focus leaves the trigger — does the tooltip close? Document Tab behavior (tooltip should not be a Tab stop; it should close on Tab away from trigger per APG Tooltip pattern). |
| menu.md | 1.3, 6.2 | (a) **Standard 1.3:** Add a note that `role="menu"` replaces list semantics, so `role="list"` is not needed. This stops builders from wrongly adding `role="list"` next to `role="menu"`. (b) **Standard 6.2:** State that `tone="critical"` MenuItems should pair with an icon (e.g., `ErrorOutlineIcon`) to meet the color independence standard. |
| text.md | 1.1, 10.15 | (a) **Standard 1.1:** List the accepted `as` values and give guidance on when to use each (e.g., `as="p"` for paragraphs, `as="span"` for inline text). Warn against behavioral elements. (b) **Standard 10.15:** Update zoom guidance from "200%" to 400% zoom / 320px viewport width per WCAG 1.4.10. Note that spacing tokens should use `rem`. |
| heading.md | 10.15 | **Standard 10.15:** Add a note that heading sizes should remain legible at 400% zoom / 320px viewport width per WCAG 1.4.10. Cite the success criterion. |

### Low — conformant but could reference system standards

| Document | Standard(s) | What needs to change |
| --- | --- | --- |
| stack.md | — | No changes needed. Stack meets all standards and was the source for most standards in this document. Future reviews may add a cross-link to this file. |


## Accessibility checklist

Use this checklist when reviewing a component doc or building a new component. Each item maps to a standard above. Check every item that applies to the component. Items marked with a WCAG level indicate the minimum conformance level.

### Semantic structure

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

### Focus management

- [ ] If the component opens an overlay, the doc states where focus moves on open (3.1, WCAG 2.4.3 A)
- [ ] If the component opens an overlay, the doc states where focus returns on close (3.1)
- [ ] If the component opens a modal overlay, the doc states that focus is trapped inside the modal (3.1)
- [ ] If the component opens an overlay, the doc states that Escape closes it and returns focus to the trigger (3.1)
- [ ] If the component shows or hides a sidebar or panel, the doc states where focus moves on show and on hide (3.2)
- [ ] If the component hides content, the doc states that hidden content is removed from tab order (3.2)

### ARIA conventions

- [ ] If the component triggers a popup or expandable region, the trigger has `aria-expanded` (true/false) documented (4.1, WCAG 4.1.2 A)
- [ ] If the component triggers a popup, the trigger has `aria-haspopup` documented with the correct popup type — not just `true` (4.1)
- [ ] If the component has a disabled state, the doc states whether it uses HTML `disabled` or `aria-disabled="true"` and explains the trade-off (4.2)
- [ ] If the component has a disabled state, the doc warns that tooltips on HTML-disabled elements cannot be reached by keyboard (4.2)
- [ ] If the component updates content dynamically, the doc specifies the live region strategy — `aria-live="polite"` for status, `aria-live="assertive"` for errors (4.3, WCAG 4.1.3 AA)
- [ ] If the component has a loading state, the doc states that `aria-busy="true"` is set on the container (4.3)

### Screen reader behavior

- [ ] Every interactive element has a documented accessible name source — visible text, `aria-label`, or `aria-labelledby` (5.1, WCAG 4.1.2 A)
- [ ] Icon-only buttons have `aria-label` documented (5.1, WCAG 1.1.1 A)
- [ ] Form inputs have label association documented — `<label>` via `for`/`id` or wrapping (5.1)
- [ ] Tooltips do not repeat the trigger's `aria-label` (5.1)
- [ ] If the component builds an application layout, the doc maps regions to landmarks — `<nav>`, `<main>`, `<aside>` — with labeling (5.2, WCAG 2.4.1 A)

### Contrast and color

- [ ] Standard text meets 4.5:1 contrast against its background (6.1, WCAG 1.4.3 AA)
- [ ] Large text (24px+ regular or 19px+ bold) meets 3:1 contrast against its background (6.1, WCAG 1.4.3 AA)
- [ ] UI components and graphical objects meet 3:1 contrast against adjacent colors (6.1, WCAG 1.4.11 AA)
- [ ] If disabled elements have reduced contrast, the doc states the exemption from WCAG 1.4.11 (6.1)
- [ ] Every use of semantic color (`positive`, `caution`, `critical`) is paired with a non-color indicator — icon, text label, or shape (6.2, WCAG 1.4.1 A)

### Motion

- [ ] All animations and transitions honor `prefers-reduced-motion` (7.1, WCAG 2.3.3 AAA — treated as baseline)
- [ ] No animation is required to understand a state change (7.1)
- [ ] If the component has an `animate` prop, the doc states it respects `prefers-reduced-motion` (7.1)

### Touch targets

- [ ] All interactive targets meet 24×24 CSS px minimum (8.1, WCAG 2.5.8 AA)
- [ ] The doc states the target size and confirms it meets the minimum (8.1)
- [ ] If the component is an inline link within text, the doc notes the inline exemption (8.1)

### Heading hierarchy

- [ ] If the component renders a heading, it accepts a heading level via `as` (`as="h2"`, `as="h3"`, etc.) (9.1, WCAG 1.3.1 A)
- [ ] If the component renders a heading, the doc warns against skipping heading levels for visual sizing — use `size` for visuals, `as` for semantics (9.1)
- [ ] If the component contains heading content, the doc states that heading levels must follow the page hierarchy (9.1, WCAG 2.4.6 AA)

### Spacing and reflow

- [ ] Spacing tokens use `rem` units so they scale with user font-size settings (WCAG 1.4.12 AA)
- [ ] The component works at 400% zoom / 320px viewport width without horizontal scrolling (WCAG 1.4.10 AA)
- [ ] The component works when users override text spacing per WCAG 1.4.12 — line height 1.5×, paragraph spacing 2×, letter spacing 0.12×, word spacing 0.16× (WCAG 1.4.12 AA)

### Cross-component patterns

- [ ] If the component has a polymorphic `as` prop, all `as`-related accessibility guidance follows the shared pattern defined in standard 1.1 (11.1)
- [ ] If the component renders a list, it follows the WebKit list remediation pattern — `role="list"` plus `<li>` children (11.2)
- [ ] If the component is a layout primitive, it confirms visual order matches DOM order and documents reflow behavior (11.3)
- [ ] If the component opens an overlay, it follows the shared overlay focus lifecycle — focus on open, restore on close, Escape to dismiss (11.4)
- [ ] If the component has a disabled state and supports tooltips, the doc warns that HTML `disabled` blocks tooltip access for keyboard users (11.5)
- [ ] If the component uses semantic tones, each tone is paired with a non-color indicator (11.6)

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

**Don’t**

- Avoid adding margin/padding to individual elements like Buttons or Text to set placement.  Instead, wrap elements in Box with margin/padding.
- Don’t add onClick to Box

### **Variants**

#### Padding


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

**Don’t**

- Avoid adding margin/padding to individual elements like Buttons or Text to set placement.  Instead, wrap elements in Box with margin/padding.
- Don’t add onClick to Box

### **Variants**

#### Padding

# Box



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

**Don’t**

- Avoid adding margin/padding to individual elements like Buttons or Text to set placement.  Instead, wrap elements in Box with margin/padding.
- Don’t add onClick to Box

### **Variants**

#### Padding

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

**Don’t**

-

# Text

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
- Text has all vertical spacing removed. Use Text with Stack or Flex to space vertically stacked Text elements.

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
- **Labels (P1).** When Text serves as a UI label (inside a button, tab, or menu item), start with a verb that names the action. See product-content-standards.md P1.
- **Translation (P9).** Text can grow 30–50% in other languages. Test layouts with longer strings. RTL scripts flip inline direction — use the `align` prop's responsive values to handle both LTR and RTL.


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

Menu uses a fixed internal padding. You do not set spacing on Menu directly. To add visual separation between groups of items, use `MenuDivider`.

#### MenuGroup

#### MenuItem

##### Icon

Use `icon` to add a leading icon. If one item in a group has an icon, all items in that group should have icons for visual alignment.

##### IconRight

Used exclusively for communicating what navigation action the user should expect.

- Don’t use an icon when a menu item sends a person to another page
- Use `<ChevronRightIcon />` when a menu item drills into child menu items
- Use `<LaunchIcon />` when the icon take a person to an external link or a new tab/window

##### Tone

Use `tone='critical'` for destructive actions like 'Delete' or 'Remove.' Place critical items at the bottom of the menu, after a `MenuDivider`. Do not use tone for navigation items.

##### Selected

MenuItem supports `selected` via a visual highlight (the item's background shifts to the selected color). Unlike Button, MenuItem does not support `pressed` as a persistent visual state. Use `selected` to mark the currently active item in a navigation menu. Do not use `selected` and `tone` together on the same item — `selected` overrides the tone's visual treatment.

##### Hotkeys

Use the `hotkeys` prop to display keyboard shortcuts. Pass an array of key names: `hotkeys={['Ctrl', 'S']}`. Hotkeys are display-only — they do not add keyboard event handlers.

### MenuButton

MenuButton combines a Button trigger with a Menu popover. It handles focus, keyboard control, and `aria` state.

**Usage:**
MenuButton takes two required props:
- `button` — a `<Button>` element that acts as the trigger.
- `menu` — a `<Menu>` element that appears when the trigger is pressed.

Set `iconRight={ChevronDownIcon}` on the trigger button to signal that it opens a menu.

**Popover placement:**
MenuButton passes props to an internal Popover. Set placement through the `popover` prop: `popover={{placement: 'bottom-start'}}`. Common values: `'bottom-start'` (default), `'bottom-end'`, `'top-start'`, `'top-end'`.

**When to use:**
- To open a menu from a button. Use MenuButton instead of building a custom trigger + popover.

**When not to use:**
- For a standalone menu without a trigger. Use Menu directly.
- For a button that opens a dialog or panel. Use Button with an `onClick` handler.

### **Accessibility Guidelines**

The Sanity UI Menu components are built to WAI-ARIA specifications .

- **Keyboard Navigation:**
  - **Enter / Space / ArrowDown:** When focused on the `MenuButton`, these keys open the menu and focus the first item.
  - **ArrowUp:** Opens the menu and focuses the _last_ item.
  - **Arrow Up/Down:** Navigates between items within the open menu.
  - **Arrow Right:** Opens a nested `MenuGroup`.
  - **Arrow Left:** Closes a nested `MenuGroup` and returns focus to the parent menu.
  - **Escape:** Closes the menu and restores focus to the trigger button.
- **ARIA Roles:** The component automatically handles `role="menu"`, `role="menuitem"`, `aria-expanded`, and `aria-haspopup`.
- **Focus Management:** The menu acts as a focus trap while open. Clicking outside or pressing Tab usually closes the menu to preserve logical document flow.

### **Content Guidelines**

- **Concise Labels:** Keep `MenuItem` text short (1-3 words). Use verbs that describe the action (e.g., "Rename", not "Change the name").
- **Sentence Case:** Use sentence case for all menu items (e.g., "Open in new tab").
- **Predictable Grouping:** Place destructive actions (like Delete) at the bottom of the list, ideally separated by a `MenuDivider` to prevent accidental clicks.
- **Consistent Icons:** If you use icons for some items in a group, try to use icons for all items in that group to maintain visual alignment.
- **Confirm dialogs (P5).** Destructive menu items (`tone='critical'`) should open a confirm dialog before running the action. The confirm button repeats the action verb. The cancel button says 'Cancel.' See product-content-standards.md P5.
- **Translation (P9).** Menu item labels can grow 30–50% in other languages. Menu items in fixed-width containers are sensitive to label length. Test with longer strings. Keep base labels at 1–3 words to leave room for growth.


# Button
Used to trigger an action, such as submitting a form, opening a dialog, or running a command.

[Figma component](https://www.figma.com/design/5mhVqXlldJEEB2VWZeKQ4i/%F0%9F%A7%AC-Sanity-UI?node-id=25-769&m=dev) ·
[React component](https://github.com/sanity-io/ui/blob/v4-beta/packages/ui/src/primitives/button/Button.tsx)

### API documentation

Button takes the following props:

| Attribute | Type | Accepted values | Default | Optional | Description |
| --- | --- | --- | --- | --- | --- |
| `as` | `Component` | `'a'`, `'button'`, `'label'`, custom component | `'button'` | Yes | Sets the rendered HTML element or custom component. |
| `children` | `ReactNode` | — | `undefined` | Yes | Renders raw content with no `Text` wrapper. |
| `disabled` | `Boolean` | `true`, `false` | `false` | Yes | Removes the button from tab order and blocks interaction. |
| `fontSize` | `Number/Array` | `0`, `1`, `2`, `3`, `4` | `1` | Yes | Sets the text and icon size. Accepts responsive values. |
| `gap` | `Number/Array` | `0`–`9` | Falls back to `padding`, then `3` | Yes | Sets the space between icon and text. Accepts responsive values. |
| `icon` | `Component/ReactNode` | Any icon component or element | `undefined` | Yes | Adds a leading icon. Prefer passing a component type: `icon={AddIcon}`. |
| `iconRight` | `Component/ReactNode` | Any icon component or element | `undefined` | Yes | Adds a trailing icon. Prefer passing a component type. |
| `loading` | `Boolean` | `true`, `false` | `undefined` | Yes | Overlays a spinner and disables the button. Beta feature. |
| `mode` | `String` | `'default'`, `'ghost'`, `'bleed'` | `'default'` | Yes | Sets the visual weight. See the mode section. |
| `muted` | `Boolean` | `true`, `false` | `undefined` | Yes | Lowers the visual weight of the text label only. |
| `padding` | `Number/Array` | `0`–`9` | `3` | Yes | Sets inner padding. Accepts responsive values. |
| `paddingX` | `Number/Array` | `0`–`9` | `undefined` | Yes | Overrides inline padding. Accepts responsive values. |
| `paddingY` | `Number/Array` | `0`–`9` | `undefined` | Yes | Overrides block padding. Accepts responsive values. |
| `radius` | `Number/Array` | `0`–`6`, `'full'` | `3` | Yes | Sets border radius. Accepts responsive values. |
| `selected` | `Boolean` | `true`, `false` | `undefined` | Yes | Marks the button as active. Sets `data-selected`. |
| `text` | `ReactNode` | — | `undefined` | Yes | Sets the label. Wraps content in a `Text` component. |
| `textAlign` | `String` | `'left'`, `'right'`, `'center'`, `'justify'` | `undefined` | Yes | Sets text alignment within the button. |
| `textOverflow` | `String` | `'ellipsis'`, `'clip'` | `'ellipsis'` | Yes | Sets how text overflows: truncate or clip. |
| `textWeight` | `String` | `'regular'`, `'medium'`, `'semibold'`, `'bold'` | `'medium'` | Yes | Sets the font weight of the text label. |
| `tone` | `String` | `'default'`, `'neutral'`, `'primary'`, `'suggest'`, `'positive'`, `'caution'`, `'critical'` | `undefined` | Yes | Sets the color tone. See the tone section. |
| `tooltip` | `Object` | `TooltipProps` (without `as` and `children`) | `undefined` | Yes | Wraps the button in a lazy-loaded `Tooltip`. |
| `type` | `String` | `'button'`, `'submit'`, `'reset'` | `'button'` | Yes | Sets the HTML button type. See the type section. |
| `width` | `Number/String/Array` | `0`–`5`, `'auto'`, `'fill'`, `'stretch'`, `'min'`, `'max'` | `undefined` | Yes | Controls button width. Accepts responsive values. |

**Responsive props.** Props marked "accepts responsive values" take arrays or objects for breakpoint control. Example: `padding={[2, 3]}` sets `padding=2` on small screens and `padding=3` on large screens.

**`text` vs `children`.** The `text` prop wraps its content in a styled `Text` component. The `children` prop renders raw content with no wrapper. Use `text` for standard labels. Use `children` when you need full control over the inner markup.

**`as` prop.** Use `as="a"` to render a button as a link element. When `disabled` is true and `as="a"`, the `href` attribute is stripped.

### Usage guidelines

**When to use:**

- To trigger an action in the interface. Examples: "Publish", "Delete", "Save".
- To submit data in a form context. Set `type="submit"`.

**When not to use:**

- To navigate to a new view or URL within running text. Use **Link** instead. Users of assistive technology expect buttons to perform actions and links to navigate.
- To switch between views on a screen. Use **Tab** instead. The Tab component has `aria` attributes that make view switching accessible.
- To toggle a menu open. Use **MenuButton** instead. It manages focus, keyboard control, and `aria` state.

### Best practices

**Do**

- Set `tone="critical"` for destructive actions such as delete.
- Keep buttons in a logical tab order within the document flow.
- Favor text labels over icon-only buttons for clarity.
- Limit default-mode buttons to one per logical section (a toolbar, a card, a dialog).
- Add tooltips to icon-only buttons. Use the `tooltip` prop or wrap in a `Tooltip`, and set `aria-label`.
- Set `iconRight={ChevronDownIcon}` when using `Button` inside `MenuButton`.
- Pair `positive`, `caution`, or `critical` tones with a matching icon to support users with color vision differences.

**Don't**

- Don't rely on color alone to convey meaning. Pair color with an icon or text label.
- Don't use vague labels like "Click here." Use labels that describe the action: "Upload image."
- Don't disable buttons to block progress. Users may not know why the button is disabled. Keep the button enabled and show feedback when pressed.
- Don't hide buttons for critical actions. Primary actions should stay visible at all times.
- Don't combine icon and text in more than three buttons in one group. Overuse reduces scannability.

### Variants

#### Mode

Mode sets the visual weight of the button. It signals how important an action is.

| Value | Description | Purpose | Use case |
| --- | --- | --- | --- |
| `'default'` | Solid fill background, full visual weight | Primary actions — the most critical action in a workflow | Publish, Log in |
| `'ghost'` | Tinted fill background with a 1px border | Secondary actions — common, but not the most critical | Cancel in dialogs, Save as draft |
| `'bleed'` | White or clear fill at rest, tinted fill on hover | Tertiary actions — rare or background actions | Close/dismiss, Forgot password |

Most buttons in an interface should use `'bleed'`, then `'ghost'`, with `'default'` used least. A rough ratio is 60% bleed, 30% ghost, 10% default.

All three modes work with all seven tones. The mode sets the visual weight. The tone sets the color. A `ghost` + `critical` button shows a red-tinted border and background — the same meaning as `default` + `critical` but with less visual weight. Choose mode based on the action's importance. Choose tone based on the action's meaning.

#### Tone

Tone sets the color of the button. It signals the meaning of the action.

| Value | Description | Purpose | Use case |
| --- | --- | --- | --- |
| `'default'` | Neutral gray | General actions | Publish, Save, Cancel |
| `'neutral'` | Neutral gray (v4) | General actions with no semantic meaning | UI chrome, toolbar actions |
| `'primary'` | Brand blue. **Legacy — avoid in new work.** | Brand moments | Account setup |
| `'suggest'` | Brand blue (v4 replacement for `'primary'`) | Brand-aligned actions | Onboarding, account setup |
| `'positive'` | Green | Confirming or celebrating success | Confirm, Complete |
| `'caution'` | Yellow/orange | Actions with high consequences | Changing a role, overwriting data |
| `'critical'` | Red | Destructive or permanent actions | Delete, Remove |

Pair `'positive'`, `'caution'`, or `'critical'` with icons: `CheckmarkIcon`, `WarningOutlineIcon`, or `ErrorOutlineIcon`. This supports users with color vision differences.

#### Type

Type sets the HTML role of the button element.

| Value | Description | Use case |
| --- | --- | --- |
| `'button'` | Standard button (default) | Actions outside a form |
| `'submit'` | Submits the parent form | Form submit |
| `'reset'` | Resets the parent form | Form reset |

#### Padding

Padding controls the inner spacing of the button.

| Value | Rendered size | Use case |
| --- | --- | --- |
| `2` | 8px on all sides, 8px gap | Compact contexts like toolbars |
| `3` (default) | 12px on all sides, 12px gap | Standard buttons |

The `padding` prop accepts values from `0` to `9` and takes responsive arrays. The `gap` prop falls back to the `padding` value when not set. Override padding on one axis with `paddingX`, `paddingY`, or side-specific props like `paddingTop`.

#### Font size

`fontSize` controls the text and icon size. The default value is `1`, which maps to Inter Medium 13px (Text 1/Medium). Values range from `0` to `4`. This prop accepts responsive arrays.

#### Radius

`radius` controls border rounding. The default value is `3` (3px). Values range from `0` to `6`, plus `'full'` for pill-shaped buttons. This prop accepts responsive arrays.

**v4 change:** The default `radius` changed from `2` in v3 to `3` in v4.

#### Icon

Use `icon` to add a leading icon. Icon-only buttons (no `text` prop) are valid in dense layouts like toolbars. Icon-only buttons should always have a tooltip and an `aria-label`.

Prefer passing a component type over a rendered element:
- Do: `icon={AddIcon}`
- Avoid: `icon={<AddIcon />}`

Icons scale with the `fontSize` prop. At `fontSize={1}` (the default), icons render at 21px. At `fontSize={2}`, icons render at 25px. See the iconography doc for the full size table. Do not set `width`, `height`, or `fontSize` on the icon itself — the Button component handles sizing.

Limit icon-plus-text buttons to two cases:
1. Reinforcing tone. Pair `tone="critical"` with `icon={ErrorOutlineIcon}`.
1. Adding stress to a primary action. Reserve this for the most key button on screen.

The Figma component does not include icon child nodes. Add icons at the instance level.

#### Icon right

Use `iconRight` for trailing icons that hint at behavior:

- `ChevronDownIcon` — dropdown or menu trigger
- `LaunchIcon` — link to an outside page
- `ArrowRightIcon` — goes to a new page
- `ChevronRightIcon` — drills into nested column navigation
- Dynamic chevrons — expand and collapse

#### Tooltip

Button has built-in tooltip support via the `tooltip` prop. Pass `TooltipProps` (without `as` or `children`), and the button wraps itself in a lazy-loaded `Tooltip`.

Example: `<Button icon={AddIcon} tooltip={{content: 'Add item'}} aria-label="Add item" />`

The `tooltip` prop does not auto-populate from `aria-label`. Set both when needed: `aria-label` for screen readers, `tooltip` for sighted users.

This is the preferred method for icon-only buttons. For buttons with text labels, tooltips are rarely needed.

### States

#### Enabled

The default state. The button responds to pointer and keyboard input.

#### Hovered

Triggered when the cursor rests over the button. The background darkens to signal interactivity.

#### Pressed

Triggered during an active click, tap, or key press. The background darkens further.

#### Focused

Triggered when the button gets keyboard focus. A visible focus ring appears. Do not suppress the focus ring unless you provide a high-contrast option.

#### Selected

Marks the button as "on" or active. Set `selected={true}`. Use this for toggles — for example, bold or italic buttons in a rich-text toolbar.

- Pair with a label change when the action name differs between states.
- Combine with `mode="bleed"` for a clean toggle look.

#### Disabled

Removes the button from the tab order. Blocks all input. Tone color is stripped — disabled buttons turn gray across all tones and modes.

Use disabled states with care. Users should know why a button is disabled. Provide context through a nearby status message, info icon, or tooltip on a nearby element. Do not place tooltips on disabled buttons — keyboard users cannot reach them.

A common use: marking a button disabled during a `loading` state.

#### Loading

Beta feature. Set `loading={true}` to show a spinner over the button. The button is disabled while loading. Its size stays the same to avoid layout shifts.

Use loading only for tasks that take a clear amount of time (over 500ms). For tasks over three seconds, trigger a `Toast` when the action finishes.

**Data attribute equivalents.** CSS pseudo-class states can be set with data attributes for styling control:

| Pseudo-class | Data attribute |
| --- | --- |
| `:hover` | `[data-hovered]` |
| `:active` | `[data-pressed]` |
| `:disabled` | `[data-disabled]` |

**Disabled color behavior.** All tones lose their color when disabled. A `'critical'` button and a `'positive'` button look the same when disabled — both turn to a light gray fill. Do not rely on tone to show state for disabled buttons.

**State colors (default tone, default mode):**

| State | Background |
| --- | --- |
| Enabled | `#252837` |
| Hovered | `#1B1D27` (darker) |
| Pressed | `#0D0E12` (darkest) |
| Selected | `#0D0E12` (same as pressed) |
| Disabled | `#E3E4E8` (light gray) |

All hover, active, and focus styles only apply when `:not(:disabled)`.

### v3 to v4 migration

| Area | v3 | v4 |
| --- | --- | --- |
| `space` prop | `space={3}` for icon-text gap | Removed. Use `gap` instead. |
| `radius` default | `2` | `3` |
| `tone` values | 5 tones | 7 tones: added `'neutral'` and `'suggest'` |
| `width` type | `'fill'` only | Full set: `0`–`5`, `'auto'`, `'fill'`, `'stretch'`, `'min'`, `'max'` |
| `textWeight` default | From theme (`button.textWeight`) | Hardcoded `'medium'` |
| `forwardRef` | Required | Not needed (React 19 ref-as-prop) |
| Styling | styled-components | CSS modules |

### Accessibility

- **Accessible names.** Buttons with a `text` prop get an accessible name from the label. Icon-only buttons must have an `aria-label`. Example: `aria-label="Add content"`.
- **Keyboard interaction.** Buttons are focusable via `Tab`. They activate with both `Enter` and `Space`.
- **Focus indicators.** A visible focus ring appears on keyboard focus. Do not remove it unless you provide a high-contrast replacement.
- **Disabled states.** Disabled buttons are removed from the tab order and cannot receive focus. Avoid tooltips on disabled buttons — keyboard users cannot reach them.
- **Color contrast.** Button text must meet a contrast ratio of 3:1 or higher against the button background (WCAG 1.4.11).
- **Tone and icons.** Do not rely on tone color alone to convey meaning. Pair `'positive'`, `'caution'`, and `'critical'` tones with icons.

### Content

- **Be concise.** Labels should be short and clear. Use direct language.
- **Start with verbs.** Describe the action: "Publish", "Edit", "Upload image."
- **Use sentence case.** Example: "Add item", not "Add Item."
- **Avoid vague labels.** "Submit" is better than "Click here." Name the action.
- **Tooltips.** Add a tooltip to icon-only buttons. Keep tooltip text under 75 characters. Start with a verb that names the action. Do not restate the visible label — expand on it.
- **Confirm dialogs.** Pair `tone='critical'` buttons with a confirm dialog. The confirm button repeats the action verb ('Delete project,' not 'OK'). The cancel button says 'Cancel.' See product-content-standards.md P5.
- **Translation.** Write labels at 1–3 words, but test with 50% longer forms for translation. Avoid string joining — use full phrases. Account for RTL scripts in icon + text layouts.
- **Truncation.** Write button labels short enough to never need clipping. If a label comes from user input, clip with an ellipsis and show the full text in a tooltip.

# Card

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

**Note: **Card's semantic tone values should be paired with an associated icon (ex: `ErrorOutlineIcon` for `critical `to visually reinforce the semantic meaning of the content.

Card tones set the background, border, and foreground colors for the Card and all its children. Text, icons, and badges inside a toned Card inherit the tone's color scheme. Nesting a `tone='critical'` Card inside a `tone='default'` Card is valid — the inner Card overrides the color context for its subtree.

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

Sets the Card to a selected visual state. The background shifts to the tone's selected color. Use `selected` when the Card represents a chosen item in a list or grid — for example, a selected document in a document list. Do not use `selected` as a substitute for `tone` — selected is a state, not a semantic meaning. When `selected` is paired with a `tone`, the tone's selected color variant is used.

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

Padding values map to the spacing scale. Common values: `2` = 8px (compact, like sidebar items), `3` = 12px (standard, like content cards), `4` = 20px (spacious, like form sections), `5` = 28px (generous, like onboarding cards). Values 0–1 and 6–9 are available but seldom needed.

Individual padding can be set with `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`, `paddingX`, or `paddingY`. These props should be used with caution.

### **Accessibility Guidelines**

To ensure Cards are accessible to all users:

- **Landmarks:** When a Card represents a major section of the page, use `as="section"` or `as="article"`. This creates **Landmark** regions that screen reader users can navigate to quickly.
- **Interactive Cards:** If a Card is interactive (clickable):
  - It must have a valid `tabindex` to be focusable.
  - It must respond to `Enter` and `Space` key events, not just mouse clicks.
  - It should ideally use `as="button"` or act as a container for a stretched link, rather than adding click handlers to a `div`.
- **Contrast:** The Card component automatically handles text color contrast against its background. However, if you nest custom components, verify that text maintains a **4.5:1** contrast ratio against the Card's `tone`.
- **Focus Indication:** Ensure the Card has a visible focus style if it is interactive. Do not suppress the outline without providing an alternative high-contrast indicator.

### **Content Guidelines**

- **Hierarchy:** Cards often act as containers for grouped information. Ensure the heading levels (H2, H3, etc.) inside the card respect the page's overall outline. Do not start with an H1 inside a card if the page already has a main title.
- **Grouping:** Content within a card should be logically related. If the content describes different distinct topics, split them into separate cards to reduce cognitive load.
- **Error content (P3).** When using `tone='critical'`, the card text should state what went wrong and what the user can do. Use plain language. Do not use error codes or jargon. See product-content-standards.md P3.
- **Empty states (P4).** When a card holds a list or group that can be empty, include empty state text. State what is missing and offer an action to fix it. Example: 'No documents yet. Create your first document.'
- **Casing (P8).** Use sentence case for all text in cards — headings, labels, and body text.


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
