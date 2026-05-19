# Sanity UI 4 internal Hub

*This Google doc is our temporary single source of truth for Sanity UI 4. This content will eventually move into Sanity’s documentation site.*


## Why UI 4?

**The new version of Sanity UI aims to be the best way for any human or agent to build Sanity experiences. **It’s more opinionated–with convenient defaults and comfy ergonomics. It should lead to less code, more consistency, and better outcomes.


## Try it in 60 seconds

Install it:

`npm i @sanity-labs/ui-poc`



Compose it:

```import ``'@sanity-labs/ui-poc/styles.css'  ``// required at your entry point`

`import ``{ Box, Flex, Card, Heading, Text } ``from ``'@sanity-labs/ui-poc'`

`import ``{ Button } ``from ``'@sanity/ui'  ``// UI 3 still works`


`export default function ``Page() {`

`  ``return ``(`

`    <Flex padding={``4``} gap={``3``}>`

`      <Card density=``"regular"``>`

`        <Heading size={``2``}>Hello</Heading>`

`        <Text>UI 4 layout primitives, alongside UI 3 components.</Text>`

`      </Card>`

`    </Flex>`

`  )`

`}`

``


Read our getting started guide for the full skinny.


## Want to contribute?

We’d love that! Go read up on how to contribute as a Designer or as a Developer.


## Need help?

Hey, we get it. There’s a bunch of different ways to get support. Read our FAQ or look at our Help and support pages first.


## Love clicking links?

You’re in luck. Go to our resources page for your link clicking enjoyment.


---

<!-- Tab: Roadmap -->


---


# Sanity UI 4’s long-term roadmap


## Our ideal state

Sanity UI powers all Sanity interfaces. It gives developers, agents, and designers a shared set of building blocks, patterns, and themes.


- Developers write less code and get more consistent results
- Agents produce high-quality, reliable output.
- Designers build true-to-code prototypes that match the Sanity look and feel

Sanity UI takes a strong point of view. Guided APIs, useful defaults, and clear docs shape how teams make interfaces. Each part is purpose built for its intended job. You can tailor it, but you don't have to. This point of view bridges design, code, and product. It cuts the guesswork that slows cross-team work.


Theming runs through every part. A single button can serve product, marketing, third-party devs, email, and whitelabel needs — all by adjusting the theme. Sanity touchpoints can look as distinct or as unified as the company wants. One world-class system replaces the cost of keeping several.


The docs are equally opinionated. Beyond the how-to, they cover when, how, and why to use each part well. They sit with the rest of Sanity's docs. They address usage patterns, accessibility, content design, and visual basics. Humans and agents draw equal value from them.


A strong design system pays off more as Sanity grows. Now is the right time to push Sanity UI forward for designers, developers, and the business.


## How we get there

Seeing into the future is an exercise in humility. This roadmap aims to be concrete in the near future, but relies on speculation the further out it goes. We will continue to evolve this roadmap as the signs become clearer and/or when things change.


### FY27

Sanity UI is simpler and opinionated. Its documentation provides clear and concrete usage guidelines. The result is a collection of components that require significantly less configuration/customization. Human and agentic development is faster and more effective. Sanity codebases are slimmer and contain less tech debt. The new system enables a more consistent, more accessible, and more performant Sanity product experience.


#### Q1 FY27: Establish a strong foundation

Q1 focuses on what’s necessary for Sanity UI’s long-term success:

- Establishing a strong architectural design to enable a more simplified Sanity UI
- Updating a subset of high impact Sanity UI components and integrating into Sanity codebases
- Documenting the updated components for humans and agents directly in Sanity’s docs site
- Refining Sanity UI’s processes to enable smoother collaboration and contributions
- Building measurement and testing for key success measures to enable evidence-driven decision making

##### Areas of focus


###### Infrastructure


###### Tooling is built to measure progress and outcomes

Design system KPIs are established and tooling is built to measure system usage/health. These tools will be used to refine how Sanity UI success outcomes are measured in future quarters. The following measures are planned:

- Component usage/adoption–as a performance dashboard
- Component accessibility (via Playwright / axe-con)–as a performance dashboard
- Component performance–as a performance dashboard
- Component visual regression testing

###### Resources and guidance provided to move to updated Sanity UI components

We will build agentic training, ESLints, and/or codemods to ensure our updated components are used as soon as possible


###### Core Sanity UI improvements


###### Sanity UI is updated to be simpler and more opinionated

This update is applied to the 6 most used components (representing ~80% of instances in Studio/Media Library/Canvas).

- Box
- Flex
- Grid
- Text
- Heading
- Card

###### Sanity UI’s documentation has more detail and guidance

Documentation is updated for Sanity UI’s most used components, core foundations (ex: Color, Typography, etc.) and icons within the @sanity/icons package.


###### Evolved processes

**Rituals and communication processes are spun up**

- Weekly office hours established
**Contribution model set in place**

- Contribution models established for both design and engineering

##### Outcomes

- Sanity UI has the tools and capabilities to be entirely evidence-driven in prioritization
- Updated components have shipped and are being used in at least one Sanity product (Studio, Media Library, and/or Canvas).
- Agentic implementation of Sanity UI is more effective–both in consistency and correctness.
- Baseline scores are established for Sanity UI for the following:
  - Internal developer/designer overall sentiment
  - Impact on internal developer/designer velocity
  - Effectiveness of documentation for developer/designers


##### What this unlocks

- An updated contribution model along with updated components, and documentation enables more Sanity teams to make contributions to the system (either through updates or net-new components)
- Solid foundational components will make future component development faster and more reliable
- Measurement and testing will ensure progress is tracked and regressions are avoided

#### Q2 FY27: Expand availability

With a foundation in place, progress on updating Sanity UI’s full roster of components can accelerate. With an updated component architecture, contribution model and documentation, progress can accelerate.


##### Areas of focus


###### A simplified design token architecture

Sanity UI 3 currently has 164k color tokens in the codebase. The token collection must be drastically simplified before we can ship components with opinionated use of color. We plan to simplify the existing design token architecture to reduce the current count by at least ~80%.


###### Continued Sanity UI updates

Sanity UI’s simpler architecture and supporting documentation ships for the next 6 most used components.


**The SDK team will ship 6 more components into the codebase**

- All icon components
- PressArea
- Stack
- Inline
- Container
- Button

**New high-level Sanity UI components**

- Document list
- Document editor


###### Codebase migrations

Replace ~2,000 instances of Sanity UI 3 / HTML tag instances with Sanity UI 4.


| **Studio UI element** | **Instances** | **Refactored component** |
| --- | --- | --- |
| Text (UI 3) | 889 | Text (UI 4) |
| Flex (UI 3) | 624 | Flex (UI 4) |
| Box (UI 3) | 613 | Box (UI 4) |
| div (HTML) | 186 | Box/Flex/Grid (UI 4) |
| Grid (UI 3) | 37 | Grid (UI 4) |
| MenuDivider (UI 3) | 36 | Divider (UI 4) |
| TextWithTone (UI 3) | 33 | Text (UI 4) |
| Heading (UI 3) | 29 | Heading (UI 4) |
| Card (UI 3) | ~120 | Card (UI 4) |


The team expects edge cases that will be risky to migrate. **So, the goal is to migrate 80% of the instances outlined above.** The Sanity UI team will aim to provide codemods to support the majority of these migrations. Studio involvement is welcome, but not expected.


##### Outcomes

- Reduced package payload from reduction in tokens
- Simplified developer experience with a smaller set of design tokens to work from
- Sanity UI 4 represents ~25% of Studio UI elements
- Sanity UI internal surveys are established for the following:
  - Internal developer/designer overall sentiment
  - Impact on internal developer/designer velocity
  - Effectiveness of documentation for developer/designers

##### What this unlocks

- Refactored token architecture paves way for dramatic performance improvements in Studio, smoother rollouts of system-wide theme adjustments, and support for more areas of the business.
- Shipping all building-block level components will make creating new components faster–accelerating the component contribution flywheel.
- The components built in Q2 opens the door for another large adoption increase in Q3.

#### Q3 FY27


##### Areas of focus


###### Sanity UI theming enabled

Sanity UI’s components can be given custom aesthetics to support Marketing and Documentation use cases.


###### Continued Sanity UI updates

Sanity UI’s simpler architecture and supporting documentation ships for the next 15 most used components.

- Code
- Menu
- MenuGroup
- MenuItem
- MenuButton
- Tooltip
- Dialog
- Popover
- TextInput
- TextArea
- Select
- Checkbox
- Radio
- Switch
- Autocomplete

###### New Sanity UI components

*TBD*


###### Codebase migrations (likely to change substantially)

Replace ~1,700 instances of Sanity UI 3 instances with Sanity UI 4.


| **Studio UI element** | **Instances** | **Refactored component** |
| --- | --- | --- |
| Icons | ~600 | Icon (UI 4) |
| Stack (UI 3) | ~400 | Stack (UI 4) |
| Button (UI 3 & studio-ui) | ~300 | Button (UI 4) |
| Inline (UI 3) | ~50 | Inline (UI 4) |
| Container (UI 3) | ~30 | Container (UI 4) |
| Card (UI 3) | ~200 | Card (UI 4) |
| Remaining Q2 migrations | ~300 | Mixed |


##### Outcomes

- Sanity UI 4 is now themable to support Marketing, Docs, and other company properties
- Sanity UI 4 represents ~50% of Studio UI elements
- Increases in Sanity UI scores for the following:
  - Internal developer/designer overall sentiment
  - Impact on internal developer/designer velocity
  - Effectiveness of documentation for developer/designers

##### What this unlocks

- Marketing and Docs are able to adopt Sanity UI to reduce overhead and tech debt.
- With the vast majority of UI 3 components refactored, plans for deprecation can begin.

#### Q4 FY27


##### Areas of focus


###### Finalize Sanity UI updates

All remaining Sanity UI components have been migrated to UI 4, including:

- Tab
- TabList
- TabPanel
- Toast

###### System-wide WCAG 2.2 AA compliance

All components pass automated WCAG 2.2 AA compliance to ensure all objectively-measurable accessibility issues are resolved.


###### New Sanity UI components

Sanity UI layout components will be shipped and documented to enable third-party developers to quickly spin up app shells.


###### Codebase migrations

Given how much Studio’s codebase will change by Q4, projections will be estimated closer to this milestone.


###### Onboarding and getting started documentation aimed for external developers

Documentation will be refined to help third-party developers use Sanity UI quickly and effectively.


##### Outcomes

- Sanity UI now actively supports multiple areas of the business
- The system has reached parity with UI 3 and can officially be used as a full replacement in for external development


### FY28

FY28 is a ways out, but we’re putting thought into it nonetheless. Here are some general themes on the table:

- A world-class third-party developer experience
- More opinionated patterns
- More business areas covered
- Deeper and more refined AI integrations
- Expansion into systemized CLI/TUI experiences
- Systemized voice/tone
- Self-serve theming
- Support for emerging design/eng workflows


---

<!-- Tab: Overview -->


---


# Overview [WIP] 🚧

Sanity UI is the component library that powers every interface of the Sanity Content Operating System. It comprises a composable set of UI components designed for accessibility, consistency, and configurability, and is adept at composing high level layouts, fine tuned control surfaces, and everything in between.


Version 4 of Sanity UI builds on the library’s strengths and adopts a renewed focus on performance and ease of use (whether it’s being used by a human or an AI assistant), while setting the stage for a broader implementation of Sanity’s overarching design system.


It’s currently available as an internal preview, with much more to come in the upcoming quarters (see our roadmap for more). Below, we cover what’s changing and why you should care about it.


## Performance and resiliency

Each of Sanity UI’s components are being rebuilt from the ground up in version 4, from their markup structure and props to their styling layer. We’re taking advantage of advances in the native web platform to deliver functionality with fewer third party dependencies, which in turn enables ‘closer to the metal’ performance as well as improvements in reliability and security.


In particular, we’re going all in on CSS as our styling layer. While there’s lots we could say about the merits of CSS, we think the performance improvements we’re seeing say a lot. Our CSS bundle sizes are tiny, and our new components are fast. Really fast.


|  | *Render time per component in a run of 5k renders* |  |
| --- | --- | --- |
| **Component** | **Sanity UI 3** | **Sanity UI 4** |
| Box | 106ms (+3.3x) | 32ms |
| Flex | 175ms  (+4.6x) | 38ms |
| Grid | 141ms  (+3.4x) | 42ms |
| Text | 64ms (+2.9x) | 22ms |
| Heading | 62ms (+2.8x) | 22ms |
| Card | 398ms (+13.3x) | 30ms |
| Mixed composition | 710ms (+6.5x) | 113ms |


Systemizing Sanity UI

Despite its nimble footprint, our CSS foundation is more than up to the task of delivering some incredibly versatile styling APIs. Under the hood, we’ve constructed [our own in house design tokens Studio](https://www.sanity.io/@oSyH1iET5/studio/ct113mkrrcycqzoit318u6sl/default), which houses the foundational design tokens required to describe Sanity’s entire product design language.


Our design tokens have been encoded to align with [the Design Token Community Group (DTCG) standard for design tokens](https://www.designtokens.org/), while [our POC design tokens package](https://github.com/sanity-labs/design-tokens) handles pulling that token data down from our Studio and translating it into both CSS and DTCG spec compliant JSON for consumption by product design tooling (like Figma) as well as codebases of any kind. This reduces inconsistencies as well as bypassing the need to pay for expensive subscriptions to third party token management tools like Tokens Studio™.


Design tokens aren’t the only thing we’re now managing with Sanity’s own tooling, though. Documentation is our next task to bring in house — which brings us to talking about ease of use.


## Ease of use

We’re working to make the new Sanity UI clear and easy to use for humans as well as AI assistants. We’re doing this by making more components more opinionated, with fewer fine grained controls. Smart defaults are complemented by multifaceted styling props that deliver considered component variants with the pull of a lever. For those times when you need more control, low level components (like Box) still provide access to a wealth of parametric styles — but our goal is to make Sanity UI simple enough to not need a manual in the majority of use cases.


That said, sometimes a manual is a designer or developer’s best friend, and we’re overhauling Sanity UI’s documentation with this in mind. Each component now comes with documentation that details not only basic information such as props and example usage, but also positive and negative use cases, best practices and antipatterns, accessibility considerations, and migration guidelines for those moving over from Sanity UI version 3.


Together with our reconsidered component APIs, our new docs aim to make it easy for anyone — regardless of their discipline — to build a Sanity interface that is both consistent and effective. We’re already seeing huge improvements in agentic workflows with our new documentation in play, and we’re aiming for similar results from human authors, too.


*Note: while documentation for Sanity UI 4 currently resides in this Google document, we’re already paving the way to bring these docs into our Sanity Docs Studio, which will allow us to publish these docs alongside all of the rest of Sanity’s docs.*


## Incremental migration path

We want you to be able to use the Sanity UI as soon as possible, but we also know that migrations can be a source of stress. To that end, we’re not waiting to release our new components until we have every single one (re)built.


The new Sanity UI will ship components when they’re ready, and we’ll be working iteratively to incorporate your feedback along the way. UI 4 components can happily sit alongside UI 3 components without conflicts or styling collisions, making it easy to adopt new components at a pace and scale that works for you.


When you’re ready to adopt some new components, our codemods can automate much of the work. They’ll even identify and pass over edge cases where replacing one of your existing components with the UI 4 equivalent might cause negative impacts, allowing you to decide whether to move forward in the moment or not.


Finally, in the interest of helping you ship the best end product possible, the Sanity UI team will be carving out dedicated time for support. We have a bunch of ways to chat — feel free to get in touch with us!


## Onward!

This is your design system — we’re here to make it work for you. Our success is measured by yours.


The very best thing you can do for Sanity UI is complain. Tell us what’s not working. Tell us what needs to be better. Tell us what to prioritize. We are absolutely listening, we look forward to working with you!


---

<!-- Tab: Getting started -->


---


# Getting started — WIP 🚧


## Install

Add Sanity UI and its dependencies to your React project:


`npm i @sanity-labs/ui-poc`


## Use the new package alongside Sanity UI 3


| **Package** | **Components** |
| --- | --- |
| `@sanity-labs/ui-poc` | `Box`, `Flex`, `Grid`, `Card`, `Heading`, `Text`, `Divider`, `Icon`, `Code`, `Container` |
| `@sanity/ui` | `Button`, `Stack`, `Badge`, `Label`, `Menu`, `MenuItem`, `MenuButton`, `Select`, `TextInput`, `TextArea`, `Switch`, `Dialog`, `Tooltip`, `Popover`, `ThemeProvider`, `ToastProvider`, etc. |


`import '@sanity-labs/ui-poc/styles.css'`

`import { Box, Flex, Card, Heading, Text } from '@sanity-labs/ui-poc'`

`import { Button, Stack, Badge, Label } from '@sanity/ui'`

`import { SearchIcon } from '@sanity/icons'`


## Set up the entry point

For Sanity UI 3 components, wrap your app in `ThemeProvider` and `ToastProvider`.

For Sanity UI 4 components, import the `@sanity-labs/ui-poc` stylesheet.


`import '@sanity-labs/ui-poc/styles.css'`

`import { createRoot } from 'react-dom/client'`

`import { ThemeProvider, studioTheme, ToastProvider } from '@sanity/ui'`

`import App from './App'`


`createRoot(document.getElementById('root')!).render(`

`  <ThemeProvider theme={studioTheme}>`

`    <ToastProvider>`

`      <App />`

`    </ToastProvider>`

`  </ThemeProvider>,`

`)`



**The **`styles.css`** import is required.** Without it, all `ui-poc` components render as plain, unstyled HTML. No error is thrown.


## Build a layout

`import { Box, Flex, Card, Heading, Text } from '@sanity-labs/ui-poc'`

`import { Button, Stack, Badge } from '@sanity/ui'`

`import { AddIcon } from '@sanity/icons'`


`export default function App() {`

`  return (`

`    <Flex minHeight="100vh">`

`      <Box as="nav" aria-label="Main" padding={3} borderRight width="240px">`

`        <Heading as="h2" size={1}>My App</Heading>`

`      </Box>`

`      <Box as="main" padding={4} flexGrow={1}>`

`        <Stack space={3}>`

`          <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>`

`            <Heading as="h1" size={2}>Documents</Heading>`

`            <Button icon={AddIcon} text="New" />`

`          </Flex>`

`          <Card>`

`            <Flex alignItems="center" justifyContent="space-between">`

`              <Stack space={2}>`

`                <Text size={1} weight="medium">First document</Text>`

`                <Text size={1} muted>Edited 2 hours ago</Text>`

`              </Stack>`

`              <Badge tone="positive">Published</Badge>`

`            </Flex>`

`          </Card>`

`        </Stack>`

`      </Box>`

`    </Flex>`

`  )`

`}`




---

<!-- Tab: Tutorial -->


---


# Tutorial: build a document browser

This tutorial walks through building a three-region admin interface with Sanity UI. You will create a sidebar, a toolbar, and a content list — the same layout used in Sanity Studio.


**Before you start:** complete the steps in `getting-started-developer.md`. You should have `@sanity/ui`, `@sanity-labs/ui-poc`, and `@sanity/icons` installed, a working entry point with `ThemeProvider`, and `@sanity-labs/ui-poc/styles.css` imported.


## What you will build

A single-page app with:


- A collapsible sidebar (`<nav>`) with search and navigation links
- A toolbar with a page title and an action button
- A scrollable list of document cards with status badges
- Correct heading hierarchy, landmarks, keyboard access, and responsive reflow

## Step 1: Create the outer shell

The outer shell is a `Flex` that fills the viewport. The sidebar and main area sit side by side.


`// src/App.tsx`

`import '@sanity-labs/ui-poc/styles.css'`

`import { useState } from 'react'`

`import { Box, Flex, Heading } from '@sanity-labs/ui-poc'`

`import { Button } from '@sanity/ui'`

`import { MenuIcon } from '@sanity/icons'`


`const App = () => {`

`  const [sidebarOpen, setSidebarOpen] = useState(true)`


`  return (`

`    <Flex flexWrap="wrap" minHeight="100vh">`

`      {sidebarOpen && (`

`        <Box as="nav" aria-label="Main navigation" borderRight width="260px" flexShrink={0}>`

`          <Box padding={3}>`

`            <Heading as="h2" size={1}>Studio</Heading>`

`          </Box>`

`        </Box>`

`      )}`


`      <Flex as="main" flexDirection="column" flexGrow={1} minWidth="0" overflow="hidden">`

`        <Box padding={3} borderBottom>`

`          <Heading as="h1">All Documents</Heading>`

`        </Box>`

`      </Flex>`

`    </Flex>`

`  )`

`}`


`export default App`



**What to notice:**


- `Box as="nav"` renders a `<nav>` element. Screen readers list it as a landmark.
- `Flex as="main"` renders a `<main>` element.
- `flexWrap="wrap"` on the outer Flex lets the sidebar stack above the content at narrow widths (WCAG 1.4.10).
- `minWidth="0"` on the main area prevents content from pushing the layout wider than the viewport.
- `as="h1"` on the page heading and `as="h2"` on the sidebar heading create a correct hierarchy.

## Step 2: Add a toolbar with reflow

The toolbar holds the page title and an action button. Both wrap to separate lines on narrow screens.


Replace the `<Box padding={3} borderBottom>` inside `main` with:


`import { AddIcon, MenuIcon, CloseIcon } from '@sanity/icons'`



`<Box padding={3} borderBottom>`

`  <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>`

`    <Flex alignItems="center" gap={3} minWidth="0">`

`      {!sidebarOpen && (`

`        <Button`

`          mode="bleed"`

`          icon={MenuIcon}`

`          aria-label="Show navigation"`

`          onClick={() => setSidebarOpen(true)}`

`        />`

`      )}`

`      <Heading lineClamp={1} as="h1">All Documents</Heading>`

`    </Flex>`

`    <Button text="New document" icon={AddIcon} tone="default" />`

`  </Flex>`

`</Box>`



**What to notice:**


- `flexWrap="wrap"` is required on every `Flex` with two or more children. Without it the page overflows at 320px.
- `lineClamp={1}` on the Heading truncates long titles with an ellipsis.
- The `MenuIcon` button has `aria-label` because it has no visible text.
- `tone="default"` on the action button — not `tone="primary"`, which fails WCAG AA contrast.

## Step 3: Build the sidebar

Replace the sidebar placeholder with search, navigation links, and a close button.


`import { Stack, TextInput, Badge } from '@sanity/ui'`

`import { SearchIcon, CloseIcon } from '@sanity/icons'`

`import { Box, Flex, Heading, Text } from '@sanity-labs/ui-poc'`



`<Box as="nav" aria-label="Main navigation" borderRight width="260px" flexShrink={0} overflowY="auto">`

`  <Stack>`

`    <Box padding={3} borderBottom>`

`      <Flex alignItems="center" justifyContent="space-between">`

`        <Heading as="h2" size={1}>Studio</Heading>`

`        <Button`

`          mode="bleed"`

`          icon={CloseIcon}`

`          aria-label="Close navigation"`

`          onClick={() => setSidebarOpen(false)}`

`        />`

`      </Flex>`

`    </Box>`

`    <Box padding={3}>`

`      <Stack space={4}>`

`        <TextInput`

`          icon={SearchIcon}`

`          placeholder="Search content..."`

`          aria-label="Search content"`

`        />`

`        <Stack space={3}>`

`          <Text as="p" size={1} weight="medium">Documents</Text>`

`          <Text as="p" size={1} muted>Authors</Text>`

`          <Text as="p" size={1} muted>Settings</Text>`

`        </Stack>`

`      </Stack>`

`    </Box>`

`  </Stack>`

`</Box>`



**What to notice:**


- `Stack` uses the `space` prop for vertical spacing. `Flex` uses `gap`. They are not the same prop — using the wrong one does nothing silently.
- `Text` defaults to `<span>` (inline). Setting `as="p"` makes each item block-level, which lets `Stack space` work.
- The search input uses `aria-label` instead of a visible `Label`. Both are valid ways to give an input an accessible name.

## Step 4: Add document cards

Create a scrollable list of cards below the toolbar.


`import { Card, Container } from '@sanity-labs/ui-poc'`

`import { Badge } from '@sanity/ui'`



`const DOCUMENTS = [`

`  { title: 'Getting Started', status: 'Published' },`

`  { title: 'API Reference', status: 'Draft' },`

`  { title: 'Design Tokens', status: 'Published' },`

`]`



Add this below the toolbar `Box`, still inside the `main` Flex:


`<Box padding={4} flexGrow={1} overflowY="auto">`

`  <Container contentSize={2}>`

`    <Stack space={3}>`

`      {DOCUMENTS.map((doc) => (`

`        <Card key={doc.title}>`

`          <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>`

`            <Stack space={2}>`

`              <Heading as="h2">{doc.title}</Heading>`

`              <Text as="p" size={1} muted>Last edited 2 hours ago</Text>`

`            </Stack>`

`            <Badge tone={doc.status === 'Published' ? 'positive' : 'caution'}>`

`              {doc.status}`

`            </Badge>`

`          </Flex>`

`        </Card>`

`      ))}`

`    </Stack>`

`  </Container>`

`</Box>`



**What to notice:**


- `Container contentSize={2}` caps the card list at 960px and centers it. On a wide monitor the cards won't stretch edge to edge.
- `Container` goes inside the scroll `Box`, not around it. The `Box` handles `flexGrow` and `overflowY`; Container handles max-width only.
- Don't add Container to the sidebar or toolbar — those are app chrome and should fill their available width.
- `Card` is a content surface — it adds a background and border. Do not use it for structural regions like sidebars or toolbars.
- Layout props like `flexGrow` go on `Box`, not on `Card`. Card ignores them silently.
- Each card heading is `as="h2"` because `as="h1"` is the page title above. Never skip heading levels.

## Step 5: Set the page language

In `index.html`, set `lang="en"` on the `<html>` element:


`<html lang=``"``en``"``>`



Without this, screen readers cannot detect the page language (WCAG 3.1.1 A).


## Run it

`npm run dev`



Open `http://localhost:5173`. You should see a sidebar with search on the left and a document list on the right.


## What you built


| **Feature** | **How it works** |
| --- | --- |
| Landmarks | `Box as="nav"` and `Flex as="main"` create `<nav>` and `<main>` for screen readers. |
| Responsive sidebar | `flexWrap="wrap"` on the outer Flex. At 320px the sidebar stacks above the content. |
| Toolbar reflow | `flexWrap="wrap"` on the toolbar Flex. Heading and button wrap at narrow widths. |
| Heading hierarchy | One `<h1>` for the page title. `<h2>` for sidebar and card headings. No skipped levels. |
| Page language | `<html lang="en">` in `index.html`. |
| Icon-only buttons | `aria-label` on every button without visible text. |
| Form input | `aria-label` on the search `TextInput`. |


## Key patterns


### Box vs Flex vs Card vs Container


| **Component** | **Use for** | **Adds a visual surface?** |
| --- | --- | --- |
| `Box` | Padding, borders, scroll containers, landmarks | No |
| `Flex` | Row/column layout with alignment and gap | No |
| `Card` | Content that needs a background, border, and tone | Yes |
| `Container` | Max-width constraint and horizontal centering for content areas | No |


Do not use `Card` for toolbars, sidebars, or scroll wrappers. Use `Box` or `Flex`. Do not use `Container` for app chrome — use `Box` or `Flex` directly.


### Stack vs Flex for vertical layout


| **Use **`Stack` | **Use **`Flex flexDirection="column"` |
| --- | --- |
| Simple vertical list with even spacing | Container needs `flexGrow`, `overflow`, or `minHeight` |
| Spacing prop: `space={3}` | Spacing prop: `gap={3}` |


### Card ignores layout props

`Card` silently ignores `flexGrow`, `minWidth`, `overflow`, and all other layout props. Wrap it in a `Box`:


`{/* ✗ — flexGrow on Card does nothing */}`

`<Card flexGrow={1}>...</Card>`


`{/* ✓ — Box handles layout, Card handles the surface */}`

`<Box flexGrow={1}>`

`  <Card>...</Card>`

`</Box>`


### Icon-only buttons need aria-label

The `tooltip` prop does not set an accessible name. Add `aria-label`:


`<Button icon={SearchIcon} mode="bleed" aria-label="Search" />`


## Next steps

- Add a right-side inspector panel with `Box as="aside" aria-label="Inspector"`.
- Add dropdown actions with `MenuButton`. It needs an `id` prop for ARIA and `popover={{ portal: true }}` inside scrollable containers. See `menu.md`.
- Use `tone` on Card and Button for status: `"positive"`, `"caution"`, `"critical"`. Always pair with an icon.
- Show feedback with `useToast()`. See `toast.md`.
- Add custom brand colors by overriding CSS variables. See `patterns-custom-theming.md`.
- Build sidebar navigation with `Menu` + `MenuItem`. See the [Sidebar navigation pattern](http://../patterns/navigation.md).


---

<!-- Tab: Designer contribution model -->


---


# Designer contribution model


Sanity’s contribution model aims to be as simple and low-stress as humanly possible. Its focus is for designers/engineers to make recipes for whatever they need–without waiting for approvals or policing. Even if a recipe never officially graduates to the core design system, the contributing designer still gets something usable out of the process.


## The three-step designer contribution model


### Step 1: Make a recipe

A recipe is a distinct composition of existing design system components or design tokens (e.g., an onboarding stepper pattern built out of standard buttons, text, and containers). Recipes aren’t required to use Sanity UI, but it dramatically simplifies the following steps of the process.


- The designer creates the recipe to solve their immediate feature need and adds it to a shared recipe library.
- The more the recipe uses existing design system building blocks, the more baseline requirements like accessibility are automatically sorted out.
- **People can stop at Step 1.** There’s no pressure to continue. Teams remain unblocked and the feature team owns future maintenance.

### Step 2: Propose a contribution

The recipe creator can propose graduating it into the core system if they believe it would be valuable to the rest of the company.


- Bring the recipe to a "triage" sync. This could be as short as 15 minutes–depending on the size/complexity of the recipe.
- The design system team and the feature designer review the work together. They can perform a quick review with an engineer to ensure the idea is technically sound.
- The team decides if the recipe should graduate to a core system pattern. If it doesn't, the creator still has a perfectly usable recipe for their feature.

### Step 3: Contribute

The graduation process begins if everyone agrees that the recipe should be absorbed into the central design system. The contributing team and the design system team collaborate to:


1. Agree on what needs to change from the initial recipe to make it universally applicable.
1. Define a spec for engineering development.
1. Write usage documentation. The person best equipped to write the first draft is usually the person who made it.
1. Assign owners to take on:
  1. Changes of the initial recipe
  1. Spec definition
  1. Documentation
  1. Component development


And that’s it.


---

<!-- Tab: Developer contribution model -->


---


# Developer contribution model

This model mirrors the designer contribution model. Same philosophy: low-process, high-trust, always walk away with something usable. The difference is that the workflow goes through code.


## The three-step contribution model


### Step 1: Build a recipe

A recipe is a working composition of existing Sanity UI components. It solves a real feature need. It lives in your project — not in `@sanity/ui` itself.


Build the recipe with existing primitives (Card, Stack, Flex, Button, etc.). The more you use what the system already provides, the more accessibility, theming, and dark mode support come for free.


You can stop here. The recipe works in your project. No PR needed. No review needed. You ship your feature and move on.


### Step 2: Propose a contribution

If the recipe solves a problem other teams would face, propose graduating it into `@sanity/ui`. Ideally, there's three or more existing use cases that this recipe would cover.


Bring it to a triage sync. Share what kind of contribution this is (new component, changing an existing component, bug fix, etc.). Show the working code. Walk through the API — what props does it accept, what does it render, how does it compose with other primitives.


The design system maintainers and the contributor decide together whether it belongs in the core library. If it doesn't graduate, you still have a working recipe.


### Step 3: Open a pull request

If the team agrees the recipe should become a core component, the contributor opens a PR against the `@sanity/ui` repo. The design system team collaborates on the PR — this is a partnership, not a gate.


The rest of this document describes the steps to land a contribution.


## Branch naming and commit messages

We use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) and [conventional branches](https://conventional-branch.github.io/).


Keep the branch name to 3–5 words, lowercase, hyphen-separated. No ticket numbers in branch names — put those in the PR description.


## PR description

Every PR needs three sections. Copy this template:


`## What`


`One or two sentences describing what the PR adds or changes. Name the component`

`and the user-facing behavior.`


`## Why`


`Link to the triage decision, the issue, or the feedback that motivated this`

`change. If this graduated from a recipe, link to the original component or pattern.`


`## How to review`


`Steps to see the change in action. Could be:`

`- A Storybook story to open`

`- A test command to run`

`- A before/after screenshot`



For new components, also add:


`## API surface`


`| Prop | Type | Default | Description |`

`| --- | --- | --- | --- |`

`| (list every public prop) | | | |`


`## Open questions`


`- (anything the contributor is unsure about and wants feedback on)`




## Code formatting

Follow the conventions already in `@sanity/ui`. The short version:


- **TypeScript.** All components are `.tsx`. All props have explicit types. Export the props type alongside the component (`export type ComboboxProps = { ... }`).
- **One component per file.** The file name matches the component name: `Combobox.tsx` exports `Combobox`.
- **Props interface, not inline types.** Define a named `Props` or `ComponentNameProps` type. Do not inline complex types in the function signature.
- **No default exports.** Use named exports only.
- **CSS.** Follow the existing styling approach in the repo (CSS or styled-components — match what's in place, do not introduce a new approach).
- **Design tokens, not hardcoded values.** Do not hardcode colors, spacing, font sizes, shadows, or border radii. Use the theme's design tokens through component props (`padding`, `tone`, `radius`, `gap`) or CSS custom properties (`--card-fg-color`, `--card-border-color`). Hardcoded values break dark mode, ignore tone contexts, and diverge from the spacing scale.

## Components


### File location

Components live in the ui package along with their props and CSS:


`packages/`

`  ui/`

`    src/`

`      components/`

`        combobox/`

`          Combobox.tsx`

`          ``combobox.props.ts`

`          combobox.css`




## Storybook story

Every new component and every significant change to an existing component must include a Storybook story. The story is the review artifact — designers and engineers on the design system team use it to evaluate the component before approving the PR.


### What to include

- **One story per visual variant.** Show each combination of `tone`, `mode`, and `state` the component supports.
- **Interactive controls.** Use Storybook args/controls so reviewers can toggle props without editing code.
- **Light and dark scheme.** Include at least one story that renders the component in both `scheme="light"` and `scheme="dark"`.
- **Composition example.** Show the component used in context — populate the component with typical copy/content.
- **Edge cases.** Long text, empty state, maximum children, disabled state.

### File location

Place the story file in the Storybook app:


`apps/`

`  storybook/`

`    src/`

`      stories/`

`        Combobox.stories.tsx`



The story is the primary artifact for design review. Link to it in the PR description under "How to review."


## TSDoc prop documentation

Every public prop must have a TSDoc comment in the props type definition. These comments power IDE tooltips, generated API docs, and AI context. Follow these rules:


### Rules

- **Describe what the prop does, not what values it accepts.** The TypeScript type already declares the accepted values. Do not repeat them in the docstring.
- **Do not enumerate inherited props.** If the component extends `BoxProps` or `HTMLAttributes`, the inherited props are visible through the type. Only document props that the component adds or overrides.
- **Do not use **`@type`**.** TypeScript declares the type. The tag is redundant.
- **Do not quote simple prop names.** Props like `padding`, `tone`, and `selected` do not need quotes. Only quote names that contain special characters (e.g. `aria-label`).
- **Do not use **`@optional`**.** The `?` in the type definition marks a prop as optional. The tag adds no information.
- **Use **`@defaultValue`** only when the default is not **`undefined`**.** If a prop defaults to `undefined` (the most common case), omit the tag. If the component applies a specific default (e.g. `"div"`, `3`, `true`), document it with `@defaultValue`.
- **Do not note defaults in any other way.** Do not write "Defaults to X" in the description text. Use `@defaultValue` or nothing.

### Example — correct

`export interface ComboboxProps {`

`  /**`

`   * Text shown when no option is selected.`

`   */`

`  placeholder?: string`


`  /**`

`   * Disables the input and removes it from the tab order.`

`   * @defaultValue false`

`   */`

`  disabled?: boolean`


`  /**`

`   * HTML element to render.`

`   * @defaultValue "div"`

`   */`

`  as?: React.ElementType`


`  /**`

`   * Called when the selected value changes.`

`   */`

`  onChange?: (value: string) => void`


`  /**`

`   * Semantic background color.`

`   */`

`  tone?: 'default' | 'primary' | 'positive' | 'caution' | 'critical'`

`}`


### Example — incorrect

`// ✗ Enumerates values in the docstring`

`/**`

` * Semantic background color.`

` * Accepted values: "default", "primary", "positive", "caution", "critical".`

` */`

`tone?: 'default' | 'primary' | 'positive' | 'caution' | 'critical'`


`// ✗ Uses @type (redundant with TypeScript)`

`/**`

` * @type {string}`

` */`

`placeholder?: string`


`// ✗ Uses @optional (redundant with ?)`

`/**`

` * @optional`

` */`

`disabled?: boolean`


`// ✗ Quotes a simple prop name`

`/**`

` * The "tone" prop sets the color.`

` */`

`tone?: Tone`


`// ✗ Uses @defaultValue for undefined`

`/**`

` * @defaultValue undefined`

` */`

`onChange?: (value: string) => void`


`// ✗ Notes default in description text instead of @defaultValue`

`/**`

` * HTML element to render. Defaults to "div".`

` */`

`as?: React.ElementType`




## Testing

A PR is not ready for review until it has test coverage across five categories. Not every category applies to every PR — but the contributor should confirm which apply and mark the rest as N/A.


### Accessibility tests

Sanity UI components should meet WCAG 2.2 AA criteria at minimum. Sanity UI has built-in accessibility testing that acts as a baseline for accessibility compliance. A contributed component must pass all tests before it's officially submitted.


Refer to Component authoring accessibility standards (working draft) for specific information related to shipping accessible Sanity UI components.


### Performance tests

Measure rendering cost for components that appear in lists or render many children.


- Render time for a list of 100, 500, 1000, and 5000 instances should stay under the existing benchmark threshold. [BENCHMARK TBD]
- No layout thrashing (forced reflows) during mount or state changes.

### Visual regression tests

Sanity UI has built-in tests for visual regressing. A contribution cannot cause any visual regressions with existing components.


### Functional unit tests

Cover the component's behavior with unit tests.


- Every prop that changes rendered output has at least one test.
- Every user interaction (click, keypress, focus) has a test.
- Edge cases: empty state, overflow content, maximum prop values.

Use the test framework already in the repo. Match the patterns in existing test files.


### AI fluency tests

Verify that an LLM can use the component from its documentation alone.


- Provide the component's doc page (props table, usage guidelines, examples) as context to an LLM.
- Ask it to build a working example using the component.
- The generated code must render without errors and pass the accessibility test suite.

This measures whether the documentation and API are clear enough for both humans and AI agents to use correctly.


## Documentation required

Every PR that adds or changes a public API must include documentation updates. The PR should not be merged without them.


### For new components

Create a new `.md` file in the component documentation directory. It must include:


| **Section** | **What to write** | **Required** |
| --- | --- | --- |
| **Props table** | Every public prop with type, accepted values, default, and description | Yes |
| **Code examples** | At least one working example showing the primary use case | Yes |
| **Usage guidelines** | When to use, when not to use, which component to use instead | No |
| **Best practices** | Do / Don't list with rationale | No |
| **Accessibility** | Keyboard interaction, ARIA attributes, accessible name source, contrast notes | No |
| **Content** | Casing, label length, tone pairing, translation considerations | No |


Use `button.md`, `card.md`, or `toast.md` as a reference for the expected structure and depth.


### For changes to existing components

Update the component's doc file to reflect the change. If you add a UI 4 prop, add it to the props table and write a usage example. If you change behavior, update the affected sections.


### Writing standards

- Use sentence case throughout.
- Do not simplify technical terms (WCAG, aria-label, screen readers, etc.).


## PR checklist

Copy this into the PR description and check each item before requesting review:


`### Contribution checklist`


`- [ ] Branch follows `<type>/<description>` naming`

`- [ ] PR description has What / Why / How to review sections`

`- [ ] TypeScript types are exported for all public props`

`- [ ] Component forwards refs`

`- [ ] Named exports only (no default export)`

`- [ ] No hardcoded colors, spacing, font sizes, or shadows — uses design tokens only`


`**Storybook**`

`- [ ] Story file created or updated (`ComponentName.stories.tsx`)`

`- [ ] Stories cover all visual variants (tones, modes, states)`

`- [ ] Light and dark scheme shown`

`- [ ] Interactive controls wired to props`

`- [ ] Story linked in PR description under "How to review"`


`**Prop documentation (TypeDocs)**`

`- [ ] Every public prop has a TSDoc comment`

`- [ ] Docstrings describe behavior, not accepted values (types handle that)`

`- [ ] No `@type`, `@optional`, or quoted simple prop names`

`- [ ] `@defaultValue` used only when default is not `undefined``

`- [ ] Defaults are not noted in description text`

`- [ ] Inherited props are not re-documented`


`**Tests**`

`- [ ] Accessibility: axe-core scan passes, keyboard works, screen reader names correct`

`- [ ] Performance: renders within benchmark threshold (or N/A)`

`- [ ] Visual regression: snapshots captured for all states/schemes (or N/A)`

`- [ ] Functional: unit tests cover props, interactions, and edge cases`

`- [ ] AI fluency: LLM can build a working example from the docs (or N/A)`


`**Documentation**`

`- [ ] Component doc file created or updated`

`- [ ] Props table is complete`

`- [ ] At least one code example included`


## What happens after the PR is merged

The design system team handles:


- Publishing the next release of `@sanity/ui`.
- Updating the public documentation site.
- Announcing the new component or change to consuming teams.

The contributor is credited in the changelog.


## Keep it simple

This model works because the team is small enough that everyone knows each other. If a step feels unclear, ask in the triage sync. If a test category doesn't apply, mark it N/A and explain why. The goal is to ship good components — not to fill out forms.


---

<!-- Tab: Resources -->


---


# Resources


## Project management and tracking

- [Linear project](https://linear.app/sanity/project/sanity-ui-v4-7ed2e7c751c0/issues?filter=eyJhbmQiOlt7InByb2plY3RNaWxlc3RvbmUiOnsiaWQiOnsiaW4iOlsiNjFkN2RhYmUtMDlmZC00MGNlLThhM2UtYjJmZjgzYjc3MzljIl19fX1dfQ&layout=list&ordering=priority&grouping=workflowState&subGrouping=none&showCompletedIssues=all&showSubIssues=true&showTriageIssues=false)

## Code repositories and package management

- [Sanity UI 4 labs codebase](https://github.com/sanity-labs/ui-poc)
- [npm registry](https://www.npmjs.com/package/@sanity-labs/ui-poc)


## Figma

- [Sanity UI Figma library](https://www.figma.com/design/5mhVqXlldJEEB2VWZeKQ4i/Sanity-UI?m=auto&node-id=23381-4374&t=Wt4zdsG8xcytqeQO-1)
- [Sanity Icons Figma library](https://www.figma.com/design/KxLfxXqB2TM73IfQM9UghN/%F0%9F%94%A3-Sanity-Icons?m=auto&t=yZhsfcxhrajICTp8-7)

---

<!-- Tab: Help and support -->


---


# Help and support


## Slack channels

- [**#design-systems**](https://sanity-io.slack.com/archives/C08SH30FJQL): The best place for general questions and keeping up with updates. All important Sanity UI communications are posted here.
- [**#proj-design-system**](https://sanity-io.slack.com/archives/C09TPSVF8BF)**: **Sanity UI’s team channel for communication and general chatter. This channel remains open for transparency.
- [**#proj-sanity-ui-docs**](https://sanity-io.slack.com/archives/C0AHULJ1LEB)**: **Sanity UI’s team channel for documentation-specific conversations.

## Weekly office hours

Book time with the Sanity UI team to discuss questions, feedback, or requests. **Slots are 30 minutes long every Wednesday (9a-10a PST) and Friday (8a-9a PST)**.


[**Sign up for a 30 minute office hours slot**](https://calendar.app.google/wPB2Rsbgsfjv9uix9)


## Design systems monthly round table

The design systems monthly round table is a recurring dialog between the people making Sanity’s design system and those using it. **The meeting occurs on the first Wednesday of every month at 7a–7:50a PST**.

The goals are:

- Keep design system consumers and creators informed on important updates
- Create a feedback loop for how to improve the design system
- Discuss in-depth topics that are critical to inform future decisions and direction
[**Google Calendar event**](https://calendar.google.com/calendar/event?action=TEMPLATE&tmeid=MHU2aWxvOXY2MzMyaDYxbTFrMmk2MzQ2MWtfMjAyNjA1MDZUMTQwMDAwWiBjXzlhNjE4NGU4YmYzMWJlZWNmYzRlY2I1MTA2ODA2Y2EwOWQ3MDc3ZDNjMzllZGVhZjBlZGUxZTJhMDA4MDMyNDFAZw&tmsrc=c_9a6184e8bf31beecfc4ecb5106806ca09d7077d3c39edeaf0ede1e2a00803241%40group.calendar.google.com&scp=ALL)


## Other links


- [Sanity UI team calendar](https://calendar.google.com/calendar/u/0?cid=Y185YTYxODRlOGJmMzFiZWVjZmM0ZWNiNTEwNjgwNmNhMDlkNzA3N2QzYzM5ZWRlYWYwZWRlMWUyYTAwODAzMjQxQGdyb3VwLmNhbGVuZGFyLmdvb2dsZS5jb20)

---

<!-- Tab: FAQ -->


---


# Sanity UI 4 FAQ

Anticipated questions with honest answers. If your question isn't here, [**#design-systems**](https://sanity-io.slack.com/archives/C08SH30FJQL).


## Should I migrate now?

*It depends*. UI 4 is still a preview release and UI 3 still works. The recommended path is:


- Try UI 4 on something new — a new feature, a small internal app, a component you're building from scratch.
- Read the per-component migration tables when you're ready.
- **For non-Studio teams, it’s worth waiting on a mass migration.** We plan to migrate Studio components to UI 4 in Q2. We expect a lot of improvements to be made based on that process.

## What's the difference between `@sanity-labs/ui-poc` and `@sanity/ui@4.0.0-beta.3`?

- [TBD]

## What’s coming in Q2?

- **6 new components.** Stack, Button, PressArea, Inline, Container, Icons.
- **Token refactor.** Reduce UI 3's ~164,500 color tokens by at least 80% (DS-141, urgent).
- **Color scheme adjustment** (DS-151, urgent).
- **Studio migration.** Migrate ~2,000 Studio UI elements to UI 4 (8 components × instances). Codemods land for the components that need them.
- **Contribution program launch** (DS-150).
- **Adoption + agentic fluency metrics automation** (DS-135, DS-136).
- **AILF (AI Literacy Framework) setup for Sanity UI docs** (DS-133).

Read more[ ](https://docs.google.com/document/d/1pXIuGMWk4ACW3VzsUQoq4m6WdjYr4L3lRDkitoZ4D8c/edit?tab=t.x5d1n61ty7e#heading=h.nskvlsmn2sj0)[here](https://docs.google.com/document/d/1pXIuGMWk4ACW3VzsUQoq4m6WdjYr4L3lRDkitoZ4D8c/edit?tab=t.x5d1n61ty7e#heading=h.nskvlsmn2sj0) or check out our[ ](https://linear.app/sanity/project/sanity-ui-v4-7ed2e7c751c0/issues?filter=eyJhbmQiOlt7InByb2plY3RNaWxlc3RvbmUiOnsiaWQiOnsiaW4iOlsiNjFkN2RhYmUtMDlmZC00MGNlLThhM2UtYjJmZjgzYjc3MzljIl19fX1dfQ&layout=list&ordering=priority&grouping=workflowState&subGrouping=none&showCompletedIssues=all&showSubIssues=true&showTriageIssues=false)[Linear milestone](https://linear.app/sanity/project/sanity-ui-v4-7ed2e7c751c0/issues?filter=eyJhbmQiOlt7InByb2plY3RNaWxlc3RvbmUiOnsiaWQiOnsiaW4iOlsiNjFkN2RhYmUtMDlmZC00MGNlLThhM2UtYjJmZjgzYjc3MzljIl19fX1dfQ&layout=list&ordering=priority&grouping=workflowState&subGrouping=none&showCompletedIssues=all&showSubIssues=true&showTriageIssues=false).


## What's the bigger picture beyond Q2?

We have big hopes and dreams. You can read all about what they are and how we plan to achieve them in our[ ](https://docs.google.com/document/d/1pXIuGMWk4ACW3VzsUQoq4m6WdjYr4L3lRDkitoZ4D8c/edit?tab=t.x5d1n61ty7e)[long-term roadmap](https://docs.google.com/document/d/1pXIuGMWk4ACW3VzsUQoq4m6WdjYr4L3lRDkitoZ4D8c/edit?tab=t.x5d1n61ty7e).


## Why is this worth doing?

Sanity is currently spending separate code, separate maintenance, and separate diligence on multiple UI solutions across the company. UI 4's architecture and theming are how Sanity collapses that into one system that supports product, marketing, docs, email, and beyond.


There's precedent. Design systems commonly improve design/development velocity by 30%. The ceiling is likely much higher–especially with agentic support. Sanity UI can allow the company to be more aligned, produce better outcomes, and do so with less effort.


## Will this break my UI 3 code?

It shouldn’t. Installing `@sanity-labs/ui-poc` does nothing to your existing `@sanity/ui` imports. The two packages coexist.


### Why is UI 4 in `@sanity-labs/ui-poc` and not `@sanity/ui directly`?

Three reasons:

- UI 4 is incomplete. Q1 ships 7 components; Q2 adds 6. Publishing UI 4 as a major version of `@sanity/ui` would force a half-migration on every consumer.
- It allows us to ship the same components without competition. Want to use UI 4’s Box component? Great–do it. If it doesn’t work for a specific use case, you can always fall back to using UI 3’s Box–alongside UI 4.
- The labs prefix sets the right expectation. `@sanity-labs/*` is Sanity's existing convention for experimental packages — APIs may change, support is best-effort. Putting UI 4 there inherits that contract.

When UI 4 is complete and stable, components move to a permanent home and the labs package gets deprecated.


## Are there codemods?

Yes, for some migrations.


- **Card** — SDK-1347
- **UI 3 → v5 import paths** — SDK-1260 (Done)
- **Flex shorthand split** (`flex` → `flexBasis` + `flexGrow` + `flexShrink`) — SDK-1339 (Done)

Lauren is building the rest as the migration work in Q2 progresses. Not every breaking change needs a codemod — many are 1-line manual fixes.


## Is UI 4 stable?

No–everything is still written in pencil. We want the experience of using UI 4 to be joyful. That means we *need* your feedback. This preview release is intended to solicit just that. APIs will change to meet your needs and expectations. The area we expect the most change is color. We’ve established a basic API for now that we’re not entirely happy with. We expect it to change and improve in the weeks ahead.


## Why did my component render with no styles?

You probably forgot the stylesheet import. Add this at your app entry:


`import`` ``'@sanity-labs/ui-poc/styles.css'`


Without it, the layout components render as unstyled HTML. There's no error or warning — the browser swallows it silently. This is the single most common first-install issue.


## Can I use `styled(Box)` or `styled(Flex)`?

No. UI 4 components are not styled-components — they're plain function components with CSS classes. Use `className` and CSS instead.


If you have a heavily styled-components-based codebase, this is the largest migration hurdle. The rest of the breaking changes are smaller.


## What about `style={{ width: '100%' }}` and similar?

There’s nothing stopping you, but ideally not. UI 4 has direct props for those now. Inline styles still work, but use the props when they exist:


`{/*`` ``old`` ``*/}`

`<Box`` ``style={{`` ``width:`` ``'100%',`` ``position:`` ``'sticky'`` ``}}`` ``/>`


`{/*`` ``new`` ``*/}`

`<Box`` ``width="100%"`` ``position="sticky"`` ``/>`


The full list of inline-style replacements is in each component's reference doc.


## Is contribution open?

Structured contribution opens in Q2, when the contribution program launches (DS-150 — High priority). Until that's live, the most useful contribution is:


- Use the Q1 components and report what breaks
- Open issues on the repo or in `#design-system`
- Flag where the system is missing what you need

The[ ](https://docs.google.com/document/d/13zM-mzfIoQTxAQ8onZuNvSZ5oVpScFzx8VQ_seDQY0Y/edit#)[designer contribution model](https://docs.google.com/document/d/13zM-mzfIoQTxAQ8onZuNvSZ5oVpScFzx8VQ_seDQY0Y/edit#) and[ ](https://docs.google.com/document/d/13zM-mzfIoQTxAQ8onZuNvSZ5oVpScFzx8VQ_seDQY0Y/edit#)[developer contribution model](https://docs.google.com/document/d/13zM-mzfIoQTxAQ8onZuNvSZ5oVpScFzx8VQ_seDQY0Y/edit#) — both shipped in Q1 — describe how the program will work. Worth reading now if you want to understand where this is headed.


## Where do I report bugs?

`#design-system` for fast triage, or open an issue on the repo: github.com/sanity-labs/ui-poc.


For accessibility issues specifically: same place, but please flag the WCAG criterion if you know it. UI 4 ships with a[ ](https://docs.google.com/document/d/13zM-mzfIoQTxAQ8onZuNvSZ5oVpScFzx8VQ_seDQY0Y/edit#)[documented accessibility authoring standard](https://docs.google.com/document/d/13zM-mzfIoQTxAQ8onZuNvSZ5oVpScFzx8VQ_seDQY0Y/edit#) — if a component fails one of the 13 standards, that's a bug.


## What's the relationship between UI 4 and the existing component-level documentation?

The component reference docs (Box, Flex, Grid, Card, Heading, Text, Divider) currently live in the working Google Doc. They include API docs, usage guidelines, accessibility notes, and UI 3 → UI 4 migration tables. The hub links to each one.


The long-term home for these docs is sanity.io/docs — the team is working on getting the UI 4 reference into a `/ui` section there. Until that ships, the working Google Doc is the canonical location. Q2 includes[ ](https://linear.app/sanity/issue/DS-133)[AILF setup for Sanity UI docs](https://linear.app/sanity/issue/DS-133) which sets up the docs to be agent-readable from day one.


## Is there a hosted sandbox I can play with?

Not at launch. The repo includes a Storybook instance you can run locally — clone `github.com/sanity-labs/ui-poc` and follow the README. A hosted sandbox is on the wishlist for after the soft-launch period.


## Will the visual design change?

The architecture changed; the visual design mostly carries over–for now. Density, spacing, typography — same. **Color will be changing.** We’re planning a Q2 token refactor to reduce the color scale by **at least **80%. We expect to add adjustments to color during that process. If your code uses `tone` props, you'll get the new colors automatically. If you've hardcoded colors, you'll need to update them.


## Will styled-components ever come back?

No. The move off styled-components is intentional and final. Bundle size, runtime cost, and SSR ergonomics all improved.


## Where’s the Figma library?

[Where it’s always been](https://www.figma.com/design/5mhVqXlldJEEB2VWZeKQ4i/Sanity-UI?node-id=23381-4374&p=f&t=Wt4zdsG8xcytqeQO-0)! The current Sanity UI Figma library will be updated as UI 4 ships. We’ll add new components into the [UI 4 page](https://www.figma.com/design/5mhVqXlldJEEB2VWZeKQ4i/Sanity-UI?node-id=31000-2516) as companion components until we’ve fully migrated away from UI 3.


## I have a question that's not here.

We bet you do. Drop it in `#design-system` or open a discussion on the repo. We'll add common ones to this page.


---

<!-- Tab: Shared props -->


---


# Shared props

Sanity UI comes with a rich set of styling props that are shared across multiple components. This section outlines those shared props. Refer to individual components’ documentation to see which of the shared props they leverage.


---

<!-- Tab: Base -->


---


# Base

The following props are available on all components. Some props such as `as` and `display` will accept a different range of values depending on the component in use.


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| as | React.ElementType | Element or component to render — valid values differ per component | Any valid HTML tag or component | No | Dependent on component |
| display | Responsive<...> | CSS display property — valid values differ per component | See component-specific tables | No | Dependent on component |
| className | string | Additional CSS class names | Any string | No | — |
| style | React.CSSProperties | Inline styles | Any valid CSS property value pairs | No | — |


### 


---

<!-- Tab: Border -->


---


# Border


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| border | Responsive<boolean> | Applies a border on all sides. Borders inherit color styling from the `tone` prop if it has been set; otherwise, they default to gray. | true, false | No | — |
| borderTop | Responsive<boolean> | Applies a border on the top side | true, false | No | — |
| borderRight | Responsive<boolean> | Applies a border on the right side | true, false | No | — |
| borderBottom | Responsive<boolean> | Applies a border on the bottom side | true, false | No | — |
| borderLeft | Responsive<boolean> | Applies a border on the left side | true, false | No | — |
| radius | Responsive<Radius> | CSS border-radius using the design scale | 0–6, full | No | — |


### 


---

<!-- Tab: Flex attributes -->


---


# Flex attributes


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| flexBasis | Responsive<string> | CSS flex-basis — initial main-axis size of the item | Any valid CSS value | No | — |
| flexGrow | Responsive<number> | CSS flex-grow — how much the item grows relative to siblings | Any number | No | — |
| flexShrink | Responsive<number> | CSS flex-shrink — how much the item shrinks relative to siblings | Any number | No | — |


### 


---

<!-- Tab: Gap -->


---


# Gap


### Shared only between Flex and Grid components


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| gap | Responsive<Space> | CSS gap — spacing between all children | 0–9 | No | — |
| gapX | Responsive<Space> | CSS column-gap — horizontal spacing between children | 0–9 | No | — |
| gapY | Responsive<Space> | CSS row-gap — vertical spacing between children | 0–9 | No | — |


---

<!-- Tab: Grid attributes -->


---


# Grid attributes


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| gridColumn | Responsive<string> | CSS grid-column shorthand | Any valid CSS value | No | — |
| gridColumnStart | Responsive<string> | CSS grid-column-start | Any valid CSS value | No | — |
| gridColumnEnd | Responsive<string> | CSS grid-column-end | Any valid CSS value | No | — |
| gridRow | Responsive<string> | CSS grid-row shorthand | Any valid CSS value | No | — |
| gridRowStart | Responsive<string> | CSS grid-row-start | Any valid CSS value | No | — |
| gridRowEnd | Responsive<string> | CSS grid-row-end | Any valid CSS value | No | — |


---

<!-- Tab: Margin -->


---


# Margin


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| margin | Responsive<SpaceAuto> | Margin on all sides | 0–9, auto | No | — |
| marginX | Responsive<SpaceAuto> | Margin on left and right | 0–9, auto | No | — |
| marginY | Responsive<SpaceAuto> | Margin on top and bottom | 0–9, auto | No | — |
| marginTop | Responsive<SpaceAuto> | Margin on top side | 0–9, auto | No | — |
| marginRight | Responsive<SpaceAuto> | Margin on right side | 0–9, auto | No | — |
| marginBottom | Responsive<SpaceAuto> | Margin on bottom side | 0–9, auto | No | — |
| marginLeft | Responsive<SpaceAuto> | Margin on left side | 0–9, auto | No | — |


### 


---

<!-- Tab: Overflow -->


---


# Overflow


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| overflow | Responsive<Overflow> | CSS overflow on both axes | visible, hidden, auto | No | — |
| overflowX | Responsive<Overflow> | CSS overflow-x | visible, hidden, auto | No | — |
| overflowY | Responsive<Overflow> | CSS overflow-y | visible, hidden, auto | No | — |


### 


---

<!-- Tab: Padding -->


---


# Padding


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| padding | Responsive<Space> | Padding on all sides | 0–9 | No | — |
| paddingX | Responsive<Space> | Padding on left and right | 0–9 | No | — |
| paddingY | Responsive<Space> | Padding on top and bottom | 0–9 | No | — |
| paddingTop | Responsive<Space> | Padding on top side | 0–9 | No | — |
| paddingRight | Responsive<Space> | Padding on right side | 0–9 | No | — |
| paddingBottom | Responsive<Space> | Padding on bottom side | 0–9 | No | — |
| paddingLeft | Responsive<Space> | Padding on left side | 0–9 | No | — |


### 


---

<!-- Tab: Position -->


---


# Position


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| position | Responsive<Position> | CSS position | absolute, fixed, relative, static, sticky | No | — |
| inset | Responsive<SpaceAuto> | CSS inset — all sides simultaneously | 0–9, auto | No | — |
| top | Responsive<SpaceAuto> | CSS top offset | 0–9, auto | No | — |
| right | Responsive<SpaceAuto> | CSS right offset | 0–9, auto | No | — |
| bottom | Responsive<SpaceAuto> | CSS bottom offset | 0–9, auto | No | — |
| left | Responsive<SpaceAuto> | CSS left offset | 0–9, auto | No | — |


---

<!-- Tab: Shadow -->


---


# Shadow


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| shadow | Shadow | CSS box-shadow | 0–5 | No | — |


---

<!-- Tab: Tone -->


---


# Tone


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| tone | Tone | Applies semantic colors to a component. Application of the colors varies by component. | none, neutral, primary, suggest, positive, caution, critical | No | Dependent on component |


### 


---

<!-- Tab: Width and Height -->


---


# Width and height


### Width


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| width | Responsive<string> | CSS width | Any valid CSS value | No | — |
| minWidth | Responsive<string> | CSS min-width | Any valid CSS value | No | — |
| maxWidth | Responsive<string> | CSS max-width | Any valid CSS value | No | — |


### Height


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| height | Responsive<string> | CSS height | Any valid CSS value | No | — |
| minHeight | Responsive<string> | CSS min-height | Any valid CSS value | No | — |
| maxHeight | Responsive<string> | CSS max-height | Any valid CSS value | No | — |


### 


---

<!-- Tab: Z Index -->


---


# Z Index


| **Prop** | **Type** | **Description** | **Values** | **Required** | **Default** |
| --- | --- | --- | --- | --- | --- |
| zIndex | Responsive<number> | CSS z-index | Any valid CSS value | No | — |


---

<!-- Tab: Components -->


---


---

<!-- Tab: Box -->


---


# Box

The lowest-level building block for containing UI elements.


[React component](https://github.com/sanity-labs/ui-poc/tree/main/packages/ui/src/components/box)


## Basic example

**Source:** `@sanity-labs/ui-poc`


`import { Box } from '@sanity-labs/ui-poc'`


`<Box padding={4}>`

`  This is a box`

`</Box>`

**Note:** Box requires `@sanity-labs/ui-poc/styles.css` to be imported once at your app's entry point. Without it, this component renders unstyled. See Getting Started for more info.


## API documentation

Box's own props are `as` and `display`.


| **Prop** | **Description** | **Type** | **Values** | **Default** | **Required** |
| --- | --- | --- | --- | --- | --- |
| `as` | HTML element or component to render | `React.ElementType` | Any valid HTML tag or component (ex: `'nav'`, `'section'`, `'main'`) | `'div'` | No |
| `display` | CSS `display` property. Does not include `'flex'` or `'grid'` — use the Flex or Grid components for those. | `Responsive<DisplayBlock>` | `'block'`, `'inline-block'`, `'none'` | `'block'` | No |


### Shared props

- Border
- Flex attributes
- Grid attributes
- Margin
- Overflow
- Padding
- Position
- Shadow
- Tone — applies a background color by default; if border props are used, the chosen tone will determine the border color
- Width and height
- Z index


## Usage guidelines


### When to use

- As a container for child elements
- To  apply padding or margin to a group of elements
- To create basic visual styling (such as background, border, shadow, etc.) for the purposes of composing a custom component

### When not to use

- As an interactive element. Box is not intended to act as a button.
- As a way to stack or align one of more child elements. Use Flex, Stack, or Inline instead.
- When you want to render an element with `display: flex`. Don't use inline styles to render a Box with flex styles. Use Flex instead.
- As a way to display children in a grid layout. Use Grid instead.
- To act as a container for content that would otherwise be reserved for Card.
- To center content at a max width. Use **Container** instead — it sets `max-width` and centers itself.

## Best practices


### Do

- Use Box's core styling props, such as `tone`, `padding`, `width`, etc. to adjust the visual appearance of the component. Refer to **core component props** to review available styling props.
- Use padding over margin when possible. Padding keeps spacing inside the component's own box. Margin creates spacing that depends on siblings and parent context, making layout harder to predict — especially with margin collapse.
- Wrap elements in Box with margin/padding as opposed to applying inline styles to child elements, such as Text or Button.

### Don't

- **Never use **`as="button"`**.** `Box as="button"` does not reset browser defaults — the result has a visible border, background color, padding, and an inappropriate cursor. **Use the **`Button`** component instead.**
- Don't use `style` to adjust visual attributes of `Box` when a style prop exists. Avoid inline styles for `width`, `height`, `borderRadius`, `background`, `color`, `fontSize`, `fontWeight`, and `cursor` on `Flex` or `Box`. Use the matching style prop instead. Check whether `Avatar`, `Badge`, `Button`, or `Card` with appropriate props covers your use case before writing a custom element.
- Don't give Box inline styles to display as flex. Sanity UI components are meant to be modular, single purpose and composable. If you need a container with a background and flex display, use wrap Flex with Box that uses `tone`: `<Box tone="neutral" ... ><Flex ... > ... </Flex></Box>`

## Accessibility

- Box provides spacing and structure. It does not add keyboard handling, focus management, or ARIA state. If you render Box as a semantic element via `as`, you are responsible for the behavior that element requires.
- Box accepts an `as` prop. Use it to render semantic HTML when the content requires it:
  - `as="nav"` — requires `aria-label` when more than one `<nav>` exists on the page (WCAG 1.3.1 A).
  - `as="section"` — requires a heading child or `aria-label` to register as a landmark (WCAG 1.3.1 A).
  - `as="form"` — requires an accessible name via `aria-label`, `aria-labelledby`, or `<legend>` (WCAG 1.3.1 A).
  - `as="main"` — should appear once per page.
  - `as="aside"` — should have `aria-label` when the role is not clear from context.
- Do not use `as` to render `<button>`, `<dialog>`, `<select>`, `<details>`, `<summary>`, or `<fieldset>`. Box does not fulfil the keyboard, focus, or ARIA contracts those elements require (WCAG 4.1.2 A). Use the matching Sanity UI component instead.
- When rendering `as="ul"` or `as="ol"`, add `role="list"` if `list-style: none` is applied. WebKit strips list semantics without it (WCAG 1.3.1 A). Children must be `<li>` elements.
- Do not use CSS `order` or grid placement on Box children to reorder them from source order. Screen readers and keyboard navigation follow DOM order, not visual order (WCAG 1.3.2 A).
- Box spacing tokens use `rem` units and scale with user font-size settings. Content inside Box must reflow at 320px viewport width without horizontal scrolling (WCAG 1.4.10 AA).

## Content

- Box provides spacing and structure. It does not set font size, line height, weight, or color. Do not apply inline text styles to Box. Use styling options in Text, Heading, or Label.

## Migrating from Sanity UI 3

Box in the new system replaces the `@sanity/ui` Box. The core purpose is the same — a general-purpose layout container. The API changes are:


### Key differences

- UI 4 components use CSS classes with a static stylesheet as opposed to `styled-components`.
- Box no longer uses `flex` shorthand. Use `flexGrow`, `flexShrink`, and `flexBasis` as separate props.
- Grid child props renamed: `column` → `gridColumn`, `row` → `gridRow`, etc.
- Box’s `display` prop no longer accepts `'flex'` or `'grid'`. Use the Flex and Grid components.
- The new API has direct props for styling attributes such as width, height, position, and border, etc.
- UI 3 Box used `React.forwardRef`. The new version is a plain function component.


### Detailed list of differences


| **UI 3 prop** | **UI 4 prop** | **Notes** |
| --- | --- | --- |
| `display` | `display` | UI 3 accepted `'flex'` and `'grid'`. New Box restricts to `'block'`, `'inline-block'`, `'none'`. Use Flex or Grid for those display modes. |
| `flex={1}` | `flexGrow={1}` | UI 3 used a single `flex` shorthand. Split into `flexGrow`, `flexShrink`, `flexBasis`. |
| `overflow="hidden"` | `overflow="hidden"` | UI 3 accepted `'visible'`, `'hidden'`, `'auto'`. New adds `'scroll'` and `'clip'`. |
| `height="fill"` | `height="100%"` | UI 3 used named values (`'fill'`, `'stretch'`). New accepts any CSS string. |
| `sizing="border"` | — | Removed. Use CSS `box-sizing` via `style` if needed. |
| `column={2}` | `gridColumn="span 2"` | UI 3 used numeric shorthand. New uses CSS `grid-column` string syntax. |
| `row`, `rowStart`, `rowEnd` | `gridRow`, `gridRowStart`, `gridRowEnd` | Renamed with `grid` prefix. |
| `columnStart`, `columnEnd` | `gridColumnStart`, `gridColumnEnd` | Renamed with `grid` prefix. |
| — | `tone` | New. Sets a semantic background tint. |
| — | `toneLevel` | New. Controls tone intensity (`'muted'`, `'normal'`, `'strong'`). |
| — | `width`, `minWidth`, `maxWidth` | New. Accept any CSS string value. UI 3 Box had no width props. |
| — | `height`, `minHeight`, `maxHeight` | New. Accept any CSS string value. |
| — | `position` | New. Accepts `'absolute'`, `'fixed'`, `'relative'`, `'static'`, `'sticky'`. |
| — | `zIndex` | New. Accepts any number. |
| — | `border`, `borderTop`, etc. | New. Boolean props for themed borders. |
| — | `radius` | New. Border-radius from the design scale (0–6, `'full'`). |


### Breaking changes

- `display`** no longer accepts **`'flex'`** or **`'grid'`**.** Any `<Box display="flex">` or `<Box display="grid">` will silently render as `display: block`. Replace with `<Flex>` or `<Grid>`.
- `flex`** prop removed.** `<Box flex={1}>` does nothing. Replace with `<Box flexGrow={1}>`. For the full shorthand, split into `flexGrow`, `flexShrink`, and `flexBasis`.
- `height`** named values removed.** `height="fill"` and `height="stretch"` are no longer valid. Use `height="100%"` or `height="100vh"` instead.
- `sizing`** prop removed.** `<Box sizing="border">` does nothing. Use `style={{ boxSizing: 'border-box' }}` if needed.
- **Grid child props renamed.** `column`, `columnStart`, `columnEnd`, `row`, `rowStart`, `rowEnd` no longer work. Use `gridColumn`, `gridColumnStart`, `gridColumnEnd`, `gridRow`, `gridRowStart`, `gridRowEnd`.
- `margin`** no longer defaults to **`0`**.** UI 3 Box defaulted `margin` to `0`. The new Box has no margin default. If your layout relied on the implicit zero margin, add `margin={0}` explicitly.
- `styled-components`** no longer used.** The component uses CSS classes. Custom styled-components extensions like `styled(Box)` will not work. Use `className` and CSS instead.

### Codemod

A codemod is available to make the changes above less painful. To get started, run the following command with the path (or space delimited list of paths) to the file or directory you want to migrate.


`pnpx @sanity-labs/ui-poc-codemod latest:box --paths <paths> --toPackage @sanity-labs/ui-poc`



If a component instance cannot be migrated, includes ambiguous changes, or generally requires manual validation, the codemod will insert a comment prefixed with “UI-POC-CODEMOD TODO”.


## Related components

- **Flex**: Row or column layout with alignment and gap
- **Grid**: Two-axis layout for card grids and dashboards
- **Card**: Adds a visual surface with background, border, and tone


---

<!-- Tab: Code -->


---


# Code

Used for inline code snippets and multi-line code blocks.


[React component](https://github.com/sanity-labs/ui-poc/blob/main/packages/ui/src/components/code/)


## Basic example

**Source:** `@sanity-labs/ui-poc`


`import { Code } from '@sanity-labs/ui-poc'`


`<Code>const x = 1</Code>`



**Note:** Code requires `@sanity-labs/ui-poc/styles.css` to be imported once at your app's entry point. Without it, this component renders unstyled. See Getting Started for more info.


## API documentation


| **Prop** | **Description** | **Type** | **Accepted values** | **Default** | **Required** |
| --- | --- | --- | --- | --- | --- |
| `as` | HTML element or component to render. The defined element wraps an inner `<code>` tag | `'pre'` \| `'span'` | `'pre' \| 'span'` | `'pre'` | No |
| `language` | Refractor language for syntax highlighting | `string` | Any language registered with Refractor | — | No |
| `size` | Font size and line height from the code scale | `Responsive<0 \| 1 \| 2 \| 3 \| 4>` | `0`, `1`, `2`, `3`, `4` | `2` | No |
| `weight` | Font weight | `Responsive<FontWeight>` | `'regular'`, `'medium'`, `'semibold'`, `'bold'` | `'regular'` | No |
| `muted` | Reduces text opacity for de-emphasized content | `boolean` | `true`, `false` | `false` | No |
| `trim` | Applies `text-box-trim` to remove leading/trailing whitespace | `boolean` | `true`, `false` | `false` | No |

Code also forwards any standard `<pre>` attribute to the rendered element.


## Usage guidelines


### When to use

- Multi-line code blocks in documentation, changelogs, or developer-facing content.
- Short inline code snippets in tooltips or descriptions (standalone, not inside a sentence).
- Displaying API responses, file paths, or user-entered code strings.

### When not to use

- For body copy, captions, or UI labels. Use **Text** instead.
- For keyboard shortcuts. Use **KBD** instead.
- As an editable input. Code is display-only.

## Best practices


### Do

- Pass `language` when the code has a known type. Syntax highlighting aids reading.

### Don't

- Don't wrap Code in a Box with `style={{ fontFamily: 'monospace' }}`. Code already uses a system monospace stack.
- Don't add `onClick` or `tabIndex` to Code. It is not interactive.
- Don't set `maxWidth` with inline styles. Wrap Code in a `Box` with `maxWidth` instead.

## Variants


### Language (syntax highlighting)

When `language` is set, Code loads a syntax highlighter via `react-refractor`. It loads lazily — while loading, Code shows the unstyled string as a fallback. Register the language with Refractor before rendering. Unregistered languages fall back to plain text without an error.


`import { Code } from '@sanity-labs/ui-poc'`

`import { javascript } from 'refractor/lang/javascript'`

`import Refractor from 'react-refractor'`


`Refractor.registerLanguage(javascript)`


`<Code language="javascript">const greeting = 'hello'</Code>`



If the language is not registered with Refractor, Code renders plain `<code>` without throwing. When no `language` is set, Code skips Refractor entirely and renders immediately.


Token colors adapt to light and dark mode:


| **Token type** | **Light** | **Dark** |
| --- | --- | --- |
| Keywords | `--magenta-600` | `--magenta-400` |
| Strings | `--yellow-700` | `--yellow-400` |
| Functions | `--green-600` | `--green-400` |
| Numbers / booleans | `--purple-600` | `--purple-400` |
| Comments | `--gray-700` at 75% opacity | `--gray-400` at 75% opacity |
| Types / class names | `--cyan-600` | `--cyan-400` |
| Tags | `--red-700` | `--red-400` |
| Properties | `--blue-600` | `--blue-400` |


### Size

The code scale uses a monospace font stack at line-height 1.5. Values mirror the Text size scale.


| **Value** | **Font size** | **Use case** |
| --- | --- | --- |
| `0` | 10px | Dense tables, fine-print API values |
| `1` | 13px | Code next to `Text size={1}` |
| `2` | 16px | **Default** — standard body-level code blocks |
| `3` | 18.75px | Larger documentation contexts |
| `4` | 21.5px | Feature callouts, large-format code displays |


### Muted

`muted` reduces the code's visual contrast. Use it for secondary code that supports but does not compete with primary content.


`<Code muted>// optional, defaults to undefined</Code>`




### Weight


| **Value** | **CSS weight** | **Use case** |
| --- | --- | --- |
| `'regular'` | 400 | Standard code. The default. |
| `'medium'` | 500 | Slightly bolder — useful at small sizes. |
| `'semibold'` | 600 | Use with care. Monospace fonts render heavy weights poorly. |
| `'bold'` | 700 | Use with care at small sizes only. |


### Trim

`trim` applies CSS `text-box-trim` to remove extra whitespace above and below the block. Use it when aligning Code tightly with adjacent elements.


`<Code size={1} trim>path/to/file.ts</Code>`


## Accessibility

- Screen readers announce the text inside `<code>` but do not convey syntax highlighting colors. Do not rely on token colors to convey meaning.
- Code has no keyboard handling or focus management. Do not add `onClick` or `tabIndex`. Wrap in a Button or PressArea if the code needs a copy or select action.

## Related components

- **Text**: Body copy and UI labels
- **Heading**: Semantic page headings
- **KBD**: Keyboard shortcut display

## Migrating from Sanity UI 3

Code in UI 3 had flex layout props, and a `maxWidth` prop. These are removed in UI 4.


### Key differences

- `as` updated to accept `pre` and `span`.
- `maxWidth` removed. Use a wrapping `Box` for width constraints.
- Flex props removed. Code is a block typography element, not a flex container.
- `muted` prop added to reduce visual contrast for secondary code content.
- `trim` prop added to remove leading and trailing whitespace from the text box.
- Refractor enables when `language` is set. When no `language` is set, UI 4 skips Refractor entirely and renders immediately.

### Detailed list of differences


| **UI 3 prop** | **UI 4 prop** | **Notes** |
| --- | --- | --- |
| `size` | `size` | Same scale (`0`–`4`). Default is `2` in both versions. |
| `weight` | `weight` | Same. Default is `'regular'` in both versions. |
| `as` | — | The inner `<code>` tag can now be configured to render inside of a `<pre> `or` <span>`. |
| `maxWidth` | — | Removed. Wrap Code in `Box` with `maxWidth` instead. |
| Flex props | — | Removed. Code no longer extends flex layout props. |
| — | `muted` | New. Reduces visual contrast. |
| — | `trim` | New. Applies `text-box-trim` for precise vertical alignment. |


### Breaking changes

- `as` prop only accepts `pre` and `span`. `<Code as="div">` has no effect.
- `maxWidth` prop removed**.** `<Code maxWidth={4}>` does nothing. Wrap Code in a `Box` or `Container.`

`{/* UI 3 */}`

`<Code maxWidth={4}>...</Code>`


`{/* UI 4 */}`

`<Box maxWidth={4}>`

`  <Code>...</Code>`

`</Box>`



- Flex layout props removed. `display`, `gap`, and other flex props from UI 3 no longer apply to Code.


---

<!-- Tab: Container -->


---


# Container

A wrapper to constrain content to a maximum width and horizontally center.


[React component](https://github.com/sanity-labs/ui-poc/tree/main/packages/ui/src/components/container)


## Basic example

**Source:** `@sanity-labs/ui-poc`


`import { Container } from '@sanity-labs/ui-poc'`


`<Container contentSize={4}>`

`  <Box>This is a contained box</Box>`

`</Container>`

**Note:** Container requires `@sanity-labs/ui-poc/styles.css` to be imported once at your app's entry point. Without it, this component renders unstyled. See Getting Started for more info.


## API documentation

Container's own props are `as` and `contentSize`. Everything else it accepts comes from shared layout props.


| **Prop** | **Description** | **Type** | **Accepted values** | **Default** | **Required** |
| --- | --- | --- | --- | --- | --- |
| `as` | HTML element or component to render | `React.ElementType` | Any valid HTML tag or component (e.g. `'main'`, `'section'`, `'article'`) | `'div'` | No |
| `contentSize` | Maximum width of the container | `Responsive<ContainerSize>` | `0`, `1`, `2`, `3`, `4`, `5` | — | No |


#### contentSize scale


| **Value** | **Max width** |
| --- | --- |
| `0` | 320px |
| `1` | 640px |
| `2` | 960px |
| `3` | 1280px |
| `4` | 1600px |
| `5` | 1920px |


### Shared props

- Border
- Flex attributes
- Grid attributes
- Margin
- Overflow
- Padding
- Position
- Shadow
- Tone — applies a background color by default; if border props are used, the chosen tone will determine the border color
- Width and height
- Z index

## Usage guidelines


### When to use

- To display a content block that’s horizontally centered and limited to a maximum width.

### When not to use

- As a general container for content. Use **Box**, **Flex**, or **Grid** instead.
- As a visual container to group related content. Use **Card** instead.
- When the content should fill the full viewport width (e.g. application chrome, sticky headers). Use **Box** or **Flex** directly.
- As an interactive element.

## Best practices


### Do

- Use `contentSize` to pick a max-width from the design scale instead of setting `maxWidth` manually. The scale matches Sanity Studio's content-width tokens.
- Pair Container with other layout components (Stack, Flex with `flexDirection="column"`, Grid, etc.) for the inner content. Container handles horizontal centering only.
- Render Container as a semantic element via `as` when it represents the page's primary content region — typically `as="main"` or `as="article"`.

### Don't

- Don't nest Container components. The outer one already constrains the width; the inner one adds no value.
- Use caution before using `Box` with the `maxWidth` prop for a custom maximum width. Container’s content size options should work for most cases.


## Variants


### Tone


| **Value** | **Use for** |
| --- | --- |
| `'none'` | Sets background to the default system background color |
| `'neutral'` | Sets background to a light gray |
| `'primary'` | **Use with caution:** Brand or informational emphasis |
| `'positive'` | **Use with caution: **Success, confirmations |
| `'suggest'` | **Use with caution: **Suggestions, tips, AI-generated indicators |
| `'caution'` | **Use with caution:** Warnings, in-review states |
| `'critical'` | **Use with caution: **Errors, failed states, destructive actions |


## Accessibility

- **Layout only.** Container provides width constraint and centering. It does not add keyboard handling, focus management, or ARIA state. If you render Container as a semantic element via `as`, you are responsible for the behavior that element requires.
- **Semantic elements via **`as`**.** Container accepts an `as` prop. Use it to render semantic HTML when the content requires it:
  - `as="main"` — should appear once per page. Container is a natural fit for the page's primary content region.
  - `as="article"` — for self-contained content like a blog post.
  - `as="section"` — requires a heading child or `aria-label` to register as a landmark (WCAG 1.3.1 A).
  - `as="nav"` — requires `aria-label` when more than one `<nav>` exists on the page (WCAG 1.3.1 A).
  - `as="aside"` — should have `aria-label` when the role is not clear from context.
- **Behavioral elements.** Do not use `as` to render `<button>`, `<dialog>`, `<select>`, `<details>`, `<summary>`, or `<fieldset>`. Container does not fulfil the keyboard, focus, or ARIA contracts those elements require (WCAG 4.1.2 A). Use the matching Sanity UI component instead.

## Content

- **Container does not set text styles.** Container provides width constraint and centering. It does not set font size, line height, weight, or color. Use Text, Heading, or Label for text styling.

## Related components

- **Box**: General-purpose spacing and structure container without max-width centering
- **Flex**: Row or column layout with alignment and gap

## Migrating from Sanity UI 3

UI 3 of `@sanity/ui` shipped a `Container` component that extended `BoxProps` and added a single responsive `width` prop drawn from a numeric scale. It centered its children using `width: 100%` and `margin: 0 auto` baked into the base style.


`{/* UI 3 — Container with numeric width scale */}`

`import { Container } from '@sanity/ui'`


`<Container width={2} padding={4}>`

`  <ArticleBody />`

`</Container>`



The new Container keeps the same purpose but renames the responsive prop and trims the implicit defaults:


`{/* UI 4 — Container with contentSize prop */}`

`import { Container } from '@sanity-labs/ui-poc'`


`<Container contentSize={2} padding={4}>`

`  <ArticleBody />`

`</Container>`




### Key differences

- `width` replaced with `contentSize`. The responsive max-width prop is renamed.
- UI 3 defaulted to `width={2}` (640px). UI 4 has no default — Container with no `contentSize` has no max-width.
- UI 3 hard-coded `margin: 0 auto`. UI 4 keeps the same default but as an overridable prop.
- No implicit `width: 100%`. UI 4 leaves `width` alone; pass it explicitly if you need it.
- `contentSize={5}` is new — it adds a 1920px step beyond UI 3's largest 1600px option.
- Added `as` prop. Use `as="main"` / `as="article"` directly. UI 3 required `forwardedAs` via styled-components.


| **UI 3 prop** | **UI 4 prop** | **Notes** |
| --- | --- | --- |
| `width` default `2` | `contentSize` has no default | UI 4 Container has no default `contentSize` — set one explicitly when you want a max-width. |
| Implicit `width: 100%` (CSS) | — | UI 4 does not set `width` at all. Add `width="100%"` only if you need explicit fill behavior. |
| Implicit `margin: 0 auto` | `marginX="auto"` (default) | UI 4 keeps the centering default but exposes it as a prop you can override. |
| All `BoxProps` (padding, margin, tone, border, etc.) | All `LayoutProps` | UI 4 Container still inherits the full layout-prop surface (padding, margin, sizing, border, overflow, position, tone, flex-child, grid-child). |
| `forwardRef`, `styled-components` | Plain function component, CSS classes | UI 4 is a regular function component using static CSS classes. `styled(Container)` extensions from UI 3 will not work. |
| — | `as` prop | UI 4 Container accepts `as` directly to render any element type (e.g. `as="main"`, `as="article"`). UI 3 used `forwardedAs` via `styled-components`. |


### Breaking changes

- `width`** prop renamed to **`contentSize`**.** `<Container width={2}>` no longer accepts a numeric scale value. Use `<Container contentSize={2}>`. UI 4 `width` accepts CSS strings only (e.g. `width="100%"`) — passing a number is invalid.
- **Implicit **`width: 100%`** removed.** UI 3 baked `width: 100%` into the base style. UI 4 does not. The component fills the parent via the default `<div>` block-level behavior; if you relied on the implicit fill on a non-block parent, set `width="100%"` explicitly.
- `width="auto"`** no longer needed.** UI 3 used `width="auto"` to opt out of any max-width. In UI 4, omit the `contentSize` prop entirely.
- **Numeric scale shift.** UI 3 used `1`–`5`. UI 4 uses `0`–`5` and adds a `5` step at 1920px. The pixel values for the overlapping range (`1`–`5`) are unchanged, but a UI 3 `width={1}` (320px) maps to UI 4 `contentSize={0}`. Audit any literal `width={N}` migrations.


---

<!-- Tab: Flex -->


---


# Flex

The lowest-level building block for laying out UI elements.


[React component](https://github.com/sanity-labs/ui-poc/tree/main/packages/ui/src/components/flex)


## Basic example

**Source:** `@sanity-labs/ui-poc`


`import { Flex } from '@sanity-labs/ui-poc'`


`<Flex gap={3}>`

`  <span>Item 1</span>`

`  <span>Item 2</span>`

`</Flex>`

**Note:** Flex requires `@sanity-labs/ui-poc/styles.css` to be imported once at your app's entry point. Without it, this component renders unstyled. See Getting Started for more info.


## API documentation

Flex's own props are `as`, `display`, and the flexbox related props below.


| **Prop** | **Description** | **Type** | **Values** | **Default** | **Required** |
| --- | --- | --- | --- | --- | --- |
| `as` | HTML element or component to render | `React.ElementType` | Any valid HTML tag or component (e.g. `'nav'`, `'main'`, `'section'`) | `'div'` | No |
| `display` | CSS `display` property | `Responsive<DisplayFlex>` | `'flex'`, `'inline-flex'`, `'none'` | `'flex'` | No |
| `flexDirection` | CSS `flex-direction` | `Responsive<FlexDirection>` | `'row'`, `'row-reverse'`, `'column'`, `'column-reverse'` | — | No |
| `flexWrap` | CSS `flex-wrap` | `Responsive<FlexWrap>` | `'wrap'`, `'wrap-reverse'`, `'nowrap'` | — | No |
| `alignItems` | CSS `align-items` | `Responsive<AlignItems>` | `'baseline'`, `'center'`, `'flex-end'`, `'flex-start'`, `'stretch'` | — | No |
| `justifyContent` | CSS `justify-content` | `Responsive<JustifyContent>` | `'flex-start'`, `'flex-end'`, `'center'`, `'space-between'`, `'space-around'`, `'space-evenly'` | — | No |


All flexbox related props support responsive arrays (e.g. `flexDirection={['column', null, 'row']}`).


### Shared props

- Border
- Flex attributes
- Gap
- Grid attributes
- Margin
- Overflow
- Padding
- Position
- Shadow
- Tone — applies a background color by default; if border props are used, the chosen tone will determine the border color
- Width and height
- Z index

## Usage guidelines


### When to use

- To stack items vertically or horizontally. Flex defaults to horizontal direction.
- To control alignment: center children, space them apart, or push one to the end.
- To lay items in a column with alignment or wrap control. Use `flexDirection="column"` when you need more control than Stack provides.
- To create responsive layouts that change direction at breakpoints: `flexDirection={['column', , 'row']}`.

### When not to use

- To stack items in a simple vertical column with even spacing. Use **Stack** instead.
- To create a two-axis grid. Use **Grid** instead.
- To wrap a single child with spacing or visual styling. Use **Box** instead.
- To flow inline items that wrap to the next line. Use **Inline** instead.

## Best practices


### Do

- Bias towards horizontally start-aligned content over center alignment. Most interface elements with Sanity are start aligned–most notably menus and navigational elements. Only use center alignment to create visual distinction/emphasis–such as an empty state.
- Consider responsive breakpoints when stacking items horizontally. If the number of items can vary, pair `flexWrap="wrap"` with `gap={2}` to prevent clipping and maintain spacing.

### Don't

- Don't use inline styles to create specific UI elements. If you find yourself setting `width`, `height`, `borderRadius`, `background`, `color`, `fontSize`, `fontWeight`, or `cursor` as inline styles on a `Flex` or `Box`, stop. You're likely reinventing a component that already exists. Check whether `Avatar`, `Badge`, `Button`, or `Card` with appropriate props covers your use case. See "All available props" at the bottom for the complete reference.
- Don't rely on `row-reverse` or `column-reverse` as a way to change sort order or logical order of items. These direction settings only change the visual layer. They will not impact tab index or how screen readers interpret Flex items.
- Don’t add onClick to Flex. Flex is not intended to be an interactive element.

## Content

Flex provides layout structure and alignment. It does not set font size, line height, weight, or color. Do not apply inline text styles to Flex. Use styling options in Text, Heading, or Label.


## Accessibility

- Flex provides layout along an axis. It does not add keyboard handling, focus management, or ARIA state. If you render Flex as a semantic element via `as`, you are responsible for the behavior that element requires.
- Flex accepts an `as` prop. Use it to render semantic HTML when the content requires it:
  - `as="nav"` — requires `aria-label` when more than one `<nav>` exists on the page (WCAG 1.3.1 A).
  - `as="section"` — requires a heading child or `aria-label` to register as a landmark (WCAG 1.3.1 A).
  - `as="form"` — requires an accessible name via `aria-label`, `aria-labelledby`, or `<legend>` (WCAG 1.3.1 A).
  - `as="main"` — should appear once per page.
  - `as="aside"` — should have `aria-label` when the role is not clear from context.
- Do not use `as` to render `<button>`, `<dialog>`, `<select>`, `<details>`, `<summary>`, or `<fieldset>`. Flex does not fulfill the keyboard, focus, or ARIA contracts those elements require (WCAG 4.1.2 A). Use the matching Sanity UI component instead.
- When rendering `as="ul"` or `as="ol"`, add `role="list"` if `list-style: none` is applied. WebKit strips list semantics without it (WCAG 1.3.1 A). Children must be `<li>` elements.
- Do not use `flex-direction: row-reverse` or `flex-direction: column-reverse` when children contain interactive or readable content. Do not use CSS `order` on Flex children. Screen readers and keyboard navigation follow DOM order, not visual order (WCAG 1.3.2 A, WCAG 2.4.3 A). If visual reordering cannot be avoided, confirm the DOM order produces a logical reading sequence.


## Migrating from Sanity UI 3

Flex in the new system replaces the `@sanity/ui` Flex. The core layout behavior is the same.


### Key differences

- UI 4 components use CSS classes with a static stylesheet as opposed to `styled-components`.
- Props are named to match their CSS equivalents. `direction` → `flexDirection`, `align` → `alignItems`, `justify` → `justifyContent`, `wrap` → `flexWrap`.
- The new Flex defaults `display` to `'flex'` explicitly.
- The new API has direct props for styling attributes such as width, height, position, and border, etc.
- `gapX`/`gapY` props renamed to** **`columnGap` and `rowGap`.

### Detailed list of differences


| **UI 3 prop** | **UI 4 prop** | **Notes** |
| --- | --- | --- |
| `direction="column"` | `flexDirection="column"` | Renamed from `direction` to `flexDirection`. |
| `align="center"` | `alignItems="center"` | Renamed from `align` to `alignItems`. |
| `justify="space-between"` | `justifyContent="space-between"` | Renamed from `justify` to `justifyContent`. |
| `wrap="wrap"` | `flexWrap="wrap"` | Renamed from `wrap` to `flexWrap`. |
| `flex={1}` | `flexGrow={1}` | UI 3 used a `flex` shorthand on Box. Split into `flexGrow`, `flexShrink`, `flexBasis`. |
| — | `rowGap`, `columnGap` | New. Separate row and column gap control. |
| — | `tone`, `toneLevel` | New. Semantic background tint. |
| — | `width`, `minWidth`, `maxWidth` | New. Accept any CSS string. |
| — | `position`, `zIndex` | New. |
| — | `border`, `radius` | New. |


### Breaking changes

- `direction`** renamed to **`flexDirection`**.** `<Flex direction="column">` does nothing. Use `<Flex flexDirection="column">`.
- `align`** renamed to **`alignItems`**.** `<Flex align="center">` does nothing. Use `<Flex alignItems="center">`.
- `justify`** renamed to **`justifyContent`**.** `<Flex justify="space-between">` does nothing. Use `<Flex justifyContent="space-between">`.
- `wrap`** renamed to **`flexWrap`**.** `<Flex wrap="wrap">` does nothing. Use `<Flex flexWrap="wrap">`. This is the most common source of 320px reflow failures.
- `flex`** prop removed.** `<Flex flex={1}>` does nothing. Use `flexGrow={1}`, `flexShrink={1}`, `flexBasis="0"` separately.
- `styled-components`** no longer used.** Custom styled-components extensions like `styled(Flex)` will not work.


### Codemod


A codemod is available to make the changes above less painful. To get started, run the following command with the path (or space delimited list of paths) to the file or directory you want to migrate.


`pnpx @sanity-labs/ui-poc-codemod latest:flex --paths <paths> --toPackage @sanity-labs/ui-poc`



If a component instance cannot be migrated, includes ambiguous changes, or generally requires manual validation, the codemod will insert a comment prefixed with “UI-POC-CODEMOD TODO”.


## Related components

- **Box**: Simpler container for spacing and structure
- **Grid**: Two-axis layout for card grids and dashboards
- **Stack**: Vertical list with even spacing between items

---

<!-- Tab: Grid -->


---


# Grid

Renders a grid layout container.


[React component](https://github.com/sanity-labs/ui-poc/tree/main/packages/ui/src/components/grid)


## Basic example

**Source:** `@sanity-labs/ui-poc`


`import { Grid } from '@sanity-labs/ui-poc'`


`<Grid columns={2} gap={4}>`

`  <div>Item 1</div>`

`  <div>Item 2</div>`

`  <div>Item 3</div>`

`  <div>Item 4</div>`

`</Grid>`


**Note:** Grid requires `@sanity-labs/ui-poc/styles.css` to be imported once at your app's entry point. Without it, this component renders unstyled. See Getting Started for more info.


## API documentation

Grid's own props are `as`, `display`, and the grid related props below. All grid related props support responsive arrays (e.g. `gridTemplateColumns={['1fr', '1fr 1fr', 'repeat(3, 1fr)']}`).


| **Prop** | **Description** | **Type** | **Values** | **Default** | **Required** |
| --- | --- | --- | --- | --- | --- |
| `as` | HTML element or component to render | `React.ElementType` | Any valid HTML tag or component | `'div'` | No |
| `display` | CSS `display` property | `Responsive<DisplayGrid>` | `'grid'`, `'inline-grid'`, `'none'` | `'grid'` | No |
| `gridAutoFlow` | How auto-placed items flow into the grid | `Responsive<GridAutoFlow>` | `'row'`, `'column'`, `'row dense'`, `'column dense'`, `'dense'` | — | No |
| `gridAutoColumns` | Size of implicitly created columns | `Responsive<string>` | Any CSS value | — | No |
| `gridAutoRows` | Size of implicitly created rows | `Responsive<string>` | Any CSS value | — | No |
| `gridTemplateColumns` | Column track sizing | `Responsive<string>` | Any CSS value (e.g. `'1fr 1fr'`, `'repeat(3, 1fr)'`) | — | No |
| `gridTemplateRows` | Row track sizing | `Responsive<string>` | Any CSS value | — | No |


### Shared props

- Border
- Flex attributes
- Gap
- Grid attributes
- Margin
- Overflow
- Padding
- Position
- Shadow
- Tone — applies a background color by default; if border props are used, the chosen tone will determine the border color
- Width and height
- Z index

## Usage guidelines


### When to use

- To display non-tabular content in multiple rows and columns
- To build fixed-column layouts where items should align on a shared grid (dashboards, card grids, settings panels)
- When you need precise control over row and column sizing, spanning, or placement
- To implement responsive multi-column layouts where the number of columns changes at different breakpoints

### When not to use

- When content flows in a single direction. Use **Flex** for a flexible one-dimensional, vertical/horizontal layout. Use **Stack/Inline** for a vertical/horizontal layout with more opinionated defaults.
- When you need inline wrapping of variable-width items (ex: badges, buttons, etc.). Use **Inline** instead.
- When you need to constrain and center content at a max width. Use **Container** — it sets `max-width` and centers itself.

## Best practices


### Do

- Use `gridTemplateColumns` with `repeat()` and `minmax()` or `fr` units to build layouts that adapt gracefully to available space
- Use the responsive prop array (e.g. `gridTemplateColumns={["1fr", "1fr 1fr", "repeat(3, 1fr)"]}`) to adjust column count at breakpoints instead of writing media queries by hand
- Use `gap` (or `gapX` / `gapY`) over padding or margin on children to control spacing between grid cells
- Prefer `gridColumn` and `gridRow` on child Box elements to span items across cells, keeping placement logic close to the content that needs it

### Don't

- Don't use `style` to adjust visual attributes of `Grid` when a style prop exists. Using `style` should be reserved for unsupported CSS rules. See "All available props" at the bottom of this document for the complete reference.
- Don't use CSS `order`, `gridColumn`, or `gridRow` to visually reorder items away from their DOM order. Screen readers and keyboard navigation follow DOM order, not visual order — reordering with CSS silently breaks reading and focus sequence for non-sighted users (WCAG 1.3.2 A).
- Don't hardcode pixel values in `gridTemplateColumns` or `gridTemplateRows` when `fr`, `minmax()`, or `auto` would give you a more resilient layout.


## Accessibility

- Grid provides spatial structure. It does not add keyboard handling, focus management, or ARIA state. If you render Grid as a semantic element via `as`, you are responsible for the behavior that element requires.
- CSS grid placement (`gridColumn`, `gridRow`, `gridAutoFlow: "column dense"`) can visually reorder items without touching the DOM. Screen readers and keyboard users follow DOM order, not visual order. Never use grid placement to change the logical reading or focus sequence — keep visual order and DOM order in sync (WCAG 1.3.2 A).
- `gridAutoFlow: "row dense"` and `"column dense"` fill holes in the grid by pulling later items forward. This produces a visual order that can diverge significantly from DOM order. Only use dense packing for purely decorative or non-interactive content (e.g., image mosaics) where reading order does not matter.
- Grid accepts an `as` prop. Use it to render semantic HTML when the content requires it. Requirements match Box:
  - `as="ul"` requires `<li>` children and `role="list"` when `list-style: none` is applied.
  - `as="nav"` requires `aria-label` when more than one `<nav>` exists on the page.
  - `as="section"` requires a heading or `aria-label` to register as a landmark (WCAG 1.3.1 A).
- Grid gap tokens use `rem` units and scale with the user's font-size setting. Do not use fixed `px` values for gap or sizing where token values exist — fixed values break spacing proportionality at large text sizes.
- If Grid is used for an interactive widget (calendar, data grid, color picker), you must implement the WAI-ARIA grid pattern yourself. This means `role="grid"` with `role="row"` and `role="gridcell"` children, roving tabindex, and full keyboard navigation. Grid the component provides none of this. See the [WAI-ARIA Authoring Practices Guide for the ](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)[grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)[ pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).

## Content

Grid provides spatial structure. It does not set font size, line height, weight, or color. Do not apply inline text styles to Grid. Use styling options in Text, Heading, or Label.


## Migrating from Sanity UI 3

Grid in the new system replaces the `@sanity/ui` Grid. The core grid layout behavior is the same.


### Key differences

- UI 4 components use CSS classes with a static stylesheet as opposed to `styled-components`.
- `columns` and `rows` props have been removed. Use `gridTemplateColumns` and `gridTemplateRows` with CSS grid syntax. `columns={3}` becomes `gridTemplateColumns="repeat(3, 1fr)"`.
- Props are named to match their CSS equivalents. `autoRows` → `gridAutoRows`, `autoCols` → `gridAutoColumns`, `autoFlow` → `gridAutoFlow`, `gapX` → `columnGap`, `gapY` → `rowGap`. On child elements: `column` → `gridColumn`, `row` → `gridRow`, `columnStart` → `gridColumnStart`, etc.
- Responsive arrays work on grid-related props. Use `gridTemplateColumns={['1fr', null, '1fr 1fr', 'repeat(3, 1fr)']}` for responsive column counts.


### Detailed list of differences


| **UI 3 prop** | **UI 4 prop** | **Notes** |
| --- | --- | --- |
| `columns={3}` | `gridTemplateColumns="repeat(3, 1fr)"` | UI 3 accepted a number. The new version uses the CSS `grid-template-columns` string. |
| `rows={2}` | `gridTemplateRows="repeat(2, 1fr)"` | Same change — numeric shorthand replaced by CSS string. |
| `autoRows="min"` | `gridAutoRows="min-content"` | UI 3 used shorthand values (`'min'`, `'max'`, `'fr'`). New uses CSS values. |
| `autoCols="auto"` | `gridAutoColumns="auto"` | Renamed from `autoCols` to `gridAutoColumns`. |
| `autoFlow="column"` | `gridAutoFlow="column"` | Renamed from `autoFlow` to `gridAutoFlow`. |
| `gapX={2}` | `columnGap={2}` | Renamed from `gapX` to `columnGap`. |
| `gapY={4}` | `rowGap={4}` | Renamed from `gapY` to `rowGap`. |
| — | `tone`, `toneLevel` | New. Semantic background tint. |
| — | `width`, `minWidth`, `maxWidth` | New. Accept any CSS string. |
| — | `position`, `zIndex` | New. |
| — | `border`, `radius` | New. |


### Breaking changes

- `columns`** prop removed.** `<Grid columns={3}>` does nothing. Use `<Grid gridTemplateColumns="repeat(3, 1fr)">`.
- `rows`** prop removed.** `<Grid rows={2}>` does nothing. Use `<Grid gridTemplateRows="repeat(2, 1fr)">`.
- `autoRows`** renamed to **`gridAutoRows`**.** The old prop name does nothing.
- `autoCols`** renamed to **`gridAutoColumns`**.** The old prop name does nothing.
- `autoFlow`** renamed to **`gridAutoFlow`**.** The old prop name does nothing.
- `gapX`** renamed to **`columnGap`**.** The old prop name does nothing.
- `gapY`** renamed to **`rowGap`**.** The old prop name does nothing.
- **Grid child props renamed on child elements.** `column` → `gridColumn`, `row` → `gridRow`, `columnStart` → `gridColumnStart`, `columnEnd` → `gridColumnEnd`, `rowStart` → `gridRowStart`, `rowEnd` → `gridRowEnd`. The old names do nothing.
- `styled-components`** no longer used.** Custom styled-components extensions like `styled(Grid)` will not work.

### Codemod


A codemod is available to make the changes above less painful. To get started, run the following command with the path (or space delimited list of paths) to the file or directory you want to migrate.


`pnpx @sanity-labs/ui-poc-codemod latest:grid --paths <paths> --toPackage @sanity-labs/ui-poc`



If a component instance cannot be migrated, includes ambiguous changes, or generally requires manual validation, the codemod will insert a comment prefixed with “UI-POC-CODEMOD TODO”.


## Related components

- **Flex**: One-axis layout for rows or columns
- **Box**: Single container for spacing and structure

---

<!-- Tab: Text -->


---


# Text

Displays body paragraphs, captions, and metadata.


[React component](https://github.com/sanity-labs/ui-poc/tree/main/packages/ui/src/components/text)


## Basic example

**Source:** `@sanity-labs/ui-poc`


`import { Text } from '@sanity-labs/ui-poc'`


`<Text>Body text rendered as a paragraph.</Text>`

**Note:** Text requires `@sanity-labs/ui-poc/styles.css` to be imported once at your app's entry point. Without it, this component renders unstyled. See Getting Started for more info.


## API documentation


| **Prop** | **Description** | **Type** | **Values** | **Default** | **Required** |
| --- | --- | --- | --- | --- | --- |
| `as` | HTML element to render | `React.ElementType` | Any valid HTML tag (e.g. `'span'`, `'label'`, `'li'`) | `'span'` | No |
| `size` | Font size and line height from the body text scale | `Responsive<0 \| 1 \| 2 \| 3 \| 4>` | `0`, `1`, `2`, `3`, `4` | `2` | No |
| `weight` | Font weight | `Responsive<FontWeight>` | `'regular'`, `'medium'`, `'semibold'`, `'bold'` | — | No |
| `align` | Text alignment | `Responsive<TextAlign>` | `'left'`, `'center'`, `'right'`, `'justify'` | — | No |
| `muted` | Applies a muted color to the text; if `tone` is set, applies the corresponding muted tone color. | `boolean` | `true`, `false` | `false` | No |
| `trim` | Applies `text-box-trim` to remove leading/trailing whitespace from the text box | `boolean` | `true`, `false` | `false` | No |
| `lineClamp` | Clamp to N visible lines using CSS `-webkit-line-clamp` | `Responsive<number>` | Any positive number | — | No |


### Shared props

- Margin
- Tone — applies a semantic text color; if `muted` is set, applies a muted text color.


## Usage guidelines


### When to use

- Body copy, descriptions, captions, and metadata. Any text that is not a heading should use Text.

### When not to use

- To label a section within a Menu, side panel, or above headings. Use **Label** instead.
- To establish page structure (page title, section header). Use **Heading** instead.
- To denote a keyboard shortcut. Use **KBD** instead.
- For inline or block code samples. Use **Code** instead.
- As a clickable link. Wrap in a link component or anchor tag.

## Best practices


### Do

- Left-align text in most cases. Sanity's typographic system prefers left-aligned body copy.
- Use `muted` for secondary or helper text (timestamps, captions, metadata).
- Use responsive arrays (e.g. `size={[1, null, 2]}`) to keep text readable across viewports.
- Aim for 55–70 characters per line in multiline blocks for best legibility.
- Use `lineClamp={1}` when text needs to be limited to one line.

### Don't

- Don't center-align long blocks of paragraph text. This disrupts reading flow and is difficult for users with dyslexia.
- Don't rely on color alone to convey importance. Pair with an icon or badge instead.
- Don't italicize or underline for emphasis. Use the `weight` prop.
- Don't truncate text unless absolutely needed. Truncation hides information and creates friction.
- Don’t use `tone` purely for accentuation. Tone is intended to communicate semantic meaning. Use the `weight` prop instead.

## Variants


### Align


| **Value** | **Use for** |
| --- | --- |
| `'left' `**(default)** | Body copy, UI labels, etc. — the default alignment. |
| `'center'` | Rare. Empty state copy. Labels inside centered UI elements. |
| `'right'` | Numeric data in table cells. RTL body copy. |
| `'justify'` | Rarely appropriate in UI. May cause uneven word spacing at narrow widths. |


### Line clamp (truncation)

`lineClamp `allows content within Text to have a line limit before it’s truncated. Typical single-line truncation would be set by: `lineClamp={1}`. Truncation is a last resort and truncated text should always be made available via a `Tooltip` or `title` attribute. Use cases:

- Captions in a grid where wrapping would cause irregular row heights.
- User-generated or machine-generated text with unpredictable length.
- UUIDs or long strings in compact areas.

### Muted

`muted` reduces the text's visual prominence by lowering its color intensity. Use it for secondary content that supports but does not compete with the primary text.


### Size


| **Value** | **Description** | **Use for** |
| --- | --- | --- |
| `0` | Smallest | Fine print, legal text, high-density layouts |
| `1` | Small | UI labels (buttons, menu items, tabs), toast messages, empty states |
| `2 `**(default)** | Medium | Content editing text (fields, selects), calls to action |
| `3` | Large | Rarely needed. Most uses are better served by Heading. |
| `4` | Extra large | Rarely needed. Most uses are better served by Heading. |


### Tone

`tone `provides the ability to assign a semantic color to text. This should be used to reinforce the meaning/purpose of text in important situations, such as error messages or information tips. Make sure to pair text with an icon so communicating semantic meaning does not rely on color alone.


| **Tone** | **Use for** | **Appropriate icon pairing** |
| --- | --- | --- |
| `'neutral' `**(default)** | No semantic meaning | – |
| `'primary'` | Informational or educational | `InfoOutlineIcon` |
| `'suggest'` | Suggestions or recommendations | `InfoOutlineIcon` |
| `'positive'` | Success, published, healthy | `CheckmarkIcon` |
| `'caution'` | Needs attention, in review | `WarningOutlineIcon` |
| `'critical'` | Error, failed, rejected | `ErrorOutlineIcon` |


### Trim

`trim` applies CSS `text-box-trim` to remove extra whitespace above and below the text box. Use it when precise vertical alignment with adjacent elements matters (e.g., aligning text baseline with an icon or badge).


`<Text size={1} trim>Trimmed text</Text>`


### Weight


| **Value** | **Use for** |
| --- | --- |
| `'regular' `**(default)** | General body text. The default for text above `size={0}`. |
| `'medium'` | Visual separation from body copy. Improves legibility at small sizes. |
| `'semibold'` | Emphasis within body copy. Labels in custom interactive components. |
| `'bold'` | Strong emphasis at `size={0}` to aid legibility at the smallest size. |


## Accessibility

- Text defaults to `<span>`. Use `as="p"` when the text should serve as a paragraph. Use `as="li"` inside lists.
- Text must maintain 4.5:1 contrast against the background for standard text and 3:1 for large text (WCAG 1.4.3 AA). Be careful with `muted` on non-white backgrounds.
- Do not use color as the only way to indicate status. Always pair with text labels or icons.
- Text must remain legible at 200% browser zoom. Avoid fixed pixel units in overrides.

## Content

- Use sentence case for UI labels and body text (e.g., "Edit profile" not "Edit Profile").
- Avoid jargon, acronyms, and complex sentences. Use plain-spoken and direct language.
- Be succinct. Users scan text rather than reading word-for-word.
- Frame instructions as actionable steps, not passive descriptions.


## Migrating from Sanity UI 3

Text in the new system has a different default element and new typography props. **Text no longer removes top/bottom text spacing by default. Use **`trim`** to emulate Sanity UI 3’s vertical trimming style.**


### Key differences

- UI 4 components use CSS classes with a static stylesheet as opposed to `styled-components`.
- UI 3 Text rendered a `<div>` by default. The new Text renders `<span>`. Use `as="p"` when Text is long-form or block-level content.
- `textOverflow` replaced by `lineClamp`. Use `lineClamp={1}` for single-line truncation.
- `accent` removed. Use `tone` or a parent with a semantic tone for colored text.
- `trim`  added to optionally remove leading/trailing whitespace from the text box.
- Margin props added. Text now accepts `margin`, `marginX`, `marginY`, and per-side margin props.

### Detailed list of differences


| **UI 3 prop** | **UI 4 prop** | **Notes** |
| --- | --- | --- |
| `accent` | — | Removed. No accent color prop. |
| `textOverflow="ellipsis"` | `lineClamp={1}` | UI 3 used `textOverflow`. Use `lineClamp` for line clamping. |
| — | `trim` | New. Applies `text-box-trim` for precise vertical alignment. |
| — | `lineClamp` | New. Clamp to N visible lines. Supports multi-line truncation. |
| — | `margin*` | New. Text accepts margin props directly. |


### Breaking changes

- `textOverflow` prop removed.** **`<Text textOverflow="ellipsis">` does nothing. Use `<Text lineClamp={1}>`.
- `accent` prop removed. `<Text accent>` does nothing. Use Card `tone` or a parent element with a semantic tone.
- `styled-components` no longer used. Custom styled-components extensions like `styled(Text)` will not work.
- Text now renders as `<span>` by default instead of `<div>`

### Codemod


A codemod is available to make the changes above less painful. To get started, run the following command with the path (or space delimited list of paths) to the file or directory you want to migrate.


`pnpx @sanity-labs/ui-poc-codemod latest:text --paths <paths> --toPackage @sanity-labs/ui-poc`



If a component instance cannot be migrated, includes ambiguous changes, or generally requires manual validation, the codemod will insert a comment prefixed with “UI-POC-CODEMOD TODO”.


## Related components

- **Heading**: Semantic page headings that define content hierarchy
- **Badge**: Inline status labels with semantic tone

---

<!-- Tab: Heading -->


---


# Heading

Displays heading text to create logical hierarchy and page structure.


[React component](https://github.com/sanity-labs/ui-poc/tree/main/packages/ui/src/components/heading)


## Basic example

**Source:** `@sanity-labs/ui-poc`


`import { Heading } from '@sanity-labs/ui-poc'`


`<Heading size={3}>Page Title</Heading>`

**Note:** Heading requires `@sanity-labs/ui-poc/styles.css` to be imported once at your app's entry point. Without it, this component renders unstyled. See Getting Started for more info.


## API documentation


| **Prop** | **Description** | **Type** | **Values** | **Default** | **Required** |
| --- | --- | --- | --- | --- | --- |
| `as` | Semantic heading element to render. Always set this explicitly. | `'h1'` \| `'h2'` \| `'h3'` \| `'h4'` \| `'h5'` \| `'h6'` | `'h1'`, `'h2'`, `'h3'`, `'h4'`, `'h5'`, `'h6'` | `'h2'` | No |
| `size` | Visual font size from the heading text scale. Independent of `as`. | `Responsive<0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9>` | `0`–`9` | `2` | No |
| `weight` | Font weight | `Responsive<FontWeight>` | `'regular'`, `'medium'`, `'semibold'`, `'bold'` | `'bold'` | No |
| `align` | Text alignment | `Responsive<TextAlign>` | `'left'`, `'center'`, `'right'`, `'justify'` | — | No |
| `muted` | Applies a muted color to the heading; if `tone` is set, applies the corresponding muted tone color. | `boolean` | `true`, `false` | `false` | No |
| `trim` | Applies `text-box-trim` to remove leading/trailing whitespace from the text box | `boolean` | `true`, `false` | `false` | No |
| `lineClamp` | Clamp to N visible lines using CSS `-webkit-line-clamp`. Use instead of inline overflow styles. | `Responsive<number>` | Any positive number | — | No |


### Shared props

- Margin
- Tone — applies a semantic text color; if `muted` is set, applies a muted text color.

## Usage guidelines


### When to use

- To establish the semantic structure of a page (page title, section header, subsection).
- To group text and elements into logical, navigable sections.

### When not to use

- For large decorative text that does not define a section. Use **Text** with a `size` prop instead.
- To emphasize text inside a paragraph. Use **Text** with `weight="bold"`.

## Best practices


### Do

- Use a logical hierarchy. Start with `as="h1"` for the page title and descend to `as="h2"`, `as="h3"`, etc., based on content depth.
- Always set `as` explicitly. The component defaults to `<h2>`, but each Heading should be set to reflect its content hierarchy.
- Use `size` to control visual appearance independently of the semantic level. A sidebar heading can be `as="h2" size={0}` (small text, correct hierarchy).
- Use `size={0}` or `size={1}` for headings in UI chrome (toolbars, sidebars). Reserve larger sizes for content headings.
- Left-align headings for easier reading. This gives the eye a consistent starting edge.

### Don't

- Don't skip heading levels (e.g., jumping from `as="h1"` to `as="h4"`). Use `size` to adjust visuals while keeping the hierarchy correct. Screen readers build a table of contents from headings. A gap signals missing sections and confuses navigation.
- Don't center-align headings, especially long ones. This disrupts reading flow and is difficult for users with dyslexia.
- Don't use Heading for visual differentiation alone. Headings are semantic. Use Text with `weight="semibold"` or `size` for visual emphasis that doesn't affect the heading hierarchy.
- Don't use inline `style` for overflow or truncation. Use `lineClamp={1}` for single-line clamping.

## Variants


### Align


| **Value** | **Use for** |
| --- | --- |
| `'left' `**(default)** | Titles, section headings, group headings — the default alignment. |
| `'center'` | Rare. Empty state titles. |
| `'right'` | Rarely appropriate in UI. |
| `'justify'` | Rarely appropriate in UI. May cause uneven word spacing at narrow widths. |


### Line clamp (truncation)

`lineClamp `allows content within Heading to have a line limit before it’s truncated. Typical single-line truncation would be set by: `lineClamp={1}`. Truncation is a last resort and truncated text should always be made available via a `Tooltip` or `title` attribute. Use cases:

- Headings in a grid where wrapping would cause irregular row heights.
- Titles on mobile devices where the full text may not fit the width provided.

### Muted

`muted` reduces the text's visual prominence by lowering its color intensity. Use it for secondary headings that need to be present for structure but should not compete with the primary heading for attention.


`<Heading as="h3" muted>Additional details</Heading>`


### Size


| **Value** | **Description** | **Use for** |
| --- | --- | --- |
| `0` | Smallest | UI chrome headings — toolbars, sidebars, compact panels |
| `1` | Small | Content sub-section titles |
| `2 `**(default)** | Medium | Standard section headings |
| `3` | Large | Document titles in high-density layouts |
| `4` | Extra large | Document titles in moderate-density layouts |
| `5` | Largest named size | Document titles in low-density layouts (e.g., Canvas) |
| `6`–`9` | Display sizes | Reserved for large display text. Rarely used. |


### Tone

`tone `provides the ability to assign a semantic color to text. This should be used to reinforce the meaning/purpose of text in important situations, such as error messages or information tips. Make sure to pair text with an icon so communicating semantic meaning does not rely on color alone.


| **Tone** | **Use for** | **Appropriate icon pairing** |
| --- | --- | --- |
| `'neutral' `**(default)** | No semantic meaning | – |
| `'primary'` | Informational or educational | `InfoOutlineIcon` |
| `'suggest'` | Suggestions or recommendations | `InfoOutlineIcon` |
| `'positive'` | Success, published, healthy | `CheckmarkIcon` |
| `'caution'` | Needs attention, in review | `WarningOutlineIcon` |
| `'critical'` | Error, failed, rejected | `ErrorOutlineIcon` |


### Trim

`trim` applies CSS `text-box-trim` to remove extra whitespace above and below the text box. Use it when precise vertical alignment with adjacent elements matters (e.g., aligning a heading baseline with an icon or badge).


`<Heading as="h2" size={1} trim>Section Title</Heading>`


### Weight


| **Value** | **Use for** |
| --- | --- |
| `'bold'` **(default)** | Standard heading weight. Used for sizes 0–2. |
| `'semibold'` | Slightly lighter. Useful for dense UI chrome. |
| `'medium'` | De-emphasized. Pair with larger sizes for display headings. |
| `'regular'` | Lightest. Used at sizes 3+ for display-style headings. |


## Accessibility

- **Always set **`as`** explicitly.** The default is `<h2>`. Screen reader users navigate by heading level — the outline must be correct.
- **Logical order.** Heading levels must descend in sequence (h1 → h2 → h3). Do not skip levels. Screen reader users build a mental model from heading levels — a gap breaks that model.
- **One **`<h1>`** per page.** Use `as="h1"` for the page title only. All other headings should be `as="h2"` or deeper.
- **Color contrast.** `muted` headings must maintain **3:1** contrast against the background for large text (24px+ regular or 19px+ bold) and **4.5:1** for smaller text (WCAG 1.4.3 AA).
- **Zoom and reflow.** Headings must remain legible at 400% zoom / 320px viewport width (WCAG 1.4.10 AA). Long headings should wrap, not clip. When using `lineClamp`, verify the clipped text still makes sense. Spacing tokens use `rem` and scale with user font-size settings (WCAG 1.4.12 AA).

## Content

- Keep headings short and glanceable.
- Use sentence case (e.g., "Page settings" not "Page Settings").
- Do not end headings with a period unless the heading is a question.
- Headings should clearly describe the content of the section they introduce.


## Migrating from Sanity UI 3

Heading in the new system has a different approach to semantic levels and new typography props.


### Key differences

- UI 4 components use CSS classes with a static stylesheet as opposed to `styled-components`.
- UI 3 Heading defaulted to rendering a `<div>`. The new Heading defaults to `<h2>`. Always set `as` explicitly.
- `textOverflow` replaced by `lineClamp`. For single-line truncation, use `lineClamp={1}`. For multi-line, use `lineClamp={2}` or higher.
- `accent` removed. Use `tone` or a parent with a semantic tone.
- `trim` added to remove leading/trailing whitespace from the text box for precise alignment.
- Margin props added. Heading now accepts `margin`, `marginX`, `marginY`, and per-side margin props.

### Detailed list of differences


| **UI 3 prop** | **UI 4 prop** | **Notes** |
| --- | --- | --- |
| `accent` | — | Removed. No accent color prop in the new version. |
| `textOverflow="ellipsis"` | `lineClamp={1}` | UI 3 used `textOverflow`. The new version uses `lineClamp` for CSS line clamping. |
| — | `trim` | New. Applies `text-box-trim` to remove whitespace above and below the text box. |
| — | `lineClamp` | New. Clamp to N lines. Replaces `textOverflow="ellipsis"` and supports multi-line truncation. |
| — | `margin*` | New. Heading accepts margin props directly (0–9, `'auto'`). |


### Breaking changes

- Default element changed from `<div>` to `<h2>`. A `<Heading>` without `as` now renders `<h2>` instead of `<div>`. Every Heading on the page that omits `as` produces an `<h2>`. Always set `as` explicitly.
- `textOverflow` prop removed. `<Heading textOverflow="ellipsis">` does nothing. Use `<Heading lineClamp={1}>`.
- `accent` prop removed.** **`<Heading accent>` does nothing. Use `tone=”suggest”` or a parent element with a semantic tone for colored headings.
- `styled-components` no longer used. Custom styled-components extensions like `styled(Heading)` will not work.

### Codemod


A codemod is available to make the changes above less painful. To get started, run the following command with the path (or space delimited list of paths) to the file or directory you want to migrate.


`pnpx @sanity-labs/ui-poc-codemod latest:heading --paths <paths> --toPackage @sanity-labs/ui-poc`



If a component instance cannot be migrated, includes ambiguous changes, or generally requires manual validation, the codemod will insert a comment prefixed with “UI-POC-CODEMOD TODO”.


## Related components

- **Text**: Body copy and UI text, not semantic headings

---

<!-- Tab: Icon -->


---


# Icon

Renders a sizable and tonable SVG icon.


[React component](https://github.com/sanity-labs/ui-poc/tree/main/packages/ui/src/components/icon)


## Basic example

`import { Icon } from '@sanity-labs/ui-poc'`

`import { SearchIcon } from '@sanity/icons'`


`<Icon icon={SearchIcon} size={2} />`



**Note:** Icon requires `@sanity-labs/ui-poc/styles.css` to be imported once at your app's entry point. Without it, this component renders unstyled. See Getting Started for more info.


## API documentation


| **Prop** | **Description** | **Type** | **Accepted values** | **Default** | **Required** |
| --- | --- | --- | --- | --- | --- |
| `icon` | The icon component to render | `React.ComponentType<React.SVGProps<SVGSVGElement>>` | Any icon from `@sanity/icons` or a compatible SVG component | — | Yes |
| `size` | Visual size of the icon | `Responsive<IconSize>` | `0`, `1`, `2`, `3`, `4` | `2` | No |
| `tone` | Semantic color | `Tone` | `'none'`, `'neutral'`, `'primary'`, `'positive'`, `'suggest'`, `'caution'`, `'critical'` | — | No |
| `muted` | Reduces color contrast for secondary/decorative use | `boolean` | `true`, `false` | — | No |
| `margin` | CSS `margin` on all sides | `Responsive<SpaceAuto>` | `0`–`9`, `'auto'` | — | No |
| `marginX` | CSS `margin-left` and `margin-right` | `Responsive<SpaceAuto>` | `0`–`9`, `'auto'` | — | No |
| `marginY` | CSS `margin-top` and `margin-bottom` | `Responsive<SpaceAuto>` | `0`–`9`, `'auto'` | — | No |
| `marginTop` | CSS `margin-top` | `Responsive<SpaceAuto>` | `0`–`9`, `'auto'` | — | No |
| `marginRight` | CSS `margin-right` | `Responsive<SpaceAuto>` | `0`–`9`, `'auto'` | — | No |
| `marginBottom` | CSS `margin-bottom` | `Responsive<SpaceAuto>` | `0`–`9`, `'auto'` | — | No |
| `marginLeft` | CSS `margin-left` | `Responsive<SpaceAuto>` | `0`–`9`, `'auto'` | — | No |


Icon also forwards any standard `<svg>` attribute (e.g. `aria-label`, `aria-hidden`, `role`, `focusable`, `data-*`) directly to the rendered SVG element. `size` and all margin props accept responsive arrays. `tone` and `muted` do not.


## Usage guidelines


### When to use

- To communicate a basic concept or action when horizontal space is limited.
- To represent common button actions in dense UI elements, such as Toolbars
- To reinforce the meaning of text. Either to: provide semantic context (ex: adding an error icon next to an error message) or to increase visual prominence for high-priority elements (ex: adding the publish icon in the Publish button, including an upload icon in the upload drag region, etc.)

### When not to use

- As a decorative element. Use an image or illustration instead
- As an interactive element. Use **Button** with `icon` instead.
- As a replacement for text for complex concepts. Use plain text instead. If space is limited, use **Tooltip** or **Popover** to progressively disclose information.

## Best practices


### Do

- Icon’s `size` is intended to match Text’s `size` values. Use the same size value when pairing Icon and Text.
- Combine Text with Icon to help clarify the meaning of an icon. When space is limited, wrap Icon in Tooltip.
- Use `muted` when an Icon is paired with Text
- Only use `tone` to communicate semantic meaning (e.g. `tone="critical"` on an error indicator, `tone="positive"` on a success indicator).
- Use `muted` for secondary or decorative icons that shouldn't draw the eye away from primary content.
- Add `aria-label` for icons that convey meaning on their own; add `aria-hidden="true"` for icons that decorate adjacent text.
- Pick `size` from the scale (`0`–`4`) instead of overriding font-size with inline styles.
- Pass the icon component itself to the `icon` prop, not an instance: `<Icon icon={SearchIcon} />`, not `<Icon icon={<SearchIcon />} />`.

### Don't

- Don’t use `tone` for visual emphasis. Tone is used to reinforce semantic meaning.
- Don't set `fontSize` via inline styles or wrap Icon in a Box with `style={{ fontSize: '24px' }}` — use the `size` prop.
- Don't use Icon as the sole content of an interactive element without an accessible label. Either add `aria-label` or pair the icon with visible text.
- Don't pass custom CSS color values via `style`. Use `tone` or let the icon inherit color from its parent.

## Variants


### Size

`size` controls the rendered SVG dimensions via `font-size` (icons render at `1em × 1em`). The values match the Text size scale, so an Icon with `size={1}` visually matches a Text with `size={1}`.


| **Value** | **Pixel size** | **Use for** |
| --- | --- | --- |
| `0` | 17px | Inline with `Text size={0}`, dense lists, footnotes |
| `1` | 21px | Inline with `Text size={1}`, body copy |
| `2` | 25px | **Default** — toolbar icons, standalone glyphs, inline with `Text size={2}` |
| `3` | 29px | Inline with `Text size={3}`, larger headings |
| `4` | 33px | Inline with `Text size={4}`, hero or featured icons |


### Tone

`tone` sets the icon's color via the design system's tone tokens. Without a `tone`, the icon inherits its parent's text color (`currentColor`).


| **Value** | **Use for** |
| --- | --- |
| `'none'` | Inherit parent color (same as omitting `tone`) |
| `'neutral'` | Default text color — the standard gray for icon glyphs |
| `'primary'` | Brand or informational emphasis |
| `'positive'` | Success, checkmarks, confirmations |
| `'suggest'` | Suggestions, tips, AI-generated indicators |
| `'caution'` | Warnings, in-review states |
| `'critical'` | Errors, failed states, destructive actions |


`tone` does not change the SVG path's `fill` or `stroke` directly — it sets `color`, which the icon's SVG then picks up via `currentColor`. Icons from `@sanity/icons` are designed to honor `currentColor`; third-party SVGs may not.


### Muted

`muted` reduces the icon's contrast for secondary or decorative use. It works alongside `tone`:


`{/* Standard icon — full contrast */}`

`<Icon icon={DocumentIcon} />`


`{/* Muted icon — same color family, reduced contrast */}`

`<Icon icon={DocumentIcon} muted /> <Text>Documentation</Text>`



Use `muted` for icons that accompany muted Text (e.g. metadata rows, last-edited timestamps).


## Accessibility

- **Decorative vs informational.** Icons that repeat information already conveyed by adjacent text are decorative — add `aria-hidden="true"` so screen readers skip them. Icons that convey meaning on their own (e.g. an icon-only status indicator) need an `aria-label` (WCAG 1.1.1 A).
- **Icon-only interactive controls.** Do not use Icon as the only content of a clickable element. Use Button with the `icon` prop and an `aria-label`, or pair the icon with visible text.
- **Color is not the only signal.** When using `tone` to communicate state (e.g. `tone="critical"` on an error icon), pair it with text or a non-color cue. Color must not be the sole indicator of meaning (WCAG 1.4.1 A).
- **Focusable SVG.** Icon does not set `tabindex` and SVGs are not focusable by default. If you wrap an Icon in a focusable container, focus belongs on the container (a Button or PressArea), not the SVG.
- `role`** and **`focusable`**.** The icons in `@sanity/icons` set `role="img"` and `focusable="false"` on their SVG output. Don't override these unless you have a specific reason — the defaults are correct for screen readers and keyboard users.

## Content guidelines

- Pick the icon that most directly matches its meaning. Icons used in unfamiliar ways (e.g. a gear for "edit") slow down comprehension.
- Don't combine icons that visually look like they form a sentence — icons aren't grammar.
- For icon-plus-text pairs, place the icon before the text in left-to-right languages.

## Related components

- **Text**: When the icon should match surrounding text size automatically, render the raw `@sanity/icons` component inside Text instead of using Icon.


## Migrating from Sanity UI 3

`@sanity/icons` exports its own `Icon` component — it renders an SVG icon from the package. The component documented here is different. It is a Sanity UI component that adds `size`, `tone`, `muted`, and margin props on top.

`import {RocketIcon} from '@sanity/icons'`


`{/* UI 3 — icon rendered by specific RocketIcon component */}`

`<RocketIcon />`



The new Icon component also allows for direct manipulation of sizing and toning:

`import {CropIcon} from '@sanity/icons'`

`import {Icon} from '@sanity-labs/ui-poc'`


`{/* UI 3 — wrap in Text just for sizing */}`

`<Text size={2}>`

`  <CropIcon />`

`</Text>`


`{/* UI 3 — inline fontSize fallback */}`

`<Card tone="primary">`

`  <CropIcon />`

`</Card>{/* UI 4 — Icon */}`

`<Icon icon={CropIcon} size={2} tone="primary" />`




### Key differences

- Icon’s `size` prop replaces the "wrap in Text" workaround for sizing standalone icons. The size scale (`0`–`4`) matches Text and Heading exactly.
- Icon’s `tone` prop replaces inline `style={{ color }}` for icon coloring with the semantic tone vocabulary used elsewhere in the system.
- Icon’s  `muted` prop mirrors the `muted` boolean on Text.
- Icon does not currently inherit size/tone from parents.

### Detailed list of differences


| **UI 3 pattern** | **UI 4 prop** | **Notes** |
| --- | --- | --- |
| `<Box style={{ fontSize }}><SomeIcon /></Box>` | `<Icon icon={SomeIcon} size={N} />` | Replaces the inline-fontSize escape hatch. |
| `<SomeIcon style={{ color: '...' }} />` | `<Icon icon={SomeIcon} tone="..." />` | Use the `tone` prop with a semantic value. |
| `<Text muted size={N}><SomeIcon /></Text>` | `<Icon icon={SomeIcon} size={N} muted />` | `muted` is now a first-class prop on Icon. |
| `<Button><SomeIcon /></Button>` | `<Button icon={SomeIcon} />` | Don't wrap Icon in Button — pass the icon component directly to Button. |


### Breaking changes

There are no breaking changes from UI 3 — Icon is new in UI 4. Migrate to Icon at your own pace.


---

<!-- Tab: Card -->


---


# Card

Groups related content into a single visual element.


[React component](https://github.com/sanity-labs/ui-poc/tree/main/packages/ui/src/components/card) **·** [Figma component](https://www.figma.com/design/5mhVqXlldJEEB2VWZeKQ4i/Sanity-UI?node-id=30993-2035&t=Wt4zdsG8xcytqeQO-11)


## Basic example

`import { Card } from '@sanity-labs/ui-poc'`


`<Card density="regular">`

`  This is a card.`

`</Card>`

**Note:** Card requires `@sanity-labs/ui-poc/styles.css` to be imported once at your app's entry point. Without it, this component renders unstyled. See Getting Started for more info.


## API documentation


| **Prop** | **Description** | **Type** | **Values** | **Default** | **Required** |
| --- | --- | --- | --- | --- | --- |
| `as` | HTML element or component to render | `React.ElementType` | Any valid HTML tag or component (e.g. `'article'`, `'section'`) | `'div'` | No |
| `density` | Composite prop that sets padding and border-radius together | `Responsive<Density>` | `'compact'`, `'regular'`, `'loose'` | `'regular'` | No |


### Shared props

- Margin
- Tone — applies a semantic background and border color.

## Usage guidelines


### When to use

- Group related content on a distinct background surface
- Create visual separation between content regions
- Wrap content that needs consistent internal padding and rounded corners

### When not to use

- Layout without a distinct visual surface → use Box or Flex
- Structural UI regions (sidebars, toolbars, scroll containers) → use Box or Flex
- Clickable/tappable areas → use Button for full keyboard accessibility

## Best practices


### Do

- Use `density` to match the surrounding layout. `compact` for dense lists, `regular` for standard cards, `loose` for featured content.
- Use `tone` to reinforce the semantic meaning/purpose of the Card. For example, a Card representing an error or error output should be set to `critical`.
- Wrap Card in a `Box` or `Flex` to control layout sizing — Card handles appearance, the wrapper handles position.


### Don't

- Don't use Card for structural UI regions (toolbars, sidebars, nav headers) — use Box.
- Don't nest cards. Use Box/Flex/Stack for internal layout within a card.
- Don't add `onClick` to Card. Use Button for interactive actions.
- Don't use inline `style` for padding or border-radius — use `density` instead.

## Variants


### Tone

`tone `provides the ability to assign a semantic color to Card. This should be used to reinforce the meaning/purpose of text in important situations, such as error messages or information tips.


| **Tone** | **Use for** |
| --- | --- |
| `'none' `**Default** | No semantic meaning and minor visual emphasis |
| `'neutral'` | No semantic meaning, but increased emphasis |
| `'primary'` | Informational or educational |
| `'suggest'` | Suggestions or recommendations |
| `'positive'` | Success, published, healthy |
| `'caution'` | Needs attention, in review |
| `'critical'` | Error, failed, rejected |


### Density

`density` sets both padding and border-radius as a single value. It reflects the visual *weight* of a card at a given information density. At high density (compact spacing), a smaller radius matches the proportions. At low density, a larger radius fits the more spacious layout. If you need independent control, apply padding to a `Box` inside the Card and use `density="compact"` on the Card itself. Choose based on the visual weight of the surrounding layout:


| **Value** | **Padding** | **Radius** | **Pixels** | **Use for** |
| --- | --- | --- | --- | --- |
| `'compact'` | space-3 | radius-2 | 12px padding, 3px radius | High-density lists, compact items, table rows |
| `'regular' `**(default)** | space-4 | radius-3 | 20px padding, 7px radius | Standard content cards — the default |
| `'loose'` | space-5 | radius-4 | 32px padding, 11px radius | Low-density layouts, featured cards, hero content |


`density` accepts a responsive array: `density={['compact', null, 'regular']}` uses `compact` at the smallest breakpoint and `regular` at the third.


## Accessibility

- Use `as` to choose the correct HTML element:
  - `as="article"` — self-contained content (no accessible name required)
  - `as="section"` — requires a heading child or `aria-label` to register as a landmark (WCAG 1.3.1 A)
  - `as="aside"` — supplementary content; add `aria-label` when the role is not clear from context
- Card has no keyboard activation, focus management, or ARIA role. Do not use `as="button"` — use the Button component for interactive actions.
- Heading levels inside a Card must follow the page hierarchy — do not skip levels (WCAG 1.3.1 A).

## Content guidelines

- Limit card content to a single topic.
- Heading levels inside a card must respect the overall page outline.
- Content should be logically related. Split different topics into separate cards.


## Migrating from Sanity UI 3

Card in the new system is a focused visual surface. It no longer extends Box.


### Key differences

- UI 4 components use CSS classes with a static stylesheet as opposed to `styled-components`.
- Card no longer inherits all Box props (padding, margin, overflow, flex, grid). The new Card accepts only `density`, `tone`, `margin*`, and `as`.
- `density` replaces `padding` + `radius`. Instead of setting padding and radius separately, choose `'compact'` (12px/3px), `'regular'` (20px/7px), or `'loose'` (32px/11px).
- Layout props are silently ignored. `flexGrow`, `width`, `overflow`, `position`, and all other layout props do nothing on Card. Wrap Card in a Box or Flex.
- `tone` values have changed. There is no `'default', 'muted',` or `'transparent'` tone. Use `'neutral'` for the base tone. Available:  `'none'`,  `'neutral'`, `'primary'`, `'positive'`, `'suggest'`, `'caution'`, `'critical'`.
- No `scheme` prop. Dark mode inversion is no longer done at the Card level.
- No `border`, `shadow`, `muted`, `pressed`, `selected` props. Card has been changed to be more focused and purpose-built.


### Removed props (no longer accepted on Card)


| **UI 3 prop** | **UI 4 prop** | **Notes** |
| --- | --- | --- |
| `padding` | –– | Removed. Use `density` (couples padding + radius). For custom padding, nest a Box inside Card. |
| `radius` | –– | Removed. Use `density` (couples padding + radius). |
| `shadow` | –– | Removed. Use `tone` for surface treatment. |
| `border` | –– | Removed. Always rendered. Cannot be opted out of. |
| `scheme` | –– | Removed. Use `tone` instead. |


### `density` scale


| **Density** | **Padding** | **Radius** |
| --- | --- | --- |
| `compact` | 12px | 3px |
| `regular` | 20px | 7px |
| `loose` | 32px | 11px |


### Detailed list of differences


| **UI 3 prop** | **UI 4 prop** | **Notes** |
| --- | --- | --- |
| `tone="default"` | `tone="neutral"` | UI 3 used `'default'` as the base tone. The new version uses `'neutral'`. There is no `'default'` tone. |
| `padding={3}` | `density="compact"` | Card no longer accepts individual `padding` or `radius` props. Use `density` (`'compact'`, `'regular'`, `'loose'`). |
| `radius={2}` | `density="compact"` | Coupled with padding into `density`. |
| `shadow={1}` | — | Removed. Card has no `shadow` prop. |
| `border` | — | Removed as a prop. Card always renders a 1px border via CSS. Border visibility is controlled by `toneLevel`. |
| `borderTop`, `borderRight`, etc. | — | Removed. Card has no individual border-side props. |
| `scheme="dark"` | `toneLevel="strong"` | UI 3 used `scheme` for dark sections. Use `tone` + `toneLevel="strong"` for emphasized surfaces. |
| `muted` | — | Removed. |
| `pressed` | — | Removed. Card is not interactive. |
| `selected` | — | Removed. Card is not interactive. |
| All Box layout props | — | Removed. Card no longer extends Box. Wrap in Box or Flex for layout control. |
| — | `density` | New. Composite prop for padding + border-radius (`'compact'`, `'regular'`, `'loose'`). |
| — | `toneLevel` | New. Controls tone intensity: `'muted'` (border only), `'normal'` (background fill), `'strong'` (high-contrast fill). |
| — | `display` | New. `'block'`, `'inline-block'`, `'none'`. |


### Breaking changes

- Card no longer extends Box. All layout props (`padding`, `paddingX`, `paddingY`, `overflow`, `flexGrow`, `flexShrink`, `flexBasis`, `width`, `height`, `minWidth`, `maxWidth`, `position`, `inset`, `top`, `right`, `bottom`, `left`) are silently ignored. No TypeScript error. No runtime warning. Wrap Card in a Box or Flex for layout control.
- `padding` and `radius` props removed. `<Card padding={3}>` and `<Card radius={2}>` do nothing. Use `density` (`'compact'`, `'regular'`, `'loose'`).
- `tone="default"` no longer exists. Use `tone="neutral"`. Using `"default"` has no effect.
- `tone="inherit"` removed. Card no longer inherits tone from a parent context.
- `scheme` prop removed. `<Card scheme="dark">` has no effect.
- `shadow` prop removed. `<Card shadow={1}>` has no effect.
- `border` prop removed. `<Card border>` does nothing. Card always renders a 1px border. Border color is controlled by `tone`.
- `borderTop`, `borderRight`, `borderBottom`, `borderLeft` removed. Individual border-side props are not available.
- `muted`, `pressed`, `selected` props removed. Card is no longer interactive. These props do nothing.
- `styled-components` no longer used. Custom styled-components extensions like `styled(Card)` will not work.

### Codemod

A codemod is available to make the changes above less painful. To get started, run the following command with the path (or space delimited list of paths) to the file or directory you want to migrate.


`pnpx @sanity-labs/ui-poc-codemod latest:card --paths <paths> --toPackage @sanity-labs/ui-poc`



If a component instance cannot be migrated, includes ambiguous changes, or generally requires manual validation, the codemod will insert a comment prefixed with “UI-POC-CODEMOD TODO”.


For the best results, run the Box codemod first. One caveat, this codemod will *aggressively* transform Card components that don’t match our updated styling (padding and radius combinations plus border) to Box. It may be a good idea to manually double check any UI that follows the Card usage guidelines and should not be converted.


## Related components

- **Box**: Structural container without a visual surface
- **Flex**: Layout container without a visual surface

---

<!-- Tab: Divider -->


---


# Divider

Renders a horizontal rule to break up sections of content.


[React component](https://github.com/sanity-labs/ui-poc/tree/main/packages/ui/src/components/divider) **·** [Figma component](https://www.figma.com/design/5mhVqXlldJEEB2VWZeKQ4i/Sanity-UI?node-id=31003-2&t=Wt4zdsG8xcytqeQO-11)


## Basic example

**Source:** `@sanity-labs/ui-poc`


`import { Divider } from '@sanity-labs/ui-poc'`


`<Divider />`


**Note:** Divider requires `@sanity-labs/ui-poc/styles.css` to be imported once at your app's entry point. Without it, this component renders unstyled. See Getting Started for more info.


## API

Divider uses the shared margin props. It can also take `className` and `style` base props.


## Usage guidelines


### When to use

- To visually and semantically separate sections of logically distinct content within a vertical layout
- Between groups of items in a list or menu where a clear boundary aids scanning
- To mark a thematic shift in content — for example, between a primary action group and a destructive action in a panel

### When not to use

- As a spacing tool. A Divider adds a visible line, not space. Use Stack's `space` prop to add vertical spacing between elements.
- To add a border to the bottom of a container (such as a toolbar or nav header). Use `borderBottom` on Box instead — it is part of the container's own styling, not a thematic break in the content flow.
- When the line is purely decorative and carries no meaning. The `<hr>` element announces a thematic break to screen readers. If no break is intended, use a CSS border or Box with `borderBottom` instead.

## Best practices


### Do

- Place Divider between logically distinct content groups — for example, between a metadata section and an actions section within a panel. Divider renders a semantic `<hr>`. Screen readers announce it as a thematic break, helping users understand content boundaries.
- Use Divider inside a Stack so that spacing on either side of the rule is consistent with surrounding content

### Don't

- Don't use Divider at the very top or bottom of a container to create an edge border. Use `borderTop` or `borderBottom` on a Box instead — edge borders are decorative, not thematic breaks.
- Don't add multiple consecutive Dividers. Use Stack with a larger `space` value to create visual distance without redundant separators.

## Accessibility

- Divider renders as `<hr>`, which carries the implicit ARIA role `separator`. Screen readers announce it as a thematic break. Use it only when the content on either side is genuinely distinct — not for purely visual spacing.
- Divider is not focusable and has no keyboard interaction. Do not add `onClick` or other event handlers to it.
- Do not override the `<hr>` role with `role="presentation"` or `aria-hidden="true"` unless the line is genuinely decorative. If the line is decorative, use a CSS border or Box with `borderBottom` instead of Divider.
- Unlike `<section>` or `<nav>`, `<hr>` does not create an ARIA landmark. Screen reader users navigating by landmarks will not stop at a Divider. Use it for in-flow separation only, not as a structural navigation aid.

## Content

Divider has no text content of its own. These guidelines cover how content around a Divider should be structured.


- Place a Divider between groups of related content, not between every individual item. If each item needs separation, use Stack `space` instead.
- A Divider signals "these two sections are different." The content on each side should make the difference clear without relying on the line itself to convey meaning.
- In long lists (navigation, settings panels), use a heading or Label above each group so users can identify sections without reading every item. The Divider reinforces the boundary; the heading names it.
- A Label followed by a Divider followed by the field creates a false thematic break. Use Stack `space={1}` to pair a label with its field.

## Related components

- **MenuDivider: **Menu’s specific divider element

---

<!-- Tab: Component design guidelines -->


---


---

<!-- Tab: Autocomplete -->


---


# Autocomplete

A text input with a filtered dropdown of suggestions.


**AUTOCOMPLETE HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- To select from a large set of options (> 20)
- When the number of options made available can vary dramatically
- When options need to be loaded asynchronously

### When not to use

- For fixed lists of less than 20 options. Use **Select** for a medium set (5-20) or **Radio** for 5 or less.
- For freeform text entry where no predefined options exist — use **TextInput** instead.
- For multi-selection. Use a **Checkbox** list instead.

## Best practices


### Do

- Display with label in form context. The label should still be present, but hidden in cases where Autocomplete is used outside of the form context.
- Keep select option labels concise and lead with the value that the option represents.

### Don't

- Don't use Autocomplete as a general search box that navigates on selection — use a dedicated search component or command palette.
- Don't use periods at the end of a select option


---

<!-- Tab: Avatar -->


---


# Avatar

A visual representation of a person or agent


**AVATAR HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- As a way to access a profile (either human or agent)
- To disclose a user/agent associated with content or permissions.

### When not to use

- To represent a person or bot that doesn't represent a Sanity user.
- To represent an app or studio instance.
- To represent a group of people and/or bots. Use AvatarStack.

## Best practices


### Do

- When space permits, display the full name of the person/agent next to Avatar
- When space is not available, display the full name of the person/agent as a Tooltip on hover/focus
- Rotate colors of Avatar instances when more than one is visible at a time
- Use the same color for the active user across all surfaces to maintain cohesion
- Always add initials to Avatar as a fallback to an image if the image fails to load
- Make the full name of the person / agent available as a `aria-label`

### Don't

- Don't use more than two characters as initials
- Don't use a shorthand for a person/agent in cases where the full name provides more clarity
- Don't use as an inline element within a block of text

## Variants


### Size


| **Value** | **Description** | **Use case** |
| --- | --- | --- |
| `0` | Smallest | When used in the context of metadata or high-density layouts |
| `1` | Small (default) | UI labels (buttons, menu items, tabs), toast messages, empty states |
| `2` | Medium | When a user is a core focus of an element or flow. Such as a share dialog. |
| `3` | Large | Rarely needed. When a user is the primary focus of an element or flow. Such as a dialog for removing a user. |
| `4` | Extra large | Rarely needed. |


---

<!-- Tab: AvatarStack -->


---


# AvatarStack

A visual representation of multiple people and/or agents.


**AVATARSTACK HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- To represent user groups or cohorts
- To disclose the group of people an action will impact

### When not to use

- To represent a group of people or bots that don't represent Sanity accounts.
- To represent a group of apps or studio instances.
- To represent a single of person or agent. Use Avatar.

## Best practices


### Do

- AvatarStack should be sorted a logically and contextually. When a AvatarStack is used within the context of sharing, order by most recently shared with. When used for editing, sort by the person/agent that last edited.
- The active user should be first in AvatarStack if no contextually-relevant sorting logic exists.
- When not all Avatars are visible, make the full list available as a Popover through user interaction.

### Don't

- Don't individually set Avatar `size` within AvatarStack. Use AvatarStack's `size` prop instead.
- Don't manually add `<AvatarCounter />`, use the `maxLength` prop instead.
- Don't use as an inline element within a block of text

## Variants


### Size


| **Value** | **Description** | **Use case** |
| --- | --- | --- |
| `0` | Smallest | When used in the context of metadata or high-density layouts |
| `1` | Small (default) | UI labels (buttons, menu items, tabs), toast messages, empty states |
| `2` | Medium | When a group of users is a core focus of an element or flow. Such as a share dialog. |
| `3` | Large | Rarely needed. When a group of users is the primary focus of an element or flow. Such as a dialog for removing a group. |
| `4` | Extra large | Rarely needed. |


---

<!-- Tab: Button -->


---


# Button

Used to trigger an action–like submitting a form, opening a dialog, or performing a command.


**BUTTON HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


### Usage guidelines

**When to use:**

- To trigger an action within the application (e.g., "Publish", "Delete", "Save").
- To submit data in a form context. In such cases, set Button to `type="submit"`.
**When not to use:**

- To navigate the user to a new view or URL within  a line of text or paragraph. Use **Link** instead. Users of assistive technology expect buttons to perform actions and links to navigate.
- To switch between different views on a screen. Use **Tab** instead. The Tab component family has several `aria` tags that make navigation accessible for people relying on assistive technology.
- To toggle a boolean form value (on/off). Use **Switch** or **Checkbox** instead. Button `selected` is for action toggles (bold, show panel), not form state.


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
| `"primary"` | Brand blue | **Deprecated. Do not use.** | **Deprecated. Do not use.** |
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
1. **Use ChevronRightIcon** to drill into nested, column-based navigation
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


### **Content**

- **Be concise:** Button labels should be short and predictable. Use simple and direct language.
- **Start with verbs:** Labels should describe the action taken (example: "Publish", "Edit", "Upload"). For extra clarity, add the subject of the action, (example: Upload image).
- **Sentence case:** Use sentence case for button labels (example: "Add item").

---

<!-- Tab: Checkbox -->


---


# Checkbox

Enables the selection of an item or option.


**CHECKBOX HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- To select one or more items within a group within a multiselect context
- As a way to select/deselect every item from a list or table
- To toggle or more boolean options within a form context

### When not to use

- When selection triggers immediate feedback. Use Switch instead.
- When only one item from a group can be selected. Use Radio or Select instead.

## Best practices


### Do

- Display with label in form context. The label should still be present, but hidden in cases where Checkbox is added to lists or tables.
- Stack checkbox options vertically for easier scanning.
- Checkbox's `checked` should always represent a true/on/positive.
- Use `indeterminate` for a Checkbox used to select/deselect all items in cases where the group of items has a mix of selected and deselected
- Order checkbox options logically. When in doubt, order alphabetically or numerically.
- Use a legend for a group of Checkboxes to describe its theme and purpose
- Keep checkbox labels concise. Ideally one sentence.

### Don't

- Don't use the `indeterminate` checkbox state for form options.
- Don't use Checkbox's checked state to represent a negative action. Example: "Don't subscribe to the newsletter". Instead, make a checked state map to "Subscribe to the newsletter"
- Don't use periods at the end of a Checkbox label


---

<!-- Tab: Popover -->


---


# Popover

Popover is a floating layer to provide non-essential, contextually relevant information.


**POPOVER HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- To conserve screen real estate by hiding secondary controls until requested.
- As a way to introduce/educate people on a specific feature or element on the screen.

### When not to use

- To display critical information the user needs to see for their workflow.
- To display helper text via hover/focus. Use **Tooltip** instead.
- To provide a standard list of options in a contextual menu. Use **Menu** instead.
- To display prompts that require user input to proceed. Use **Dialog** instead.
- To display non-critical system updates/feedback. Use **Toast** instead.

## Best practices


### Do

- Only use `arrow `when Popover is made visible without user interaction–such as onboarding tips/walkthroughs. The arrow helps clarify what is being brought to attention.
- Provide a visual cue that interacting with an item will trigger a Popover. When in doubt, use end-aligned `ChevronDownIcon`.
- Always make Popover dismissible.

### Don't

- Don’t auto-show Popovers outside of walkthroughs. The typical use of Popover should require direct user interaction.
- Don’t show more than one Popover at a time. Showing a Popover should automatically hide any visible Popover.
- Don’t trigger Popover to hover events. Popover should be displayed on press or Space/Enter keypress.

---

<!-- Tab: Radio -->


---


# Radio

Enables the selection from a list of options.


**RADIO HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- To select from a small set of options (2-4)

### When not to use

- For binary on/off toggles that trigger immediate feedback. Use **Switch** instead.
- More than 5 options. Use **Select** instead.
- When more than one option can be selected. Use **Checkbox** instead.
- For binary options (yes/no, true/false, etc.) within a form. Use one **Checkbox** instead.

## Best practices


### Do

- Always pair each Radio with a visible label.
- Stack radio options vertically for easier scanning.
- Always group radios with a shared `name` prop so the browser treats them as a single mutually exclusive group.
- Use a legend for a group of Radios to describe its theme and purpose
- Pre-select a default option when a clear default exists. Avoid pre-selecting when doing so is leading or represents a critical decision.
- Order radio options logically. For example, a likert scale options should be ordered sequentially. When in doubt, order alphabetically or numerically.
- Keep radio labels concise. Ideally one sentence.

### Don't

- Don't horizontally arrange more than 2 radio options. Horizontal layouts become hard to scan and may wrap unpredictably on smaller screens.
- Don't use periods at the end of a Radio label


---

<!-- Tab: Select -->


---


# Select

Allows the user to choose one option from a dropdown list.


**SELECT HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- To select from a medium set of options (5-20)

### When not to use

- When multiple options can be selected. Use **Checkbox** instead.
- When there's no more than 4 options. Use **Radio** instead.
- To allow freeform text input. Use **TextInput**.
- When options require rich text or nesting. Use **MenuButton** instead.
- When selecting an option navigates you to another location. Use **MenuButton** instead.

## Best practices


### Do

- Display with label in form context. The label should still be present, but hidden in cases where Select is used outside of the form context.
- Keep select option labels concise and lead with the value that the option represents.
- Pre-select a default option when a clear default exists. Avoid pre-selecting when doing so is leading or represents a critical decision.
- Order select options logically. When in doubt, order alphabetically or numerically.

### Don't

- Don't use periods at the end of a select option
- Don't mix Select and MenuButton in a related group of UI elements–like filter options. The group should exclusively use Select or MenuButton.


---

<!-- Tab: Stack -->


---


# Stack

Arranges children in a single vertical column with consistent spacing between them.


**STACK HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


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


---

<!-- Tab: Switch -->


---


# Switch

A toggle control for binary on/off settings.


**SWITCH HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- Toggling a boolean setting that takes effect immediately (ex: "Enable notifications").

### When not to use

- When chossing between more than two options — use **Select** or **Radio** instead.
- When making a binary decision within a form the context of form. Use **Checkbox** instead, so the user controls when the change is applied.
- When selection does not immediately trigger a reaction. Use **Checkbox** instead.

## Best practices


### Do

- Always pair each Switch with a visible label.
- Stack switches vertically for easier scanning.
- The label should describe the *on* state and use present-tense verb phrases: "Enable feature flags", "Show archived items".

### Don't

- Don't use periods at the end of a Switch label
- Don't pair Switch with a confirmation button/action. Toggling a switch should immediately trigger the action.


---

<!-- Tab: TextArea -->


---


# TextArea

Multi-line text input. An alternative to the native `<textarea>` that integrates with the Sanity UI visual system.


**TEXTAREA HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- For multi-line freeform text input. Examples include descriptions, comments, summaries, etc.

### When not to use

- For single-line freeform text input. Use **TextInput** instead.
- For rich text editing. Use a dedicated editor component.

## Best practices


### Do

- Display with label in form context. The label should still be present, but hidden in cases where TextArea is used outside of the form context.
- Use placeholders that are fully visible within the bounds of the input
- Invalid inputs must have an associated error message. Use `aria-describedby` to link the input to the error text.
- Stack TextArea elements vertically for easier scanning.
- Mark optional fields as optional in the label

### Don't

- Don't use placeholders as replacements for labels. Placeholders should only supplement/contextualize the purpose of the input (ex: "Comments should be no more than 240 characters").
- Don't disable TextArea without clear messaging for why it's disabled
- Don't provide vague error messages. Error messages should explain what's wrong with the text provided and how to correct (ex: "The password provided has 12 characters. Use 16 or more.")


---

<!-- Tab: TextInput -->


---


# TextInput

Used to accept a single line of text from the user.


**TEXTINPUT HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- For freeform input of short text (example: names, titles, search queries, etc.)

### When not to use

- When writing longer form, multi-line text and/or when spell check is expected. Use **TextArea** instead.
- For selecting an option from a fixed list. Use **Select** instead.

## Best practices


### Do

- Display with label in form context. The label should still be present, but hidden in cases where TextInput is used outside of the form context.
- Use placeholders that are fully visible within the bounds of the textarea
- Invalid inputs must have an associated error message. Use `aria-describedby` to link the input to the error text.
- Stack inputs vertically for easier scanning. Horizontal stacking should only be used for groups of related fields (ex: City/Zip code)
- Mark optional fields as optional in the label

### Don't

- Don't use placeholders as replacements for labels. Placeholders should only supplement/contextualize the purpose of the input (ex: "Search by title or ID").
- Don't disable inputs without clear messaging for why it's disabled
- Don't provide vague error messages. Error messages should explain what's wrong with the text provided and how to correct (ex: "The password provided has 12 characters. Use 16 or more.")
- Don't horizontally stack more than two TextInputs in a row.


---

<!-- Tab: Toast -->


---


# Toast

Used to show brief status messages about completed actions, warnings, or errors.


**TOAST HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- To confirm an action that completed in the background (ex: "Document published").
- To warn about a non-blocking issue.
- To report a non-critical error from an async task (ex: "Upload failed. Try a smaller file.").

### When not to use

- For content or actions that require user response. Use **Dialog** instead.
- For inline form errors. Show the error next to the input instead.
- For persistent information. Use a **Card** with a tone instead.

## Best practices


### Do

- Limit the number of Toasts displayed–ideally one Toast at a time. Toasts related to errors or warnings should always take priority.
- Toasts that are not auto-dismissible should have a clear way to manually dismiss.
- Toast should appear after an event has completed. Messages should reflect that by using past-tense. Examples include: "Published," "Saved," "Deleted"
- Make toast messages specific. Write, "Document published" instead of "Success" or, "Write "3 items deleted" instead of "Deleted"

### Don't

- Don't add mandatory actions within Toast. Actions should be optional and non-critical.
- Don't rely on Toast for situations where the user input is critical and timely. Use Dialog or a Modal to prompt the action.
- Don't rely on color alone to communicate a Toast's state. Use an icon to reinforce. Pair `tone="critical"` with `ErrorOutlineIcon` and `tone="positive"` with `CheckmarkCircleIcon`.


---

<!-- Tab: Tooltip -->


---


# Tooltip

The Tooltip is a floating text label that displays information when a user hovers, focuses, or taps on an element.


**TOOLTIP HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- To explain the function of an icon-only button (e.g., a "Trash" icon meaning "Delete").
- To provide supplementary information that enhances the understanding of a feature that isn't critical for the task.

### When not to use

- The information is necessary for the user to complete a task or understand an error. Use inline text or banners instead.
- To contain interactive elements, such as a Button. Use **Popover** instead.
- You are restating text that is already visible on the screen.
- The element is disabled. Disabled elements cannot receive focus, making the tooltip inaccessible to keyboard users. Add the messaging outside of the disabled element in those situations.

## Best practices


### Do

- Use `delay` to prevent tooltips from flickering open/closed as the user moves their mouse rapidly across the screen (hover intent).
- Limit text to a maximum of 50 characters where possible.
- Start with a verb if describing an action (e.g., "Edit profile" rather than "Profile editor").
- Only use punctuation when the tooltip contains full sentences.

### Don't

- Don't put interactive content like links or buttons inside a Tooltip. If you need interactive content, use a **Popover** instead.
- Don't use lengthy text. Tooltips are for quick scanning; if the text is long, consider if it belongs in a modal or helper text.


---

<!-- Tab: Dialog -->


---


# Dialog

Presents a gating task or decision that blocks other interaction until completed.


**DIALOG HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use

- To confirm a destructive action before it occurs (ex: deleting a file, removing a user, etc.)
- To request specific input needed for a critical task to complete.
- To display an error that needs direct user input to proceed.
- To display terms/legal agreements that require explicit consent from the user.

### When not to use

- To display a system update that does not explicitly need user input to complete. Use **Toast** instead.
- To display non-essential, contextual information for a feature or element on the screen. Use **Popover** or **Tooltip** instead.
- As a means to highlight a new feature or brand moment. Use **Toast** or **Popover** instead.
- As a way to disclose a non-essential feature or display a secondary content. Navigate to a new screen or display in an end-aligned column.

## Best practices


### Do

- Use Dialog as a last resort. Dialog’ should only be used for when blocking the user is for their explicit benefit/safety.
- Dialog should always be cancelable/dismissible. For example, the user should be able to opt out to the terms of service, or cancel an action. The user should never be trapped into agreeing or initiating an action against their will.

### Don't

- Never interrupt the user with upsells or marketing moments through a Dialog. The user should never be blocked from using the app unless their input is absolutely necessary.
- Don’t make Dialog a shortcut to presenting a new page.

## Content

- Dialogs for destructive actions should communicate the target, the action, and the consequence. The user should know exactly what will happen from the title. For example, a dialog for deleting a document should be titled, “Delete [PAGE NAME]?”. Do not use vague titles, such as “Delete?”
- Dialog body text should present the full details for what action will take place. For example, listing out all what exactly will be deleted (if multiple items are being deleted), if/how the data is recoverable, etc.
- Dialog buttons should reinforce the action. The confirmation button for dialog to delete 2 items should be labeled, “Delete 2 items”. The cancel button should be labeled, “Do not delete”  Do Confirm button labels (P5). The confirm button repeats the action verb. If the dialog asks "Delete 3 items?". Do not use vague button labels, such as “Yes”/”No”.
- Destructive action buttons should use `tone=”critical”`


---

<!-- Tab: In progress -->


---


---

<!-- Tab: Spinner -->


---


# Spinner

TBD.


**SPINNER HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use


### When not to use


## Best practices


### Do


### Don't


---

<!-- Tab: Tabs -->


---


# Tabs

TBD.


**TABS HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


## Usage guidelines


### When to use


### When not to use


## Best practices


### Do


### Don't


---

<!-- Tab: Component authoring accessibility standards -->


---


# Component authoring accessibility standards


This document is for feature teams adding new components to Sanity UI. It defines what your component must implement and what its documentation must state for each accessibility standard.


If you are using existing Sanity UI components to build a UI, see `foundations-accessibility.md` instead. For coding conventions and TypeScript patterns, see `code-style-guide.md`.


## How to use this document

Each standard below states:


- **What the component must do** — the implementation requirement
- **What the doc must say** — the documentation requirement
- **WCAG basis** — the success criterion it satisfies

At the bottom, the [**Component type checklist**](#component-type-checklist) maps standards to component categories so you can quickly identify which ones apply to what you are building.


## 1. Polymorphic element rendering

**WCAG:** 1.3.1 Info and Relationships (A); 4.1.2 Name, Role, Value (A).


Applies to any component that exposes an `as` prop or a `level`/`type` prop that changes the rendered HTML element.


### What the component must do

- Render the element specified by the prop without modification.
- Not attempt to fulfil the behavioral contract of elements it cannot support (e.g. a layout wrapper rendering as `<button>` will look like a button but will not respond to Enter/Space correctly, will not carry the implicit ARIA button role reliably, and will not reset browser UA styles).

### What the doc must say

1. **List the accepted values** and the HTML element each produces.
1. **State the default** and whether the default carries semantic meaning (a `<div>` default is neutral; an `<h2>` default is not).
1. **State which values carry behavioral requirements** the component does not fulfil — specifically `<button>`, `<dialog>`, `<form>`, `<fieldset>`, `<details>`, `<summary>`, `<select>`. The doc must warn that using `as` to render one of these elements announces the role to assistive technology but does not implement the required behavior. This is worse than no role at all.
1. **Prohibit **`as="button"`** on layout primitives explicitly.** Layout wrappers rendered as `<button>` inherit browser UA button styles (border, background, padding, cursor) with no prop-based way to reset them. The doc must state: *"Use the *`Button`* component instead."*
1. **For **`level`**-based APIs** (e.g. a heading component that uses `level={1}`–`level={6}` instead of `as`): the doc must include a ⛔ callout stating the default level, that omitting it silently renders the wrong semantic element, and that TypeScript does not require it. The default is never safe to assume without auditing the surrounding page hierarchy.


## 2. Behavioral contracts

**WCAG:** 4.1.2 Name, Role, Value (A).


### What the component must do

If a component adopts an ARIA role — whether through an explicit `role` prop, a rendered HTML element, or an implicit mapping — it must implement the full behavioral contract for that role:


- **Keyboard interaction** as specified in the WAI-ARIA Authoring Practices (see [§ 4](#4-keyboard-interaction)).
- **Focus management** — where focus goes when the component opens, closes, or changes state.
- **ARIA state attributes** — `aria-expanded`, `aria-selected`, `aria-checked`, `aria-pressed`, `aria-disabled`, etc., kept in sync with visual state.
- **ARIA relationship attributes** — `aria-controls`, `aria-owns`, `aria-labelledby`, `aria-describedby` where the role requires them.

### What the doc must say

State clearly whether the component fulfils the full behavioral contract. If it does not, name what is missing and provide the workaround or the component that does.


## 3. Silent prop rejection

**WCAG:** 4.1.2 Name, Role, Value (A); 1.3.1 Info and Relationships (A).


### What the component must do

If a component accepts props at the TypeScript type level but silently discards them at runtime, this is a hazard regardless of accessibility impact. It causes broken layouts that appear correct in the editor. The preferred solution is to not accept the props at the type level. If the props are accepted and discarded for architectural reasons, the component must emit a `console.warn` in development mode.


### What the doc must say

If a component silently ignores props (whether or not a dev warning exists):


1. **Include a ⛔ callout** at the start of the relevant API section — not in a "Don't" bullet, not at the end of a section.
1. **State explicitly:** "TypeScript does not error. No console warning fires. The prop has zero effect." This exact phrasing ensures developers searching for these symptoms find the explanation.
1. **List every silently ignored prop by name.** "Layout props are ignored" is insufficient.
1. **Show a ✗/✓ code example** with the correct workaround immediately after.

## 4. Keyboard interaction

**WCAG:** 2.1.1 Keyboard (A); WAI-ARIA Authoring Practices.


### What the component must do

Every interactive component must be fully operable by keyboard. Refer to the [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/) for the interaction pattern that matches your component's role.


The most common patterns and their key bindings:


| **Role / pattern** | **Activation** | **Navigation** | **Escape** |
| --- | --- | --- | --- |
| Button | Enter or Space | — | — |
| Link | Enter only | — | — |
| Checkbox / Switch | Space | — | — |
| Menu | Enter or Space to open | Arrow keys, Home, End | Close + return focus |
| Listbox / Select | — | Arrow keys, Home, End | — |
| Dialog (modal) | — | Tab (trapped) | Close + return focus |
| Disclosure / accordion | Enter or Space | — | — |
| Tab panel | — | Arrow keys between tabs | — |


### What the doc must say

1. Which keys activate the component and in which states.
1. Which keys navigate within the component (if any), and edge behavior (wrap or stop).
1. What happens when the component is disabled — removed from tab order via HTML `disabled`, or focusable but inert via `aria-disabled="true"`. State which the component uses and why.
1. Whether any keyboard shortcut conflicts with OS or browser shortcuts.

Layout primitives (Box, Flex, Stack, Grid) are exempt unless they render as interactive elements via `as`.


## 5. Visual and focus order

**WCAG:** 1.3.2 Meaningful Sequence (A); 2.4.3 Focus Order (A).


### What the component must do

Visual order and DOM order must match. Screen readers and keyboard users follow DOM order, not visual order. CSS that changes visual position without changing DOM position (Flexbox `order`, reverse flex directions, Grid placement) breaks the reading and focus sequence for non-visual users.


### What the doc must say

State that DOM order defines reading and focus order, and prohibit the following unless the component has a documented, accessible alternative:


- `order` in Flexbox or Grid
- `flex-direction: row-reverse` or `column-reverse` on content that contains readable text or interactive elements
- Grid placement (`grid-column`, `grid-row`) that shifts items away from their source order

If a component must support visual reordering (e.g. a drag-and-drop sortable list), it must implement `aria-roledescription`, live region announcements, and keyboard reorder commands.


## 6. Collapsible regions and overlays

**WCAG:** 2.4.3 Focus Order (A); 2.4.7 Focus Visible (AA); APG Dialog and Disclosure patterns.


Applies to any component that shows or hides a region of content: dialogs, menus, popovers, tooltips, drawers, sidebars, accordions, and disclosure sections.


### What the component must do

**On open:**


- Move focus to the first focusable element inside the region, or to the region container itself if no focusable element exists.
- For modal overlays (dialogs, sheets): trap focus within the region. Tab and Shift+Tab must not reach elements outside it.
- For non-modal overlays (menus, popovers, tooltips): do not trap focus.

**On close:**


- Return focus to the element that triggered the open action.
- If the trigger no longer exists, move focus to the nearest meaningful ancestor.

**Hidden content:**


- A closed/hidden region must not contain focusable elements reachable by Tab. Use `display: none`, `visibility: hidden`, `inert`, or `hidden` to remove it from the accessibility tree.

**Portal requirement:**


- Any overlay rendered inside an `overflow: hidden` container must render via a portal (appended to `document.body` or a designated portal root). Without a portal, the overlay is clipped by the parent's overflow boundary with no error or warning. This must be documented with a ⛔ callout.

### What the doc must say

1. Where focus moves on open (name the element or explain the logic).
1. Where focus returns on close.
1. Whether focus is trapped (modal) or not (non-modal).
1. How Escape key behavior works and whether it closes the region.
1. If the component must be used with `popover={{ portal: true }}` or equivalent inside overflow-constrained containers.

## 7. Trigger-state ARIA

**WCAG:** 4.1.2 Name, Role, Value (A).


Applies to any button or interactive element that controls a collapsible region, overlay, or expandable section.


### What the component must do

- Set `aria-expanded="true"` when the controlled region is visible, `"false"` when hidden.
- Set `aria-haspopup` to the type of popup: `"menu"`, `"listbox"`, `"dialog"`, `"grid"`, or `"tree"`. Do not use `"true"` — it is equivalent to `"menu"` and is semantically incorrect for non-menu popups.
- Set `aria-controls` to the `id` of the controlled region where the popup type warrants an explicit relationship.

### What the doc must say

State the exact `aria-*` attributes the trigger element sets, their values, and which element they reference. If the component has known deviations from the ARIA spec (e.g. emits `aria-haspopup="true"` instead of `aria-haspopup="menu"`), document this explicitly so consumers know it cannot be corrected from outside.


## 8. Disabled state

**WCAG:** 4.1.2 Name, Role, Value (A); 2.1.1 Keyboard (A).


### What the component must do

Choose one of two patterns and apply it consistently:


- **HTML **`disabled` — removes the element from the tab order and blocks all interaction. Correct for short-lived disabled states on form controls where the user does not need to discover the element.
- `aria-disabled="true"` — keeps the element focusable and in the tab order but blocks activation. Correct when the user needs to be able to find the element and understand why it is unavailable (e.g. a "Publish" button disabled because required fields are incomplete).

### What the doc must say

1. Which pattern the component uses and why.
1. That tooltips on HTML-disabled elements cannot be reached by keyboard users — if an explanation of why something is disabled is needed, use adjacent text, a status message, or an info icon, not a Tooltip.

## 9. Live regions and status messages

**WCAG:** 4.1.3 Status Messages (AA).


### What the component must do

- Status updates that do not require immediate action (loading complete, item saved, count updated) must use `aria-live="polite"`.
- Urgent errors that interrupt the user (validation failure blocking submission, destructive action confirmation) must use `aria-live="assertive"`.
- Containers undergoing loading must use `aria-busy="true"`.
- Screen readers do not announce newly injected content unless it is inside an `aria-live` region that existed in the DOM before the update. The live region container must be present on initial render, even if empty.

### What the doc must say

State which `aria-live` policy the component uses and what triggers a live announcement. If the component has a loading state, document the `aria-busy` attribute.


## 10. Form input accessible names

**WCAG:** 4.1.2 Name, Role, Value (A); 1.3.1 Info and Relationships (A).


### What the component must do

Every form input must have a programmatically associated accessible name at all times. A placeholder, tooltip, or visual label that is not linked via `htmlFor`/`id`, `aria-label`, or `aria-labelledby` does not count.


### What the doc must say

1. **Include a ⛔ callout** stating that a bare input without an accessible name is an axe critical violation (WCAG 4.1.2 A). This must appear at the top of the Accessibility section.
1. **Show the mandatory pattern** — not just a recommendation, a requirement:

`// ✗ — axe critical: no accessible name`

`<Select onChange={handleChange}>...</Select>`


`// ✓ — required pattern for all form inputs`

`<Stack space={1}>`

`  <Label htmlFor="field-id">Label text</Label>`

`  <Select id="field-id" onChange={handleChange}>...</Select>`

`</Stack>`



1. **Document the **`onChange`** event shape.** Sanity UI inputs wrap native browser events. State which `currentTarget` property carries the value:


| **Input type** | **Value property** | **Event cast** |
| --- | --- | --- |
| Text, TextArea, Select | `event.currentTarget.value` | `React.ChangeEvent<HTMLInputElement \| HTMLTextAreaElement \| HTMLSelectElement>` |
| Switch, Checkbox | `event.currentTarget.checked` | `React.ChangeEvent<HTMLInputElement>` |


## 11. CSS custom property scoping

**WCAG:** 1.3.1 Info and Relationships (A) — content must be accessible when styling is applied.


### What the component must do

If a component writes CSS custom properties onto its subtree (e.g. a "color context" pattern where variables like `--card-bg` are set on the component element and consumed by descendants), it must:


- Define the scope boundary clearly in code comments.
- Ensure that descendants can reference these variables without additional configuration.
- Not expose these variables as a public API unless they are intentionally consumer-facing.

### What the doc must say

1. **Name the CSS custom properties the component writes**, their scope, and which descendant elements are expected to consume them.
1. **Warn that these variables are undefined outside the component's subtree.** Failure is silent — the browser discards the declaration with no error.
1. **Provide the globally-available alternative** for consumers who need the same visual value outside the component's scope.

## 12. Color contrast and semantic tones

**WCAG:** 1.4.3 Contrast Minimum (AA); 1.4.1 Use of Color (A).


### What the component must do

- Text within the component must meet 4.5:1 contrast against its background for normal text, or 3:1 for large text (18px+ regular, 14px+ bold).
- If the component uses a color-coded tone system (`positive`, `caution`, `critical`), it must pair every tone with a non-color indicator (icon, label, or pattern) in addition to color. Color alone is not sufficient.
- Semantic tones must not produce contrast failures at any tone/mode combination. Test each tone in both light and dark schemes.

### What the doc must say

1. **A tone table** listing each tone value, its WCAG AA pass/fail status, and which icon to pair with it.
1. **An explicit prohibition** for any tone that fails WCAG AA — e.g. if a `primary` tone produces insufficient contrast at small text sizes, the doc must prohibit it for text-bearing elements and name the alternative.
1. **The icon pairing requirement.** State that semantic tones (`positive`, `caution`, `critical`) must always be accompanied by a matching icon: `CheckmarkCircleIcon` for positive, `WarningOutlineIcon` for caution, `ErrorOutlineIcon` for critical.

## 13. List semantics

**WCAG:** 1.3.1 Info and Relationships (A).


### What the component must do

If a component renders `<ul>` or `<ol>` and its CSS or the host page CSS applies `list-style: none`, it must also set `role="list"` on the list element. WebKit (Safari, all iOS browsers) removes list semantics from `<ul>` and `<ol>` when `list-style: none` is applied; VoiceOver will not announce the element as a list or report the item count. Adding `role="list"` restores this.


Each child of the list must be an `<li>` element. Using `<div>` or other elements as children of `<ul>` or `<ol>` produces invalid HTML regardless of any `role` attribute.


### What the doc must say

1. That `role="list"` is required when the list has `list-style: none`.
1. That children must be `<li>` elements.
1. If the component renders `role="menu"` or another ARIA list-like role, explain that the ARIA role replaces native list semantics and `role="list"` is not needed — but child items must still use the appropriate ARIA role (`menuitem`, `option`, etc.).


---

<!-- Tab: Sanity UI Design System & agents: A love story -->


---


# Sanity UI Design System & agents: A love story


Our goal is for Sanity UI to be the best way for humans or agents to build Sanity interfaces. We made a dedicated testing and measurement tool to assess how well Sanity UI is used by agents.


This process operates in a continuous improvement cycle:

- **Training Data Consumed:** Agents are powered by existing Sanity UI 3 components, current online documentation, in-progress documentation, and new Proof-of-Concept (POC) components.
- **Output Measured & Feedback Generated:** The agent's code output is evaluated against a defined set of metrics.
- **UI Iterations Delivered:** Sanity UI components are refined based on the generated feedback and measurements.
- **Documentation Enhanced:** The documentation is updated using this data to provide better guidance to agent behavior.
Key metrics


The utility monitors performance across several critical dimensions:


| **Focus Area** | **Key Measurement** |
| --- | --- |
| **Task Completion** | % of tasks that failed on the first attempt |
|  | Average attempts required to complete a task |
|  | Average number of fixes needed to finish a task |
| **Efficiency** | Average output tokens utilized |
|  | Average task completion time (seconds) |
| **Generated Code Quality** | Structural code difference (vs. human baseline) |
|  | Average lines of code generated |
| **Customization Needed** | Average count of inline styles |
|  | % of Box instances relying on inline styles |
| **UI Performance** | FCP (First Contentful Paint, milliseconds) |
|  | Initial render time (milliseconds) |
| **Accessibility** | Average number of AXE violations |
|  | Average accessibility failure rate |

*(Note: Code quality metrics ensure the output is idiomatic and maintainable.)*Results: Documentation-Driven Improvement


Preliminary testing, which compares agent performance using standard UI 3 documentation (**Floor**) versus new, improved documentation (**Ceiling**), demonstrates a notable improvement (Doc Lift) for foundational components.


| **Component** | **Floor (Agent Score - ****UI 3**** Docs)** | **Ceiling (Agent Score - Improved Docs)** | **Doc Lift** | **Quality Gap** |
| --- | --- | --- | --- | --- |
| **Box** | 61 |  | +16 |  |
| **Flex** | 81 |  | +10 |  |
| **Grid** | 85 |  | +6 |  |

This work directly supports our mission: to establish Sanity UI as the preferred tool for all builders, human or agent.Roadmap Priorities


Based on these findings, the next phase of work will concentrate on:

- Refining generative prompts for better output control.
- Prioritizing the replacement of general `Box`/`Flex`/`Grid` usage in agent outputs with more composed, higher-level components.
- Reducing task completion time and token usage (improving efficiency).
- Minimizing the generation of inline styles (reducing custom code dependency).
- Decreasing the number of failed build attempts (boosting effectiveness).


---

<!-- Tab: Menu -->


---


# Menu




**MENU HAS NOT YET BEEN ADDED AS A UI-POC COMPONENT**


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


*Refer to TypeDocs in Menu.tsx*


#### **MenuGroup**

A nested menu trigger.


*Refer to TypeDocs in MenuGroup.tsx*


#### **MenuItem**

An individual action within the menu.


*Refer to TypeDocs in MenuItem.tsx*


#### **MenuDivider**

An individual action within the menu.


*Refer to TypeDocs in MenuDivider.tsx*


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
- Use `<Icon icon={ChevronRightIcon} />` when a menu item drills into child menu items
- Use `<Icon icon={LaunchIcon} />` when the icon take a person to an external link or a new tab/window

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


### **Content Guidelines**

- **Concise Labels:** Keep `MenuItem` text short (1-3 words). Use verbs that describe the action (e.g., "Rename", not "Change the name").
- **Sentence Case:** Use sentence case for all menu items (e.g., "Open in new tab").
- **Predictable Grouping:** Place destructive actions (like Delete) at the bottom of the list, ideally separated by a `MenuDivider` to prevent accidental clicks.
- **Consistent Icons:** If you use icons for some items in a group, try to use icons for all items in that group to maintain visual alignment.


---

<!-- Tab: Foundations: Iconography -->


---


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

*You should not manually set *`fontSize`*, *`width`*, or *`height`* on Sanity icons.** Instead, control size by placing the icon inside the appropriate typography component at the desired `size` prop value. The theme handles the rest.


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


---

<!-- Tab: Foundations: Color -->


---


# Color




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


---

<!-- Tab: Foundations: Typography -->


---


# Typography




## Best practices

**Do**


- Always use vertically stacked Text/Heading pairings with `<Stack>` or `<Flex>`. Text and Heading components require explicit vertical spacing between them because they have all vertical spacing stripped.
- Use `<Heading>` along with the `as` prop for all interface waypoints.

**Don’t**


- Don't replace text with icons for critical or complex topics.


---

<!-- Tab: Foundations: Spacing -->


---


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
| `6` | 52px | 3.25rem | **Use with caution: **Large spacing — section breaks |
| `7` | 84px | 5.25rem | **Use with caution: **Extra-large spacing |
| `8` | 136px | 8.5rem | **Use with caution: **Page-level spacing |
| `9` | 220px | 13.75rem | **Use with caution: **Largest step |


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


`/* padding={2} at small screens, padding={4} at 600px+ */`

`<Card padding={[2, , 4]}>Content</Card>`


`/* gap={2} at small screens, gap={3} at medium, gap={4} at large */`

`<Stack gap={[2, 3, 4]}>`

`  {items}`

`</Stack>`



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


---

<!-- Tab: Foundations: Accessibility -->


---


# Accessibility standards

This document helps designers and developers build accessible interfaces with Sanity UI components. It covers the rules you need to follow, the mistakes to avoid, and tested code patterns you can copy.


For guidelines on building or documenting Sanity UI components themselves, see `component-authoring-accessibility.md`.


---


## Do / Don't quick reference

Scan this list before building. Each rule links to a section below with full details and code examples.


**Landmarks and structure (§1)**


- ✓ Do wrap your content area in `Box `or` Flex as="main"`.
- ✓ Do wrap sidebars in `Box `or` Flex as="nav"` with `aria-label`.
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


- Sanity UI-POC handled reduced motion preferences. No additional work is needed.

**Touch targets (§6)**


- ✓ Do use Sanity UI `Checkbox`, `Radio`, or `Switch` for toggle inputs.
- ✓ Do use `gap={2}` or higher between adjacent buttons in toolbars.
- ✗ Don't use bare `<input type="checkbox">` or `<input type="radio">`. They render at 13×13px.
- ✗ Don't use bare `<input type="text">` with custom styling. Use `TextInput` instead.
- ✗ Don't place buttons with `gap={1}`. Target zones overlap below 24px spacing.

**Responsive reflow (§7)**


- ✓ Do add `flexWrap="wrap"` to every horizontal `Flex` that holds more than one child.
- ✓ Do set `overflow: 'hidden'` on the content Card.
- ✗ Don't use `width` with `flexShrink: 0` on sidebars. It creates a rigid column.
- ✗ Don't use `height: '100vh'` on the outer Flex. Use `minHeight: '100vh'`.
- ✗ Don't build a toolbar `Flex` without `flexWrap="wrap"`. It overflows at 320px.

**HTML lang (§8)**


- ✓ Do set `<html lang="en">` (or the correct code) in `index.html`.

---


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


Use the `as` prop on Card to render landmark elements:


`<Box as="nav" aria-label="Main navigation">...</Box>`

`<Box as="main">...</Box>`

`<Box as="aside" aria-label="Document inspector">...</Box>`


### Label landmarks when needed


| **Element** | **When to label** |
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


`/* ✗ Two h1 elements — screen readers cannot determine the page title */`

`<Box as="nav"><Heading as="h1" size={1}>My Studio</Heading></Box>`

`<Box as="main"><Heading as="h1" size={2}>Documents</Heading></Box>`


`/* ✓ One h1 for the page title — sidebar heading is h2 */`

`<Box as="nav"><Heading as="h2" size={1}>My Studio</Heading></Box>`

`<Box as="main"><Heading as="h1" size={2}>Documents</Heading></Box>`


### Always set the `as` prop

The Heading component renders a `<div>` by default. That has no heading role. Screen readers skip it.


`/* ✗ Looks like a heading but has no heading role */`

`<Heading size={2}>Page Title</Heading>`


`/* ✓ Renders as <h1> — screen readers find it */`

`<Heading as="h1" size={2}>Page Title</Heading>`


### Do not skip heading levels

Heading levels must descend in sequence: H1 → H2 → H3. Do not skip from H1 to H3. The `as` prop sets the semantic level. The `size` prop sets the visual size. They are independent.


**Rule: items in a list under an h1 are h2, not h3.** This is the most common heading skip. When a page title is `<Heading as="h1">` and you show a list of documents below it, each document heading must be `<Heading as="h2" size={1}>`. Use `size={1}` to make h2 look small. Never match `as` to the visual weight.


`/* ✗ Skips h2 — agents default to h3 for "small" list items */`

`<Heading as="h1" size={3}>All Documents</Heading>`

`<Card padding={3} border>`

`  <Heading as="h3" size={1}>Getting Started Guide</Heading>`

`</Card>`


`/* ✓ h2 follows h1 — use size={1} to make it look small */`

`<Heading as="h1" size={3}>All Documents</Heading>`

`<Card padding={3} border>`

`  <Heading as="h2" size={1}>Getting Started Guide</Heading>`

`</Card>`



---


## 3. Accessible names


### Icon-only buttons need `aria-label`

When a Button has only an icon and no `text` prop, it has no accessible name. The `tooltip` prop renders visible hover text but does not set `aria-label`. You must add it yourself.


`/* ✗ No accessible name — screen readers say "button" */`

`<Button icon={SearchIcon} mode="bleed" />`


`/* ✗ Tooltip does not set aria-label */`

`<Button icon={SearchIcon} mode="bleed" tooltip={{ content: 'Search' }} />`


`/* ✓ Screen readers announce "Search" */`

`<Button icon={SearchIcon} mode="bleed" aria-label="Search" />`



The same applies to MenuButton triggers:


`/* ✗ Trigger has no accessible name */`

`<MenuButton`

`  id="doc-menu"`

`  button={<Button icon={EllipsisVerticalIcon} mode="bleed" />}`

`  menu={<Menu><MenuItem text="Edit" /></Menu>}`

`/>`


`/* ✓ Trigger has aria-label */`

`<MenuButton`

`  id="doc-menu"`

`  button={`

`    <Button icon={EllipsisVerticalIcon} mode="bleed" aria-label="Document options" />`

`  }`

`  menu={<Menu><MenuItem text="Edit" /></Menu>}`

`/>`


### Form inputs need labels

A `placeholder` attribute is not a label. Screen readers may read it, but it vanishes when the user types.


`/* ✗ Placeholder is not a label */`

`<TextInput placeholder="Search content..." />`


`/* ✓ aria-label */`

`<TextInput placeholder="Search content..." aria-label="Search content" />`


`/* ✓ Visible label linked by id */`

`<Stack space={2}>`

`  <Label size={0} htmlFor="search-input">Search</Label>`

`  <TextInput id="search-input" placeholder="Search content..." />`

`</Stack>`


### Tooltips must not repeat the accessible name

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


The fix: **use **`tone="default"` for primary actions. For navigation menus, avoid using `selected` on MenuItems that display text content. Use a left border accent or bold text to mark the active item instead.


`mode="ghost"`** with **`tone="primary"`** does NOT always pass.** At 13px normal weight, the primary blue text (`#556bfc`) on the light blue ghost tint (`#e5edff`) produces 3.65:1 — below 4.5:1 AA. Ghost mode only passes for large or bold text. Do not use it for standard-size nav item text.


`/* ✗ Fails contrast — 4.29:1 (white on primary blue) */`

`<Button tone="primary" text="New document" />`


`/* ✗ Fails contrast — selected MenuItem uses primary blue background */`

`<MenuItem text="Documents" selected />`


`/* ✗ May fail contrast — ghost primary at standard font sizes (3.65:1) */`

`<Button tone="primary" mode="ghost" text="Nav item" />`


`/* ✓ Passes — use tone="default" for buttons */`

`<Button tone="default" text="New document" />`


### Do not build custom colored elements with white text

Agents sometimes build custom avatar circles, status badges, or nav items using hardcoded background colors from the palette with white text. Many palette colors fail contrast at small text sizes:


| **Color** | **Hex** | **White text contrast** | **Passes AA at 13px?** |
| --- | --- | --- | --- |
| Primary blue | `#556bfc` | 4.29:1 | ✗ No |
| Positive green | `#04b97a` | 2.55:1 | ✗ No |
| Caution yellow | `#d28a04` | 2.96:1 | ✗ No |


Use the Sanity UI `Avatar` component for user initials — it handles contrast. For status indicators, use `Badge` with a `tone` prop. Do not build custom elements with `background: <palette color>` and `color: white`.


### Pair semantic color with a non-color indicator

Color must not be the only way to convey meaning. Every use of `tone="positive"`, `tone="caution"`, or `tone="critical"` must include an icon, a text label, or both (WCAG 1.4.1 A).


`/* ✗ Color alone — users with color vision differences miss the meaning */`

`<Button tone="critical" text="Delete" />`


`/* ✓ Icon reinforces the meaning */`

`<Button tone="critical" text="Delete" icon={TrashIcon} />`


### Do not add `aria-selected` to plain `<div>` elements

The `aria-selected` attribute is only valid on elements with roles like `option`, `row`, `tab`, `gridcell`, or `treeitem`. A `<div>` with no explicit role cannot carry `aria-selected`. Automated tests flag this as a critical violation (WCAG 4.1.2 A).


Card's `selected` prop sets `data-selected` for styling. It does NOT set `aria-selected`. If you need a selectable list of Cards, either:


- Use `role="listbox"` on the container and `role="option"` on each Card, which allows `aria-selected`.
- Or skip `aria-selected` and use `aria-current="true"` to mark the active item. `aria-current` is valid on any element.

---


## 5. Reduced motion


### Add the global override to every project

Sanity UI Button, MenuButton, and other interactive parts apply `transition-duration: 0.1s` for hover states through styled-components. These transitions do not respect `prefers-reduced-motion` at the library level. You must add a global CSS override. **This is required — not optional.**


Create `src/reduced-motion.css`:


`@media (prefers-reduced-motion: reduce) {`

`  *, *::before, *::after {`

`    animation-duration: ``0``.``01ms ``!important;`

`    animation-iteration-count: ``1 ``!important;`

`    transition-duration: ``0``.``01ms ``!important;`

`    scroll-behavior: auto !important;`

`  }`

`}`



Import it in your entry file:


`// main.tsx`

`import './reduced-motion.css'`



The `0.01ms` value triggers transition-end events that some components rely on, but it is fast enough to count as instant. Automated tests treat any duration under 1ms as passing.


Without this file, every Button on the page will fail the motion accessibility test.


---


## 6. Touch targets


### Minimum 24×24 CSS pixels

All interactive targets must meet 24×24 CSS pixels (WCAG 2.5.8 AA). Inline links within paragraph text are exempt.


### Keep 24px spacing between adjacent targets

The 24×24px rule applies to the clickable area, not only the visual size. When buttons sit next to each other in a toolbar, each button must have at least 24px of unobscured clickable space. Buttons placed with `gap={1}` (4px) may overlap each other's target zones. Use `gap={2}` (8px) or higher between adjacent buttons in toolbars and action rows.


`/* ✗ Buttons too close — target zones overlap */`

`<Flex gap={1}>`

`  <Button icon={AddIcon} mode="bleed" aria-label="New document" />`

`  <Button icon={CloseIcon} mode="bleed" aria-label="Hide navigation" />`

`</Flex>`


`/* ✓ Enough space between targets */`

`<Flex gap={2}>`

`  <Button icon={AddIcon} mode="bleed" aria-label="New document" />`

`  <Button icon={CloseIcon} mode="bleed" aria-label="Hide navigation" />`

`</Flex>`


### Do not use bare native inputs

Browser-default `<input type="checkbox">` and `<input type="radio">` render at about 13×13px. Use the Sanity UI `Checkbox`, `Radio`, or `Switch` components instead — they render at compliant sizes.


Bare `<input type="text">` elements with custom styling can also fall below the 24px minimum height. Use `TextInput` from `@sanity/ui` instead — it renders at compliant sizes and handles theming. If you must use a native input, set `min-height: 24px` and use `padding` to reach the target size.


If you must use a native checkbox or radio, wrap it in a `<label>` with enough padding to reach 24×24px, or apply CSS to set `width` and `height` to at least 24px.


---


## 7. Responsive layout — 320px reflow

Layouts must work at 320px viewport width with no horizontal scrolling (WCAG 1.4.10 AA). This simulates 400% zoom on a 1280px screen.


**Every **`<Flex>`** with more than one child must have **`flexWrap="wrap"`**.** This applies at every level of the component tree — the outer layout Flex, the toolbar Flex inside the content area, the actions row inside a card, and any other horizontal row. A single non-wrapping Flex is enough to cause overflow at 320px. There are no exceptions.


**Reflow checklist.** Before shipping, confirm each of these. A single missed item causes the test to fail.


- Outer layout Flex has `flexWrap="wrap"`
- Sidebar uses `flex: '1 1 100%'` with `maxWidth`, not `width` with `flexShrink: 0`
- Content Card has `overflow: 'hidden'`
- Toolbar Flex (heading + buttons) has `flexWrap="wrap"` and `gap={2}`
- Every actions row inside a Card has `flexWrap="wrap"`
- Outer Flex uses `minHeight: '100vh'`, not `height: '100vh'`
- No Flex child uses a fixed `px` width without a `maxWidth` fallback

### The pattern that fails every time

`/* ✗ Fixed sidebar + 100vh forces overflow at 320px */`

`<Flex style={{ height: '100vh' }}>`

`  <Card style={{ width: '260px', flexShrink: 0 }}>Sidebar</Card>`

`  <Card flex={1}>Content</Card>`

`</Flex>`



At 320px, the 260px sidebar plus any content exceeds the viewport.


### The pattern that passes

`/* ✓ Sidebar stacks above content at narrow widths */`

`<Flex flexWrap="wrap" minHeight="100vh">`

`  <Flex`

`    as="nav"`

`    aria-label="Main navigation"`

`    flexShrink={1}`

`    flexGrow={1}`

`    flexBasis="100%"`

`    maxWidth="260px"`

`    padding={3}`

`  >`

`    Sidebar`

`  </Flex>`

`  <Flex `

`    as="main" `

`    flexShrink={1}`

`    flexGrow={1}`

`    flexBasis="0"`

`    minWidth="0"`

`    overflow="hidden"`

`    padding={4}`

`  >`

`    Content`

`  </Flex>`

`</Flex>`


### Key differences


| **Prop** | **Fails** | **Passes** |
| --- | --- | --- |
| Container | `Flex` (no wrap) | `Flex flexWrap="wrap"` |
| Sidebar sizing | `width: '260px', flexShrink: 0` | `Flex flexShrink={1} flexGrow={1} flexBasis="100%" maxWidth="260px"` |
| Container height | `height: '100vh'` | `minHeight="100vh"` |
| Content card | `flex={1}` | `Flex flexShrink={1} flexGrow={1} flexBasis="0" minWidth="0" overflow="hidden"` |


**Do not use **`flexShrink: 0` on sidebars. It prevents the sidebar from shrinking below its width.


**Do not use **`height: '100vh'` on the outer Flex. Use `minHeight: '100vh'`. A fixed height stops the container from growing when content stacks.


**Always set **`overflow: 'hidden'` on the content Card. Long headings or button rows can push the page `scrollWidth` past the viewport.


### Toolbar rows must wrap — this is the most common remaining failure

**Every test run fails this check.** The toolbar Flex inside the content overflows at 320px because agents forget `flexWrap="wrap"` on the inner Flex even when the outer layout Flex has it. The outer layout handles sidebar stacking. The inner toolbar handles heading + button wrapping. Both need `flexWrap="wrap"` independently.


**Copy this exact toolbar pattern into every content area:**


`/* ✗ FAILS EVERY TIME — no wrap on toolbar Flex */`

`<Flex as="main" overflow="hidden" flexGrow={1} flexShrink={1} flexBasis="100%" minWidth="0"  padding={4}>`

`  <Flex alignItems="center" justifyContent="space-between">`

`    <Heading as="h1" size={2}>All Documents</Heading>`

`    <Button text="New document" icon={AddIcon} />`

`  </Flex>`

`</Flex>`


`/* ✓ PASSES — flexWrap="wrap" and gap={2} on toolbar Flex */`

`<Flex as="main" overflow="hidden" flexGrow={1} flexShrink={1} flexBasis="100%" minWidth="0" padding={4}>`

`  <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>`

`    <Heading as="h1" size={2}>All Documents</Heading>`

`    <Button text="New document" icon={AddIcon} tone="default" />`

`  </Flex>`

`</Flex>`



The difference is one prop: `flexWrap="wrap"` on the toolbar `Flex`. Without it, the heading and button sit in a single non-breaking row that exceeds 320px. With it, the button flows to the next line at narrow widths.


**If you build a toolbar row with a heading and a button, add **`flexWrap="wrap"`** and **`gap={2}`**.** This applies to every toolbar in the app — the content header, card action rows, and any other horizontal grouping of heading + buttons.


---


## 8. HTML lang attribute

Every page must declare its language on `<html>` (WCAG 3.1.1 A).


`<!DOCTYPE html>`

`<html lang=``"``en``"``>`

`  <head>...</head>`

`  <body>...</body>`

`</html>`



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


`<ThemeProvider theme={theme}>`

`  <Flex flexWrap="wrap" style={{ minHeight: '100vh' }}>`

`    {/* Sidebar — <nav> landmark */}`

`    <Flex`

`      as="nav"`

`      aria-label="Main navigation"`

`      padding={3}`

`      flexShrink={1}`

`      flexGrow={1}`

`      flexBasis="100%"`

`      maxWidth="260px"`

`    >`

`      <Stack space={3}>`

`        <Heading as="h2" size={1}>Navigation</Heading>`

`        {/* nav items */}`

`      </Stack>`

`    </Flex>`


`    {/* Content — <main> landmark */}`

`    <Flex as="main" flexShrink={1} flexGrow={1} flexBasis="0" overflow="hidden" padding={4}>`

`      {/* Toolbar — wrap prevents overflow at 320px */}`

`      <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>`

`        <Heading as="h1" size={2}>Page Title</Heading>`

`        <Button text="New document" icon={AddIcon} tone="default" />`

`      </Flex>`


`      {/* Document list — h2 follows h1, not h3 */}`

`      <Stack space={3} marginTop={4}>`

`        {documents.map(doc => (`

`          <Card key={doc.id} padding={3} border radius={2}>`

`            <Heading as="h2" size={1}>{doc.title}</Heading>`

`          </Card>`

`        ))}`

`      </Stack>`

`    </Flex>`

`  </Flex>`

`</ThemeProvider>`



**What this gives you:**


| **Feature** | **How** |
| --- | --- |
| Landmarks | `Flex as="nav"` and `Flex as="main"` |
| Heading hierarchy | One `<h1>` for the page title. `<h2>` for sidebar heading, list items, and sections. Never skip to `<h3>`. Never use two `<h1>` elements. |
| Page language | Set `<html lang="en">` in `index.html` |
| Responsive reflow | `flexWrap="wrap"` + flex sizing (no fixed widths) |
| Toolbar wrap | `flexWrap="wrap"` on toolbar Flex |
| Target spacing | `gap={2}` or higher between adjacent buttons in toolbars |
| Contrast | `tone="default"` instead of `tone="primary"`. Do not hardcode `#556bfc` with white text. |
| Overflow clip | `overflow="hidden"` on content Flex |


---

<!-- Tab: Foundations: Content -->


---


# Product content standards

This file sets rules for the words, labels, messages, and short copy inside UI parts. It tells you what end users should read: button labels, menu items, tooltip text, error messages, empty states, confirm dialogs, placeholder text, and status messages.


`documentation-standards.md` tells how authors write the *docs* (section layout, table format, source style). This file is for designers, engineers, and content reviewers who pick the words inside Sanity UI parts.


Both files work as a pair. `content-standards.md` keeps the docs steady. `product-content-standards.md` keeps the product steady. When a part doc has a "Content" or "Content Guidelines" section, its rules must match the standards here.


---


## Standards by content type


### P1: Labels and actions

Labels name the action on buttons, menu items, tabs, links, and other controls. Users read labels to know what happens before they act.


#### Rules

1. **Start with a verb.** Write labels that say what the user does. Use "Publish," "Edit," "Upload image" — not "Publishing," "Editor," or "Image upload."

  1. *Derives from:*
    1. Button Content ("Start with verbs. Describe the action")
    1. Tooltip Content Guidelines ("Start with a verb if describing an action")
    1. Menu Content Guidelines ("Use verbs that describe the action")
    1. Layouts Action button guidelines ("Button labels should be verb-led")
    1. Popover Content Guidelines ("If the popover contains a menu, use verbs for labels")

1. **Be short.** Aim for 1–3 words on button labels. Keep menu item labels to 1–3 words. Use 1–2 words for nav group labels. Overflow menu items may run up to 5 words because they must stand alone without icons or tooltips.

  1. *Derives from:*
    1. Button Content ("Labels should be short and clear")
    1. Menu Content Guidelines ("Keep MenuItem text short (1-3 words)")
    1. Layouts Labeling groups ("Labels should be short — one or two words")
    1. Layouts Action button guidelines ("aim for two words or less")
    1. Layouts Overflow menus ("The label should stand on its own")

1. **Use sentence case.** Cap only the first word and proper nouns. Write "Add item," not "Add Item." Write "Save to board," not "Save To Board."

  1. *Derives from:*
    1. Button Content ("Use sentence case")
    1. Text Content ("Use sentence case for UI labels and body text")
    1. Tooltip Content Guidelines ("Use sentence case")
    1. Popover Content Guidelines ("Use sentence case")
    1. Menu Content Guidelines ("Use sentence case for all menu items")
    1. Heading Content ("Use sentence case for headings")
    1. Layouts Labeling groups ("Labels should use sentence case")

1. **Name the action.** Do not use vague labels like "Click here," "Submit," "Go," or "OK." The label must say what will happen. "Upload image" beats "Submit." "Delete 3 items" beats "Confirm."

  1. *Derives from:*
    1. Button Content ("Avoid vague labels")
    1. Button Best practices ("Don't use vague labels like 'Click here'")
    1. Layouts Action button guidelines ("Avoid vague labels like 'Click here', 'Submit', 'Go', or 'OK'")

1. **Use plain, clear words for critical actions.** Give destructive actions strong verbs: "Delete," "Remove," "Discard." Do not soften destructive labels. Give safe actions clear verbs: "Publish," "Confirm," "Complete."

  1. *Derives from:*
    1. Button Tone table ("critical" tone pairs with "Delete, Remove")
    1. Layouts Confirmation for destructive actions ("The confirm button repeats the destructive action's name")

1. **Name the group, not the action, for group labels.** Nav group labels name what the items are, not what the user does with them. Use "Documents" instead of "Manage documents." Use "Team" instead of "View team members."

  1. *Derives from:* Layouts Labeling groups ("Labels should name the kind of items, not the action done on them").

1. **Overflow menu labels must stand alone.** When an action goes into an overflow menu, its label must make sense on its own — no icon, no tooltip. Use "Export as CSV" instead of "Export."

  1. *Derives from:* Layouts Overflow menus ("Overflow menu items use a label only — no tooltips, no icons. The label must stand on its own").

1. **Toggle labels must show the next action.** When a button toggles state (show/hide, expand/collapse), write the `aria-label` and tooltip to say what happens next — not what is true now. Sidebar shown → "Hide nav." Sidebar hidden → "Show nav."

  1. *Derives from:* Layouts Toggling sidebars ("The button's aria-label and tooltip should update to match the action").

#### Quick reference


| **Part** | **Length target** | **Verb-first** | **Sentence case** | **Sample** |
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

  1. *Derives from:* Tooltip Content Guidelines ("Limit text to 60–75 characters").

1. **Start with a verb when naming an action.** If the tooltip says what a button does, lead with the verb: "Edit profile," not "Profile editor." If the tooltip adds info (not an action), a short phrase works.

  1. *Derives from:* Tooltip Content Guidelines ("Start with a verb if describing an action").

1. **Use sentence case.** Cap only the first word and proper nouns.

  1. *Derives from:* Tooltip Content Guidelines ("Use sentence case").

1. **No dots on fragments.** Do not end tooltip fragments with a dot. If the tooltip holds a full sentence, add a dot as normal.

  1. *Derives from:* Tooltip Content Guidelines ("Avoid dots at the end of fragments. Only add dots if the tooltip holds full sentences").

1. **Do not restate shown text.** If the button says "Delete," write a tooltip that adds more ("Delete this document and all its links"). Do not repeat "Delete."

  1. *Derives from:* Tooltip When not to use ("Do not use when you restate text already shown on screen").

1. **Do not put tooltips on disabled buttons.** Disabled buttons drop out of the tab order. Keyboard users cannot reach them, and the tooltip stays hidden. Use a nearby note or info icon instead.

  1. *Derives from:*
    1. Tooltip ("Never attach a tooltip to a disabled button")
    1. Button ("Avoid tooltips on disabled buttons")
    1. Layouts ("Do not rely on tooltips — disabled buttons leave the tab order")

1. **All icon-only buttons need a tooltip.** When a button has no shown text, add a tooltip for sighted users. Pair it with an `aria-label` for screen readers. Both are needed.

  1. *Derives from:*
    1. Button Best practices ("Add tooltips to icon-only buttons")
    1. Iconography ("Always pair standalone icons with a Tooltip")
    1. Layouts ("All icon-only buttons must have an aria-label and a paired tooltip")

1. **The tooltip must not repeat the **`aria-label`**.** If the `aria-label` says "Close dialog," the tooltip must either match it (fine) or say more. It must never clash with the `aria-label`.

  1. *Derives from:* Tooltip ("Make sure the tooltip does not repeat the aria-label. If the button reads 'Settings,' the tooltip should say more").

1. **All action buttons with a text label need a tooltip that adds detail.** The tooltip grows the label: "Export" → "Export all items as a CSV file."

  1. *Derives from:* Layouts ("All action buttons should have a tooltip that adds detail").

---


### P3: Error messages

No part doc yet has error message rules in its "Content" section. This standard draws on best practices and patterns from other docs. Parts that need error message help: TextInput, Dialog, Card (with `tone="critical"`), and Toast.


#### Rules

1. **Name the problem in plain words.** Tell the user what went wrong. Do not show error codes, jargon, or stack traces in the UI. "The image failed to upload" works. "Error 413: Payload over limit" does not.

1. **Tell the user what to do next.** Each error message must have a next step — what the user can do to fix it. "The image failed to upload. Try a file under 10 MB." The pattern: *what went wrong* + *what to do about it*.

1. **Do not blame the user.** Keep it neutral. "This file type is not allowed" — not "You sent a bad file." Frame the error as a state, not a fault.

1. **Be exact.** "Something went wrong" is a last resort. Name the thing and what failed: "Could not save the document. The server did not answer."

1. **Use sentence case.** Error messages follow the same casing rule as all other UI text.

1. **Keep error messages under two sentences.** If the problem needs more, link to docs or offer a "Details" toggle.

1. **Pair **`tone="critical"`** with an icon.** When showing errors in Cards, Buttons, or Toasts, use `tone="critical"` and add `ErrorOutlineIcon`. Do not rely on color alone.

  1. *Derives from:*
    1. Button Best practices ("Pair tones with an icon that matches")
    1. Card Variants ("Pair Card tone values with an icon that matches")
    1. Color Principles ("Never rely on color alone to show meaning")

#### Components that need error message guidance


| **Part** | **Why** |
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

1. **Tell the user how to fill the space.** The next line gives an action or a call-to-action button. "Create your first document" — not "Get started."

  1. *Derives from:* Layouts Empty states ("Put a clear call-to-action in the middle of the content space: 'Create your first document,' not 'Get started'").

1. **Structure: what + why + action.** An empty state has at most three parts:

  1. What the space will hold.
  1. A one-line reason why it's empty (optional).
  1. A call-to-action button using P1's verb-first label rules.

1. **Use a warm, helpful tone.** Empty states are a chance to help, not to alarm. Avoid "Error: no data." Use "No documents yet. Create one to get started."

1. **Center empty state text.** Put the copy in the middle of the content space. Set `align="center"` on Text parts inside the empty state.

  1. *Derives from:* Text Variants Align ("Copy within a center content block, such as an empty state").

1. **Use Text **`size={1}`** for empty state messages.** Empty state text is low-priority.

  1. *Derives from:* Text Variants Size ("Non-critical messages, such as Toasts and empty states" maps to `size={1}`).

#### Components that should document empty state guidance


| **Part** | **Why** |
| --- | --- |
| Layouts | Already has layout empty state rules; needs content rules for the text within |
| Card | Cards can contain lists that may be empty |
| Menu | A menu with no items needs an empty state |


---


### P5: Confirm dialogs

Confirm dialogs ask the user to check an action before it runs. The Layouts doc covers patterns for destructive actions. This standard widens the pattern to cover all confirms.


#### Rules

1. **The question names the action and the thing.** "Delete 'About us' page?" — not "Are you sure?" The user must know what will happen from the dialog title alone.

  1. *Derives from:* Layouts ("a confirm dialog that states what will happen").

1. **The confirm button repeats the action verb.** If the dialog asks "Delete 3 items?", the confirm button says "Delete 3 items" — not "Confirm," "Yes," or "OK."

  1. *Derives from:* Layouts ("The confirm button repeats the action's name — 'Delete 3 items,' not 'Confirm' or 'Yes'").

1. **The cancel button says "Cancel."** Do not use "No," "Go back," "Never mind," or "Dismiss." All users know "Cancel."

1. **Destructive confirm buttons use **`tone="critical"`**.** The look reinforces the weight of the action.

  1. *Derives from:* Layouts ("The confirm button should also use tone='critical'").

1. **Add a brief note when the outcome is unclear.** If the action has side effects, state them in the dialog body. Keep to one or two sentences. Like: "Deleting this document will also remove 12 links to it."

1. **Use sentence case for dialog titles and body text.** The same casing rule holds for all parts.

---


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


---


### P7: Status messages

Status messages are toast notices, inline markers, and loading notes. They tell the user what happened or what a task is doing.


#### Rules

1. **Name the action and its result.** "Document published" — not "Success." "3 items deleted" — not "Done." Users must know what happened without thinking back to what they had clicked.

1. **Use past tense for done actions.** Write "Published," "Saved," "Deleted." Use "-ing" for actions not yet done: "Publishing…," "Saving…"

1. **Keep status messages under one sentence.** Toast messages must be easy to read at a glance. If more is needed, add a link to the item or a "Details" link.

1. **Fire a Toast for actions that take over three seconds.** When a task ends after loading for more than three seconds, show a Toast to tell the user. Do not rely on the button going back to its on state — the user may have moved on.

  1. *Derives from:*
    1. Button Loading state ("For tasks over three seconds, trigger a Toast when the action finishes")
    1. Layouts Loading states ("trigger a Toast when the action completes")

1. **Use **`tone`** to match the status.** Good outcomes use `tone="positive"`. Warnings use `tone="caution"`. Failures use `tone="critical"`. Add the matching icon.

  1. *Derives from:* Card Tone table, Button Tone table, Color Principles ("Color carries meaning").

1. **Loading messages must name the task, not say "Loading."** Write "Publishing document…" or "Uploading image…" when the task is known. Use "Loading…" only when you do not know the task.

1. **Use sentence case.** Applies to all status messages.

1. **Use Text **`size={1}`** for toast and status messages.** Status messages are low-rank, short-lived words.

  1. *Derives from:* Text Variants Size (`size={1}` is for "small messages, such as Toasts and empty states").

---


### P8: Casing and format

Casing and format rules apply to all content types. They appear here once. All other standards point to them.


#### Rules

1. **Sentence case for all text.** All UI text uses sentence case: button labels, menu items, tooltips, headings, tab labels, group labels, error messages, empty states, placeholders, and status notes. Cap the first word and proper nouns only.

  1. *Derives from:*
    1. Button ("Use sentence case")
    1. Text ("Use sentence case for UI labels and body text")
    1. Tooltip ("Use sentence case")
    1. Popover ("Use sentence case")
    1. Menu ("Use sentence case for all menu items")
    1. Heading ("Use sentence case for headings")
    1. Layouts ("Labels should use sentence case")

1. **When not to use sentence case.** Proper nouns (Sanity, GitHub, GROQ), short forms (CSV, JSON, URL, UUID), and brand names keep their own casing. Never use all-caps text (like "MEDIA LIBRARY").

1. **No dots on short bits.** Button labels, menu items, tooltip bits, headings, and group labels do not end with a dot. Full sentences in body text, error messages, and dialog text do get dots and other marks.

  1. *Derives from:*
    1. Tooltip ("Avoid periods at the end of fragments")
    1. Heading ("Do not end headings with a dot unless it is a question")

1. **No "!" marks in UI text.** Product copy keeps a calm, clear tone. Save "!" marks for sales copy — not buttons, errors, or status messages.

1. **Use figures, not words, for counts.** "Delete 3 items" — not "Delete three items." Users read figures faster in UI text.

1. **Use the Oxford comma in lists.** When a line lists three or more items, put a comma before "and" or "or" to keep the meaning clear.

---


### P9: Internationalization considerations

Sanity UI is used around the world. Write all text for translation, even when the source is English.


#### Rules

1. **Allow 30–50% growth for translated labels.** German, Finnish, and other languages often make labels 30–50% longer than English. A two-word English button may grow to four words in German. Plan layouts for this growth — do not treat the English length as the cap.

1. **Avoid text placed in code.** Make all user-facing strings easy to pull out. Do not hard-code labels, error messages, or status text in JSX. Pass them as props or through a locale file.

1. **Do not join strings to build sentences.** "You have " + count + " items" breaks in languages where word order is not the same. Use template strings with slots a translator can move: "You have {count} items."

1. **Support RTL scripts.** Labels, tooltips, error messages, and all other text must look right in right-to-left languages (like Hebrew). Use `inline-start` and `inline-end` in place of `left` and `right`.

  1. *Derives from:*
    1. Text Variants Align ("`left` for LTR, `right` for RTL")
    1. Heading Best practices ("Start-align headings (left in LTR languages)")

1. **Avoid sayings and word games.** "Hit the ground running," "low-hanging fruit," and "out of the box" do not translate well. Use plain, straight words.

  1. *Aligns with:* Text Content ("Avoid jargon, acronyms, and hard sentences. Aim for an 8th-grade reading level").

1. **Test labels at their longest.** When building a part, test with the longest likely translated string (such as a 50%-longer German form). Check that the layout does not break, clip text, or push buttons off screen.

---


### P10: Truncation

Truncation is a last resort. All parts that handle text overflow must follow clear rules about when and how to truncate.


#### Rules

1. **Shorten the text before clipping.** The best clip is no clip at all. If users can change the text (like a title they typed), you may need to cut it. If the system sets the text (like a button label), write it shorter.

  1. *Derives from:*
    1. Heading TextOverflow ("Before truncating, try to shorten the text. The best truncation is no truncation")
    1. Text TextOverflow ("Before truncating, try to shorten the text")

1. **Use ellipsis (**`…`**) to show clipping.** The default `textOverflow="ellipsis"` works for most cases. Do not use `clip` unless the cut part is only for looks.

  1. *Derives from:* Button API (`textOverflow` defaults to `'ellipsis'`).

1. **Show the full text with a Tooltip or **`title`**.** When you clip text, let the user see the full string on hover or focus. Use the Tooltip part or the HTML `title` tag.

  1. *Derives from:*
    1. Heading TextOverflow ("make sure the full text is within reach via Tooltip or title tag")
    1. Text TextOverflow (same rule)

1. **Save clipping for user-made or changing text.** Write system-set labels (buttons, menu items, section headings) short enough to never clip. Clipping is for text the system cannot control: user-typed titles, machine-made IDs, and long web links.

  1. *Derives from:*
    1. Text TextOverflow ("Text that is user/machine made and edge cases may exist")
    1. Heading TextOverflow (same)

1. **Clipping in grids and lists.** When grid or list items would cause odd sizes or layout jumps if they wrapped, clipping works. Make sure users can still see the full text.

  1. *Derives from:*
    1. Text TextOverflow ("Text within a grid where wrapping would cause odd sizes or shifts")
    1. Heading TextOverflow (same)

---


## Part Content sections to update

All items from the initial audit have been resolved. The table below tracks only remaining work — docs not yet written, and Box/Flex layout primitives that still need minimal Content sections.


| **Document** | **Standard** | **What needs to change** |
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


---

<!-- Tab: Stretch: Error validation -->


---


---

<!-- Tab: Stretch: Layouts -->


---


# Layout guidelines


**Choosing a layout primitive:**


| **Component** | **Direction** | **Key props** | **Use case** |
| --- | --- | --- | --- |
| Flex | Any (default: row) | `flexDirection`, `alignItems`, `justifyContent`, `flexWrap`, `gap` | Rows, columns with alignment, responsive direction changes |
| Stack | Vertical only | `space` | Simple vertical column with even spacing |
| Grid | Two-axis | `gridTemplateColumns`, `gridTemplateRows`, `gap` | Grid-based layouts |
| Inline | Horizontal | `space` | Tags, chips, inline groups that wrap |
| Box | None (block) | `padding` | General container for spacing and visual styling |


| **Component** | **Direction** | **Spacing prop** | **Wrapping** | **CSS model** | **Use case** |
| --- | --- | --- | --- | --- | --- |
| Stack | Vertical only | `space` | None | CSS Grid | Vertical column of items |
| Flex | Any | `gap` + alignment | Optional | Flexbox | Rows, columns, or mixed layouts |
| Grid | Two-axis | `gap` + columns/rows | Implicit | CSS Grid | Grid-based layouts |
| Inline | Horizontal | `space` | Wraps by default | Flexbox | Tags, chips, inline groups |


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
  - **Desktop**: All sidebars are visible when present in the layout type.
  - **Tablet**: The Navigation sidebar transforms into a fixed top bar spanning the full width. The inspection sidebar remains as a sidebar. Navigation between views is accessed through a `<MenuButton />` in the Content controls bar.
  - **Mobile**: Only the Content section is displayed by default. Application controls are accessed through a popover menu triggered by a `<MenuButton />`. Content inspector is displayed as a sheet when an item is selected.

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

This layout supports a multi-view application with persistent navigation and actions. It’s ideal for more organized and fine-grained management of content.


[https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/52929b4932b2ce4220010c04a152f45ec8968d98-2460x1684.png](https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/52929b4932b2ce4220010c04a152f45ec8968d98-2460x1684.png)







#### When to use

- When an application has more than one page/view to navigate across.

#### When NOT to use

- When an application has only one view and requires no navigation. Use Shell, Shell with Toolbar, or Shell with Inspector instead.
- When at least one page/view in the application needs a dedicated area to view/edit metadata. Use Shell with Navigation and Inspector instead.

### Shell with Navigation and Inspector

This layout supports a multi-view application with persistent navigation, actions and viewing/editing of content metadata. It’s ideal for more organized and fine-grained management of content and its metadata. **Note:** It’s recommended to hide the Inspector sidebar on pages/views where it’s not used.


[https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/d7ac09129bd1fd904410122297e346ef8d947a57-2460x1684.png](https://cdn.sanity.io/images/canvases/cac1Na6lwtEI/d7ac09129bd1fd904410122297e346ef8d947a57-2460x1684.png)







#### When to use

- When an application has more than one page/view to navigate across and at least one page/view in the application needs a dedicated area to view/edit metadata.

#### When NOT to use

- When an application has only one view and requires no navigation. Use Shell with Inspector instead.
- When all editing of content metadata can be handled in the main content window. Use Shell with Navigation instead.

## 


## Layout components


### Navigation sidebar

The Navigation sidebar’s purpose is to orient the user, navigate through key views and perform critical application-level actions. It should only be used when the application has multiple pages/views that require navigation.


- Navigation sidebar utilizes the `<Column />` component and it always inline-start aligned within the layout
- It should take up 20% of the screen width in desktop/tablet devices–with a minimum width of 240px and a maximum width of 320px
- It should fill the full height of its parent
- It should have an inline-end border to act as a visual break between it and the main content window

It is composed of three sub-components:


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
- Navigation Header Actions should be focused on actions that impact application-. Examples include:
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

## 


## Navigation

All application navigation lives in the Navigation sidebar. There are no secondary navigation bars, no in-content navigation panels, and no additional sidebars dedicated to navigation. The Navigation sidebar is the single, persistent location where users move between views. This constraint exists for three reasons:


1. **Predictability**: Users always know where to go to navigate. There is no ambiguity about which part of the interface controls where they are.
1. **Simplicity**: A single navigation surface eliminates the cognitive overhead of understanding multiple navigation models on the same screen.
1. **Scalability**: One well-structured sidebar can accommodate simple and complex information architectures without introducing new layout patterns.

Each pattern is designed for a specific purpose. Navigational patterns should not be mixed. When an application has hierarchical content—such as categories containing subcategories containing items—that hierarchy is represented *within* the sidebar. It is not split across multiple panels or surfaces. The sidebar adapts to show depth. The layout does not grow new navigation regions.


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
- Labels should describe the *category* of the items, not the action performed on them. Use "Documents" instead of "Manage documents". Use "Team" instead of "View team members".
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
1. **Destructive actions** (`tone="critical"`): Actions that delete, remove, or irreversibly alter content. They use `tone="critical"` and should include an `ErrorOutlineIcon` via the `icon` prop to reinforce the action for people with color vision issues. A destructive action can be secondary or tertiary, but should never be the primary action (`mode="default"`) in a given area.

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
- **Icons in buttons**: Icons should not be combined with text labels except in two specific cases. First, to visually reinforce buttons with `tone="positive"`, `tone="caution"`, or `tone="critical"`—pair with `<CheckmarkIcon />`, `<WarningOutlineIcon />`, or `<ErrorOutlineIcon />` respectively. Second, to create additional emphasis on a primary action—this should be reserved for only the most critical use cases. Icons should not replace labels except in high-density spaces (such as toolbars) where the icon is universally understood (example: a magnifying glass for search) *and* space is constrained. Every icon-only button must have an `aria-label` and a paired tooltip.
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
- When a disabled state *is* used, provide context through an adjacent info icon or inline status message that explains why the action is unavailable and what steps the user can take to enable it (example: "Select at least one item to export"). Do not rely on tooltips for this—disabled buttons are removed from the tab order, making tooltips inaccessible to keyboard users.
- In empty states where no content exists, a single prominent call-to-action should be placed in the center of the Content display area. This action should directly address the empty state (example: "Create your first document" rather than "Get started").

## 


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


---

<!-- Tab: For agents -->


---


---

<!-- Tab: Type checking -->


---


# Type checking

Build tools like Vite and esbuild strip TypeScript types without checking them. Your app compiles and runs even when type errors exist. The most common result: you pass a prop to a component, it gets ignored, and nothing tells you.


Run the TypeScript compiler to catch these:


`npx tsc --noEmit`



This checks every `.ts` and `.tsx` file without producing output. It exits with a non-zero code if errors exist.


### What it catches

**Card layout props** — Card ignores `flexGrow`, `minWidth`, `overflow`, and other layout props at runtime. No error appears. `tsc` flags them:


`// ✗ — renders but layout silently breaks`

`<Card flexGrow={1} overflow="auto">...</Card>`

`// tsc: Property 'flexGrow' does not exist on type 'CardProps'.`



**Removed UI 3 props** — `padding`, `radius`, `shadow`, `border`, `selected`, and `scheme` no longer exist on Card. `tsc` catches each one.


**Wrong prop on wrong component** — `Flex` uses `gap`. `Stack` uses `space`. Swapping them does nothing at runtime. `tsc` flags the mismatch.


### Setup

Add to `package.json`:


`{`

`  ``"scripts"``: {`

`    ``"typecheck"``: ``"tsc --noEmit"`

`  ``}`

`}`



Run `npm run typecheck` after setup, after code changes, and before review. For CI, chain it before your build:


`{`

`  ``"scripts"``: {`

`    ``"build"``: ``"tsc --noEmit && vite build"`

`  ``}`

`}`



Make sure `tsconfig.json` has `"strict": true` — without it, many prop mismatches go unreported.


---

<!-- Tab: Friction points for agents -->


---


# Friction points for agents

This document covers the specific mistakes agents make when building with the Sanity Design System. Every friction point below appeared in multiple iterations.


---


## 1. The `styles.css` import is always forgotten

Every single iteration (10/10) failed the `require-styles-import` lint rule. Without `import '@sanity-labs/ui-poc/styles.css'` at the app entry point, all layout and typography components render as unstyled HTML. No error is thrown. No warning appears.


**What to do:**


Add this import before any component code runs:


`import '@sanity-labs/ui-poc/styles.css'`



Place it in `main.tsx` or your app entry file. It must come before component rendering.


---


## 2. Card does not accept layout props

Raised in 10/10 iterations. Agents pass `flexGrow`, `width`, `overflow`, `padding`, `minWidth`, or `position` to Card. All are silently ignored. No TypeScript error. No runtime warning. The layout breaks with no signal.


**What to do:**


Wrap Card in a Box or Flex for layout control. Card handles appearance (`density`, `tone`). The wrapper handles position and sizing.


`// ✗ — flexGrow on Card does nothing`

`<Card flexGrow={1}>...</Card>`


`// ✓ — Box handles layout, Card handles the surface`

`<Box flexGrow={1} minWidth="0" overflow="hidden">`

`  <Card density="regular">...</Card>`

`</Box>`



Card accepts only these props: `as`, `display`, `density`, `tone`, `toneLevel`, `margin*`, `className`, `style`.


### Card silent-prop reference

Every prop below is dropped on the floor with no error. The first group is layout props Card never accepted; the second group is UI 3 props removed in UI 4. Both groups fail the same way — silently.


| **Prop you passed** | **Status** | **What Card does** | **Where to put it instead** |
| --- | --- | --- | --- |
| `flexGrow`, `flexShrink`, `flexBasis` | Layout — silently ignored | Nothing | Wrapper `Box` or `Flex` |
| `width`, `minWidth`, `maxWidth` | Layout — silently ignored | Nothing | Wrapper `Box` |
| `height`, `minHeight`, `maxHeight` | Layout — silently ignored | Nothing | Wrapper `Box` |
| `padding`, `paddingX`, `paddingY`, `paddingTop`, etc. | Layout — silently ignored | Nothing | `density` prop on Card, or inner `Box padding={N}` |
| `radius` | Layout — silently ignored | Nothing | `density` prop on Card (couples padding + radius) |
| `overflow`, `overflowX`, `overflowY` | Layout — silently ignored | Nothing | Wrapper `Box` |
| `position`, `top`, `right`, `bottom`, `left`, `inset` | Layout — silently ignored | Nothing | Wrapper `Box` |
| `zIndex` | Layout — silently ignored | Nothing | Wrapper `Box` |
| `gridColumn`, `gridRow`, etc. | Layout — silently ignored | Nothing | Wrapper `Box` |
| `border`, `borderTop`, `borderRight`, etc. | UI 3 prop — removed in UI 4 | Nothing | Border now applied via `tone` context |
| `shadow` | UI 3 prop — removed in UI 4 | Nothing | Use a wrapper `Box` with a `shadow` prop |
| `selected` | UI 3 prop — removed in UI 4 | Nothing | See section 17 — use `aria-selected` + tone switching |
| `scheme` | UI 3 prop — removed in UI 4 | Nothing | Dark mode is no longer toggled at the Card level |
| `forwardedAs` | UI 3 styled-components escape hatch — removed | Nothing | Use `as` directly |


If you came from UI 3 and your Card looks wrong after migration, this is the first place to look. The codemod inserts `UI-POC-CODEMOD TODO` comments for the deprecated UI 3 props — search for those in your migrated files.


---


## 3. Two packages, constant import confusion

Raised in 10/10 iterations. Agents import components from the wrong package. Both packages export names that look similar, and the wrong import produces a differently styled component with no error.


**The rule:**


| **Package** | **Components** |
| --- | --- |
| `@sanity-labs/ui-poc` | Box, Flex, Grid, Card, Container, Code, Heading, Text, Divider, Icon |
| `@sanity/ui` | Button, Stack, Badge, Label, Menu, MenuButton, MenuItem, Select, TextInput, TextArea, Switch, Dialog, Tooltip, Popover, ThemeProvider, ToastProvider, and all other interactive components |
| `@sanity/icons` | All icon glyphs (SearchIcon, AddIcon, etc.) — pass these into the `Icon` component from `@sanity-labs/ui-poc`, or into Button/Badge's `icon` prop |


Group imports by package:


`// Layout and typography — from the design system package`

`import { Box, Flex, Card, Grid, Heading, Text, Divider, Icon } from '@sanity-labs/ui-poc'`


`// Interactive components — from Sanity UI 3`

`import { Button, Stack, Badge, TextInput, Menu, MenuButton, MenuItem } from '@sanity/ui'`


`// Icon glyphs — feed these into the Icon wrapper or Button's icon prop`

`import { SearchIcon, AddIcon, EditIcon } from '@sanity/icons'`



---


## 4. `space` vs `gap` — wrong prop on wrong component

Raised in 20/20 iterations. Stack uses `space`. Flex and Grid use `gap`. Using the wrong one fails silently.


`// ✗ — does nothing`

`<Stack gap={3}>...</Stack>`

`<Flex space={3}>...</Flex>`


`// ✓`

`<Stack space={3}>...</Stack>`

`<Flex gap={3}>...</Flex>`



Also watch for renamed props from UI 3: `wrap` → `flexWrap`, `direction` → `flexDirection`, `align` → `alignItems`, `justify` → `justifyContent`. The UI 3 names do nothing on UI 4 components.


---


## 5. Text defaults to `<span>` — breaks Stack spacing

Raised in 9/10 iterations. Text renders an inline `<span>` by default. Inside a Stack, the `space` prop relies on block-level children. Inline spans produce no visible spacing.


`// ✗ — Stack spacing invisible because Text is inline`

`<Stack space={3}>`

`  <Text>First item</Text>`

`  <Text>Second item</Text>`

`</Stack>`


`// ✓ — block-level elements get spacing`

`<Stack space={3}>`

`  <Text as="p">First item</Text>`

`  <Text as="p">Second item</Text>`

`</Stack>`



Set `as="span"` only when Text sits inline inside a Flex row. Use `as="p"` (or omit `as` inside a Flex) for block-level flow.


---


## 6. Card `density` couples padding and radius — no escape hatch

Raised in 8/10 iterations. Agents try to set padding or radius on Card independently. Card uses `density` as a composite prop:


| **Density** | **Padding** | **Radius** |
| --- | --- | --- |
| `compact` | 12px | 3px |
| `regular` | 20px | 7px |
| `loose` | 32px | 11px |


If you need custom padding on a Card surface, nest a Box inside the Card:


`<Card density="compact">`

`  <Box padding={5}>`

`    Custom inner padding on a compact Card surface.`

`  </Box>`

`</Card>`



---


## 7. Tone values differ between UI 3 and UI 4

Raised in 15/20 iterations. Card and Text from `@sanity-labs/ui-poc` use one set of tone values. Button and Badge from `@sanity/ui` use a different set.


### Tone values by component

The valid `tone` values depend on which package the component ships from. The wrong tone string produces a different result with no error — `tone="default"` on Card does nothing; `tone="neutral"` on Button does nothing.


| **Component** | **Package** | **Valid tone values** | **Default tone for primary action** |
| --- | --- | --- | --- |
| `Card` | `@sanity-labs/ui-poc` | `none`, `neutral`, `primary`, `positive`, `suggest`, `caution`, `critical` | `neutral` |
| `Box` | `@sanity-labs/ui-poc` | `none`, `neutral`, `primary`, `positive`, `suggest`, `caution`, `critical` | `neutral` |
| `Flex` | `@sanity-labs/ui-poc` | `none`, `neutral`, `primary`, `positive`, `suggest`, `caution`, `critical` | `neutral` |
| `Grid` | `@sanity-labs/ui-poc` | `none`, `neutral`, `primary`, `positive`, `suggest`, `caution`, `critical` | `neutral` |
| `Container` | `@sanity-labs/ui-poc` | `none`, `neutral`, `primary`, `positive`, `suggest`, `caution`, `critical` | `neutral` |
| `Text` | `@sanity-labs/ui-poc` | `none`, `neutral`, `primary`, `positive`, `suggest`, `caution`, `critical` | — (inherits) |
| `Heading` | `@sanity-labs/ui-poc` | `none`, `neutral`, `primary`, `positive`, `suggest`, `caution`, `critical` | — (inherits) |
| `Icon` | `@sanity-labs/ui-poc` | `none`, `neutral`, `primary`, `positive`, `suggest`, `caution`, `critical` | — (inherits) |
| `Button` | `@sanity/ui` | `default`, `primary`, `positive`, `caution`, `critical` | `default` |
| `Badge` | `@sanity/ui` | `default`, `primary`, `positive`, `caution`, `critical` | `default` |


**Quick mapping when composing across packages:**


| **You want** | **On Card / Box / Flex / Text** | **On Button / Badge** |
| --- | --- | --- |
| Plain surface | `tone="neutral"` | `tone="default"` |
| Brand emphasis | `tone="primary"` | `tone="primary"` ⛔ fails contrast — use `default` |
| Success | `tone="positive"` | `tone="positive"` |
| Suggestion / AI | `tone="suggest"` | — not available, use `primary` text inside |
| Warning | `tone="caution"` | `tone="caution"` |
| Error / destructive | `tone="critical"` | `tone="critical"` |


Key differences:


- UI 4 has **no **`default`** tone** — use `neutral` on every `@sanity-labs/ui-poc` component
- UI 4 adds `suggest` (and `none`)
- UI 3 has no `neutral` or `suggest`

**Do not use **`tone="primary"`** on Button.** It fails WCAG AA contrast (4.29:1). Use `tone="default"` for primary actions.


---


## 8. Inline styles used where props exist

Agents produced an average of 4.2 inline styles per iteration across four runs (4.6, 6.9, 3.5, 1.6 — clear and steady improvement). `width` remains the most common inline property in every run (87.5% of all inline styles in the latest run, tied with `justifyContent`), and `Button` instances using inline styles dropped to 6%.


| **Inline style** | **Use the prop instead** |
| --- | --- |
| `style={{ width: '260px' }}` | `width="260px"` on Box or Flex |
| `style={{ width: '100%' }}` on Button | Wrap in `<Box width="100%"><Button ... /></Box>` — Button has no `width` prop |
| `style={{ justifyContent: 'space-between' }}` | `justifyContent="space-between"` on Flex |
| `style={{ background: '...' }}` | `tone="neutral"` on Box or Card |
| `style={{ height: '100vh' }}` | `height="100vh"` or `minHeight="100vh"` |
| `style={{ borderRadius: '...' }}` | `radius={2}` on Box |
| `style={{ display: 'flex' }}` | Use `<Flex>` instead of `<Box>` |
| `style={{ display: 'flex' }}` on a `<button>` or `<a>` | Wrap content in `<Flex>` inside the element instead |
| `style={{ overflow: 'hidden' }}` | `overflow="hidden"` |
| `style={{ overflowY: 'auto' }}` | `overflowY="auto"` |
| `style={{ flex: 1 }}` | `flexGrow={1} flexShrink={1} flexBasis="0"` |
| `style={{ position: 'absolute', left: '-10000px', top: 'auto' }}` (skip-nav link) | See section 12 — use a `.sr-only` className, not inline `style` |
| `style={{ height: '40px' }}` on icon-only Button | Don't override — Button's default size already meets the 36px+ touch-target floor; if you need bigger, use `padding` or `mode`/`fontSize` |
| `style={{ width: 16, height: 16 }}` on a raw `@sanity/icons` glyph | Wrap in `Icon` — `<Icon icon={CheckmarkIcon} size={1} />`. See section 9 |
| `style={{ fontSize: 18 }}` on a raw icon | Wrap in `Icon` with a `size` from the scale (`0`–`4`). See section 9 |
| `style={{ color: 'green' }}` on a raw icon | Wrap in `Icon` with a semantic `tone` — `<Icon icon={CheckmarkIcon} tone="positive" />`. See section 9 |
| `style={{ cursor: 'pointer' }}` | Acceptable — no prop exists |


Inline styles bypass the spacing scale, break dark mode, and skip responsive arrays. Use props when they exist. Use `style` only for CSS properties with no prop equivalent (`cursor`, `transform`, `opacity`, `zIndex` on non-positioned elements).


---


## 9. Use the `Icon` component for standalone icons — not raw `@sanity/icons` SVGs

Raised in 3/3 iterations of the latest run. Agents import glyphs directly from `@sanity/icons` and drop them into table cells, list rows, pills, and card bodies. The raw SVGs render at their default size with no built-in scale, so agents fall back to `style={{ width: 16, height: 16 }}`, `style={{ fontSize: 18 }}`, or `style={{ color: 'green' }}` workarounds.


In the latest run, every direct icon use carried inline styles:


| **Component** | **Instances** | **% with inline styles** |
| --- | --- | --- |
| `CheckmarkIcon` (raw) | 4 | 100% |
| `CalendarIcon` (raw) | 3 | 100% |
| `EarthGlobeIcon` (raw) | 2 | 100% |
| `Icon` (wrapper) | 3 | 33% |


**The rule:** outside of Button/Badge `icon` props and outside of Text/Heading children, every `@sanity/icons` glyph should be wrapped in the `Icon` component from `@sanity-labs/ui-poc`.


`// ✗ — raw icon with manual sizing`

`import { CheckmarkIcon, CalendarIcon } from '@sanity/icons'`


`<CheckmarkIcon style={{ width: 16, height: 16, color: 'green' }} />`

`<td><CalendarIcon style={{ fontSize: 18 }} /></td>`


`// ✓ — Icon wrapper exposes size and tone from the design scale`

`import { Icon } from '@sanity-labs/ui-poc'`

`import { CheckmarkIcon, CalendarIcon } from '@sanity/icons'`


`<Icon icon={CheckmarkIcon} size={1} tone="positive" />`

`<td><Icon icon={CalendarIcon} size={1} /></td>`



**When to wrap vs pass the raw glyph:**


| **Context** | **What to pass** | **Why** |
| --- | --- | --- |
| Standalone in table cells, list rows, pills, custom layouts | `Icon` wrapper | The wrapper is the only way to access the `size` scale, `tone`, and `muted` props |
| Inside a Button's `icon` prop | Raw glyph — `<Button icon={EditIcon} />` | Button handles sizing through its own scale |
| Inside a Badge's `icon` prop | Raw glyph — `<Badge icon={CheckmarkIcon}>Published</Badge>` | Badge handles sizing |
| Inside Text or Heading to match the surrounding font size | Raw glyph — `<Text size={1}><DocumentIcon /></Text>` | Inherits `font-size` and `currentColor` from the parent |
| Anywhere you need a specific `size`, `tone`, or `muted` value | `Icon` wrapper | Raw glyphs have no scale |


Icon size scale matches Text and Heading: `0` = 17px, `1` = 21px, `2` = 25px (default), `3` = 29px, `4` = 33px. `size` accepts responsive arrays.


### Alternatives to Icon inline styles

In the latest run, every `Icon` wrapper instance carried an inline style (3/3 = 100%). Agents are now reaching for the wrapper but still adding `style={{ ... }}` for things that Icon already supports as props. Use this reference before writing any `style` on an Icon.


| **Inline style you wrote** | **Icon prop alternative** | **Example** |
| --- | --- | --- |
| `style={{ fontSize: 18 }}` | `size` (0–4 from the scale) | `<Icon icon={SearchIcon} size={1} />` |
| `style={{ fontSize: '1.25rem' }}` | `size` (pick the closest scale value) | `<Icon icon={SearchIcon} size={2} />` |
| `style={{ width: 16, height: 16 }}` | `size` (the scale sets both) | `<Icon icon={SearchIcon} size={0} />` |
| `style={{ color: 'green' }}` | `tone` | `<Icon icon={CheckmarkIcon} tone="positive" />` |
| `style={{ color: 'red' }}` | `tone` | `<Icon icon={WarningOutlineIcon} tone="critical" />` |
| `style={{ color: 'var(--gray-600)' }}` | `muted` | `<Icon icon={SearchIcon} muted />` |
| `style={{ opacity: 0.6 }}` | `muted` | `<Icon icon={SearchIcon} muted />` |
| `style={{ marginRight: 8 }}` | `marginRight` (0–9 from the spacing scale) | `<Icon icon={SearchIcon} marginRight={2} />` |
| `style={{ margin: 4 }}` | `margin` (0–9) | `<Icon icon={SearchIcon} margin={1} />` |
| `style={{ marginTop: 12 }}` | `marginTop` (0–9) | `<Icon icon={SearchIcon} marginTop={3} />` |
| `style={{ cursor: 'pointer' }}` on Icon | Don't — wrap in a Button or PressArea instead | `<Button icon={SearchIcon} aria-label="Search" />` |
| `style={{ display: 'inline-block' }}` | Don't — Icon renders an SVG that's already inline | — |
| `style={{ verticalAlign: 'middle' }}` | Don't — align via the parent Flex's `alignItems="center"` | `<Flex alignItems="center" gap={2}><Icon ... /><Text ... /></Flex>` |


**Do not size icons with **`fontSize`**, **`width`**, or **`height`** inline styles.** Use Icon's `size` prop. **Do not color icons with **`style={{ color }}`**.** Use Icon's `tone` prop or let the icon inherit from its parent's `currentColor`. **Do not add **`cursor: pointer`** to make Icon clickable.** Icon is not an interactive element — use Button or PressArea.


---


## 10. No page background by default

Raised in 6/10 iterations. Agents expect a Sanity Studio background but get a white page. Neither `ThemeProvider` nor the UI 4 stylesheet sets a body background.


**Set up the page shell:**


Wrap your top-level `<App />` (or root view) in a `Box` with `tone="neutral"` and `minHeight="100vh"`. This gives the whole document a neutral surface and matches Sanity Studio's expected background.


`<Box tone="neutral" minHeight="100vh">`

`  <App />`

`</Box>`



Place this at the root of your render tree — for example, inside `ThemeProvider` in `main.tsx` so it wraps every page-level layout:


`<ThemeProvider theme={studioTheme}>`

`  <ToastProvider>`

`    <Box tone="neutral" minHeight="100vh">`

`      <App />`

`    </Box>`

`  </ToastProvider>`

`</ThemeProvider>`



Or set it in CSS once:


`body {`

`  background: ``var``(--gray-50);`

`  color: ``var``(--gray-900);`

`}`



---


## 11. Accessibility tests that fail consistently

Several accessibility tests fail across every run. Some are universal failures, others surface only when agents reach for the right pattern but implement it incorrectly. `skip-navigation` reached 100% and `nested-interactive` violations dropped to zero in the most recent run, but `touch-targets` regressed sharply — agents are still shrinking icon-only Buttons.


| **Test** | **Pass rate** | **Why it fails** | **What to do** |
| --- | --- | --- | --- |
| `semantic-structure` | 0% | No landmark elements | Use `as="nav"`, `as="main"`, `as="aside"` on Box/Flex |
| `aria-conventions` | 0% | Missing ARIA on interactive patterns | `aria-label` on icon-only buttons; `aria-expanded` on disclosure triggers |
| `spacing-and-reflow` | 0% | Content overflows at 320px | `flexWrap="wrap"` on every horizontal Flex with 2+ children |
| `dark-mode-contrast` | 0% | No dark mode support | `toneLevel="strong"` or implement scheme toggling |
| `touch-targets` | 10% ⚠ regressed | Icon-only buttons rendered at 32×32 or smaller | See section 13 — this is the worst-performing test in the latest run |
| `skip-navigation` | 100% ✓ | Now consistently passing | Section 12 guidance is working — keep using it |
| `nested-interactive` (axe) | 0 violations ✓ | No nested interactive elements observed in the latest run | Section 14 guidance still applies as preventive |


### Nested Flex needs `flexWrap` too — 320px reflow guide

The `spacing-and-reflow` test fails 100% of the time. Most agents remember `flexWrap="wrap"` on the outermost Flex, then forget it on every Flex inside. At 320px the inner row overflows even though the outer one wraps. The page passes a desktop visual check but fails WCAG 1.4.10 reflow.


**The rule:** every `Flex` with two or more children needs `flexWrap="wrap"`. Outer Flex wrapping doesn't trickle down — each level decides for itself.


`// ✗ — toolbar overflows at 320px even though the outer Flex wraps`

`<Flex flexWrap="wrap" gap={3}>`

`  <Sidebar />`

`  <Flex alignItems="center" justifyContent="space-between" gap={2}>`

`    <Heading as="h1">All Documents</Heading>`

`    <Button text="New document" icon={AddIcon} />`

`  </Flex>`

`</Flex>`


`// ✓ — every Flex with siblings sets flexWrap`

`<Flex flexWrap="wrap" gap={3}>`

`  <Sidebar />`

`  <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>`

`    <Heading as="h1">All Documents</Heading>`

`    <Button text="New document" icon={AddIcon} />`

`  </Flex>`

`</Flex>`



**Where this most commonly fails:**


| **Pattern** | **What to wrap** |
| --- | --- |
| Sidebar + main content (outer) **and** toolbar + actions (inner) | Both Flex elements need `flexWrap="wrap"` |
| Card row (outer) **and** title + status badge (inner) | Both |
| Filter bar with multiple `Select` + search Flexes | Every Flex that holds 2+ siblings |
| Form rows that contain a label and a field side by side | The row Flex needs it |


Add `minWidth="0"` to any inner Flex that contains long text or a `Heading` with `lineClamp`. Without it, a long word blocks the parent from shrinking and the wrap never triggers. Pair `flexWrap="wrap"` with `minWidth="0"` for the parent to reflow correctly.


Test at 320px viewport width in dev tools before committing. The failure mode is invisible at desktop sizes.


### Heading hierarchy template

The `heading-hierarchy` test regressed from 100% to 33% in the latest run, with `heading-order` axe violations in 2/3 iterations. Agents omit the `as` prop and every Heading silently renders as `<h2>`, producing pages with no `<h1>` and an invalid outline.


**The rule:** every Heading needs an explicit `as`. Match the value to the page outline, not to the visual size you want.


Copy-paste shell for a typical admin layout:


`<Box as="main" id="main">`

`  {/* exactly one h1 per page — the page title */}`

`  <Heading as="h1" size={3}>All new hires</Heading>`


`  <Section>`

`    {/* section titles inside the main content */}`

`    <Heading as="h2" size={2}>Active onboarding</Heading>`

`    ...`

`  </Section>`


`  <Section>`

`    <Heading as="h2" size={2}>Pending sign-off</Heading>`

`    ...`

`  </Section>`

`</Box>`


`<Box as="aside" aria-label="Inspector">`

`  {/* sidebar / inspector titles are h2, NOT h1 */}`

`  <Heading as="h2" size={1}>New hire details</Heading>`


`  <Stack space={3}>`

`    <Heading as="h3" size={0}>Personal info</Heading>`

`    ...`

`    <Heading as="h3" size={0}>Equipment requests</Heading>`

`    ...`

`  </Stack>`

`</Box>`




| **Element** | `as`** value** | **Rule** |
| --- | --- | --- |
| Page title (one per page) | `as="h1"` | Always required. Lives inside `<Box as="main">` |
| Section title inside main | `as="h2"` | Descend from h1 — never skip levels |
| Subsection title | `as="h3"` | Descend from h2 |
| Sidebar / inspector title | `as="h2"` | h2 even when visually small. Never repeat h1 |
| Card title inside a list | `as="h3"` | Treat the surrounding section as h2 |
| Toolbar / chrome labels | Use **Label**, not Heading | Headings are for content structure |


⛔ **Do not pick **`as`** based on visual size.** Use `size` for visuals and `as` for semantics. A sidebar heading can be `as="h2" size={0}` (small text, correct hierarchy).


---


## 12. Skip-navigation links must use a class, not inline styles

Raised newly in run 3 (4/10 iterations). Agents add a skip link as the first focusable element but visually hide it with `style={{ position: 'absolute', left: '-10000px' }}`. This works but trips the `inline-styles` lint rule, doesn't reveal the link on focus, and breaks dark mode.


`// ✗ — inline styles, no focus-visible state`

`<a href="#main" style={{ position: 'absolute', left: '-10000px' }}>`

`  Skip to content`

`</a>`


`// ✓ — class-based, becomes visible on focus`

`<a href="#main" className="skip-link">Skip to content</a>`



Pair it with this CSS once in your stylesheet:


`.skip-link {`

`  position: absolute;`

`  ``left``: ``-10000px``;`

`  top: auto;`

`}`

`.skip-link:``focus ``{`

`  ``left``: ``8px``;`

`  top: ``8px``;`

`  z-index: ``100``;`

`}`



Then make sure `<Box as="main" id="main">` exists somewhere in the tree.


---


## 13. Don't shrink icon-only buttons below 36×36

Raised in 9/10 iterations of the most recent run — the worst-performing accessibility test. Agents wrap small icons in Button and override the size with `style={{ height: '32px' }}` or aggressively reduce `padding`. The result fails the WCAG 2.5.5 touch-target check.


**The rule:** never override Button's height or shrink its padding. Button at default size meets the 36×36 minimum.


`// ✗ — fails touch-target audit`

`<Button icon={EditIcon} style={{ height: '32px' }} padding={1} />`


`// ✗ — also fails — `padding={1}` produces a < 36px hit area`

`<Button icon={EditIcon} padding={1} />`


`// ✓ — default size meets WCAG; mode="bleed" removes border/fill if you need a denser look`

`<Button icon={EditIcon} mode="bleed" />`



If you genuinely need a smaller visual surface (icon-only toolbar buttons), use `mode="bleed"` — it shrinks the visible chrome while preserving the 36×36 hit area.


---


## 14. Don't nest clickables — Card-with-onClick must not contain a Button

Raised newly in run 3 (2/10 iterations as an axe `nested-interactive` violation). Agents make an entire Card clickable for navigation, then put a "More actions" Button or MenuButton inside it. Screen readers don't announce the inner control reliably.


Pick one:


- Make the Card non-interactive and put a single Button or `<a>` inside it.
- Keep the Card clickable and move secondary actions outside the card boundary, or use `e.stopPropagation()` plus `role="button"` carefully.

---


## 15. `muted` boolean vs `color="muted"` confusion

Raised in 9/20 iterations. The tutorial code uses `color="muted"` on Text, but the API table shows `muted` as a boolean prop. Text has no `color` prop.


`// ✗ — color is not a valid prop on Text`

`<Text color="muted">Secondary info</Text>`


`// ✓ — use the muted boolean`

`<Text muted>Secondary info</Text>`



⛔ `muted`** at **`size={0}`** (10px) and **`size={1}`** (13px) on white or **`tone="neutral"`** may fail WCAG AA.** Use `size={2}+` or pair with `weight="medium"`. The `contrast-and-color` test regressed from 100% to 0% in the latest run. Muted small text on light backgrounds is the most common cause.


`// ✗ — likely fails 4.5:1 contrast on white or neutral surfaces`

`<Text size={1} muted>Last edited 2 hours ago</Text>`


`// ✓ — bumped size meets contrast at AA`

`<Text size={2} muted>Last edited 2 hours ago</Text>`


`// ✓ — or keep small size but add weight`

`<Text size={1} muted weight="medium">Last edited 2 hours ago</Text>`



---


## 16. Docs reference components that don't exist yet

Raised in 10/20 iterations. The docs say "use Inline for wrapping badge rows." Inline doesn't ship in the current package.


| **Component** | **Status** | **What to do** |
| --- | --- | --- |
| `Inline` | Not shipped | Use `<Flex flexWrap="wrap" gap={2}>` — see snippet below |
| `Divider` | **Shipped** ✓ | Import from `@sanity-labs/ui-poc` and use directly |


Do not import `Inline`. It will cause a build error.


### Inline replacement — wrapping badge or chip rows

Use `Flex` with `flexWrap="wrap"` and a `gap` value. This is the recommended pattern until `Inline` ships.


`// ✗ — Inline doesn't exist yet, this is a build error`

`import { Inline } from '@sanity-labs/ui-poc'`


`<Inline space={2}>`

`  <Badge tone="positive">Published</Badge>`

`  <Badge tone="caution">In review</Badge>`

`  <Badge tone="primary">Featured</Badge>`

`</Inline>`


`// ✓ — Flex with flexWrap="wrap" and gap`

`import { Flex } from '@sanity-labs/ui-poc'`


`<Flex flexWrap="wrap" gap={2}>`

`  <Badge tone="positive">Published</Badge>`

`  <Badge tone="caution">In review</Badge>`

`  <Badge tone="primary">Featured</Badge>`

`</Flex>`



For dietary pills, tag rows, status chip groups, filter chips, or any horizontal list that should wrap to a new line on narrow viewports, this pattern is the v4-native equivalent.


### Divider is shipped — use it directly

`Divider` ships in `@sanity-labs/ui-poc` today. Render an `<hr>` with the design system's border color and spacing context — no workaround needed.


`import { Divider, Stack } from '@sanity-labs/ui-poc'`


`<Stack space={4}>`

`  <Section />`

`  <Divider />`

`  <Section />`

`</Stack>`



Use Divider between logically distinct content groups inside a vertical Stack — not as a decorative line. Screen readers announce `<hr>` as a thematic break.


Divider also handles vertical separation. Place it inside a horizontal Flex between action groups and it renders as a vertical rule:


`<Flex alignItems="center" gap={3}>`

`  <Button text="Filter" />`

`  <Divider />`

`  <Button text="Sort" />`

`</Flex>`



---


## 17. No `selected` prop on Card

Raised in 7/20 iterations. UI 3 Card had `selected` for list-item highlighting. UI 4 Card removed it. Agents use `tone="primary"` as a workaround, which has contrast issues.


For selectable lists, use:


`// Container with listbox role`

`<Box role="listbox">`

`  {items.map(item => (`

`    <Card`

`      key={item.id}`

`      role="option"`

`      aria-selected={item.id === selectedId}`

`      tone={item.id === selectedId ? 'primary' : 'neutral'}`

`      toneLevel={item.id === selectedId ? 'muted' : 'normal'}`

`    >`

`      <Text>{item.title}</Text>`

`    </Card>`

`  ))}`

`</Box>`



Or use `aria-current="true"` for navigation items — it works on any element.


---


## 18. Button accessibility

**Do not use **`tone="primary"`** for primary action buttons.** It fails WCAG 2.1 AA contrast (4.29:1) against the background. Use `tone="default"` instead — it is the WCAG-passing tone for primary call-to-action buttons.


| **Tone** | **Contrast ratio** | **WCAG AA** | **Use for** |
| --- | --- | --- | --- |
| `default` | (insert ratio) | ✓ | Primary actions |
| `primary` | 4.29:1 | ✗ | Don't use |
| `positive` | (ratio) | ✓ | Confirm / save |
| `caution` | (ratio) | ✓ | Warn / non-blocking |
| `critical` | (ratio) | ✓ | Destructive actions |


---


## Quick reference for agents

Before generating code, verify:


- `@sanity-labs/ui-poc/styles.css` is imported at the entry point
- Card has no layout props — wrap in Box/Flex
- Components are imported from the correct package
- Stack uses `space`, Flex/Grid use `gap`
- Text inside Stack has `as="p"`
- Layout uses props, not inline `style`
- At least one `as="main"` landmark exists
- Every horizontal Flex has `flexWrap="wrap"`
- Use `muted` boolean on Text, not `color="muted"`
- Do not import `Inline` — it doesn't exist yet
- Do not use `tone="primary"` on Button — it fails contrast
- Use UI 4 prop names: `flexWrap` not `wrap`, `flexDirection` not `direction`, `alignItems` not `align`
- Don't shrink icon-only Buttons below default size (touch-target regression — currently 9/10 fail)
- Skip links use a CSS class, not inline `position: absolute`
- Don't nest interactive elements (Button inside clickable Card)
- Wrap standalone `@sanity/icons` glyphs in `Icon` from `@sanity-labs/ui-poc` — use `size`/`tone`, not inline `fontSize`/`width`/`color`. Only pass raw glyphs to Button's `icon` prop, Badge's `icon` prop, or as children of Text/Heading
