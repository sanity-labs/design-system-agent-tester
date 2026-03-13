Create a simple interface that mimics Sanity Studio using Sanity UI.  

# Instructions
* Use the latest version of Sanity Icons and Sanity UI v3 for the interface
* Rely on [Sanity UI's documentation site](https://www.sanity.io/ui) and the guidelines below for guidance on how to use the UI library.
* The project should be built on top of Vite
* Use as few NPM packagess as possible 
* Do not add unit tests of any kind
* Provide feedback on areas of friction when using Sanity UI, both in implementation and understanding correct usage. THE JOB IS NOT COMPLETE UNTIL FEEDBACK IS PROVIDED.


# Guidelines

## Iconography

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
- The most common treatment. The majority of icons in an interface should be supportive.

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

### Choosing an appropriate icon

1. **Use the most specific icon available.** Prefer `DocumentTextIcon` over `DocumentIcon` when representing a text document. Prefer `ImageRemoveIcon` over a generic `CloseIcon` when indicating image removal.
1. **Don't use a "close enough" icon.** If no icon in the library clearly represents the concept, it's better to use no icon at all than one that could be misinterpreted. Consider requesting a new icon for the specific use case.
1. **Be consistent across the product.** Once an icon is chosen for a concept, use that same icon everywhere the concept appears. Don't use `CogIcon` for settings in one place and `ControlsIcon` in another.
1. **Match established conventions.** Users bring expectations from other software. A magnifying glass means search. A trash can means delete. A pencil means edit. Don't repurpose universally understood icons for novel meanings.


## Color

Overview Color is a potent and volatile design tool. What appears vibrant to one person may be gray to another, and cultural interpretations of color can vary wildly. Within our design system, color is not merely decorative; it is a functional tool used to communicate hierarchy, indicate interactive states, and guide the user.

1. Core Philosophy

The Interface is a White Wall: An interface should act as a gallery for content. The UI should stay out of the way to let the user's content (imagery, videos, avatars) be the art. By limiting the overall range of colors in the UI, the specific areas that do receive color gain significantly more attention. Design in Grayscale First: An interface that relies solely on color to work is an interface that doesn't work. Start designing in grayscale to ensure your spacing, pacing, proportion, and typographic contrast are effective before adding color to the mix. Avoid the Extremes: Do not use pure black as your default positive value. By pulling the shade back slightly from pure black, you leave yourself extra room to escalate visual emphasis—allowing you to "go to 11" when a critical alert actually needs it. Furthermore, avoiding pure black text on pure white backgrounds aids readability for users with dyslexia, Irlen Syndrome, and light sensitivity. Restraint is Key: Better use of less is always preferred over "more on top of more". Keeping a limited palette of colors working harmoniously together is manageable; trying to balance dozens of colors leads to visual clashing and cognitive overload.

1. Foundational Application When applying color to user interfaces, consider the intent and hierarchy of the element rather than just the aesthetic.

Primary vs. Secondary Action: Primary colors should be reserved for conveying high-emphasis, core actions that you want the user to take. Secondary colors should be used for medium-to-low emphasis actions, creating visual balance and ensuring the primary actions stand out. Semantic & Status Communication: Color is an excellent supplement to indicate the severity of a message, helping to distance a minor "oh shucks" error from a critical "OH SHIT" error. Background colors should purposefully deliver specific meanings, such as information, success, warning, or error. High-Intensity Backgrounds: Solid, bold semantic colors should be used on distinct UI elements (like badges or toast notifications) to immediately draw attention to a status. Low-Intensity Backgrounds: Light tints (or "weak" colors) of semantic colors are safe to use as larger background areas or behind text, maintaining readability while still conveying the status. Typography & Iconography: Text colors must be strictly managed to maintain readability hierarchy (e.g., separating default body text from subtle metadata). Icon colors should generally match their accompanying text colors to maintain visual consistency.

1. Accessibility & Inclusive Design It is our responsibility to deliver an inclusive product. Color must never be a barrier to entry.

Do Not Rely on Color Alone: Never rely on color exclusively to convey meaning, indicate an action, or prompt a response. If color is your only cue (e.g., relying solely on a red outline to indicate a form error), users with color blindness or low vision will not receive the intended message. Always pair semantic colors with text labels, icons, or other non-color information. Strict Contrast Standards: We adhere to WCAG AA guidelines for contrast to ensure visual clarity. Standard Text: Must maintain a contrast ratio of at least 4.5:1 against its background. Large Text: Text that is at least 24px regular or 19px semi-bold must maintain a 3:1 ratio. UI Components: Meaningful visual elements, such as icons or input borders, must maintain a 3:1 contrast ratio against adjacent colors. Dynamic Backgrounds: When text is rendered over gradient backgrounds or images, you must verify that the text color meets contrast standards in all places it appears. This is particularly critical for interfaces using animations or parallax scrolling where text and backgrounds move independently.


## Heading

Headings are used to create a logical hierarchy and page structure. They guide the user's eye, group related content, and enable users of assistive technologies to navigate the interface quickly.

### API documentation

_Refer to TypeDocs in Heading.tsx_

### Usage guidelines

**When to use:**

- You need to establish the semantic structure of a page (e.g., Page Title, Section Header).
- You need to group text and elements into logical sections.

**When not to use:**

- Don’t use for large text for a number or a callout that does not define a section. Use the **Text** component with a `size` prop instead.
- Don’t use to emphasize text inside a paragraph. Use **Text** with a `weight="bold"` prop.

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

### **Accessibility**

To ensure the Heading component supports all users, particularly those using screen readers:

- **Navigation & orientation:** Screen reader users rely on headings to navigate complex interfaces. Proper use of headings addresses common orientation issues in Sanity Studio.
- **Semantic structure:** Always use the `as` prop to render `<h>` tags (`<h1>`–`<h6>`). Do not rely on the default `<div>` rendering for text that functions as a title.
- **Logical order:** Ensure heading levels descend sequentially (H1 → H2 → H3). Do not skip levels (e.g., H1 to H4) as this can confuse users navigating via keyboard shortcuts.
- **Color contrast:** While the Heading component handles theme colors, ensure that `muted` or `accent` headings maintain a **3:1** contrast ratio against the background for large text (at least 24px or 19px bold) and **4.5:1** for smaller text.

### **Content**

- **Concise:** Keep headings short and glanceable. Avoid overly long titles that wrap to multiple lines if possible.
- **Sentence case:** Use sentence case for headings (e.g., "Page settings" rather than "Page Settings") to maintain a conversational tone and improve scanability.
- **No punctuation:** Do not use punctuation (periods) at the end of headings unless the heading is a direct question.
- **Descriptive:** Headings should clearly describe the content of the section they introduce.



## Button

Used to trigger an action–like submitting a form, opening a dialog, or performing a command.

### API documentation

_Refer to TypeDocs in Button.tsx_

### Usage guidelines

**When to use:**

- To trigger an action within the application (e.g., "Publish", "Delete", "Save").
- To submit data in a form context using `type="submit"`.

**When not to use:**

- To navigate the user to a new view or URL. Use **Link** instead. Users of assistive technology expect buttons to perform actions and links to navigate.
- To switch between different views on a screen. Use **Tab** instead. The Tab component family has several `aria` tags that make navigation accessible for people relying on assistive technology.
- As an activator for displaying a menu. Use **MenuButton** instead. MenuButton handles details on placement and display that ensure consistency on how a menu is displayed from a button.

### Best practices

**Do**

- Use the `tone=”critical”` when an action is destructive, such as delete actions.
- Ensure buttons have a logical tab order in the document flow (left to right, top to bottom).
- Limit the number of primary buttons on the screen. Display one primary action per logical section (example: actions in a toolbar, or a card).

**Don’t**

- Don’t rely on color alone to convey the button's meaning (e.g., an error state should not just be red; use icons or text).
- Don’t use vague labels. Avoid terms like "Click here"; use descriptive labels that explain the action.
- Don’t disable buttons as a blocking function, such as disabling a submit button until all required fields are filled. People may not immediately understand what’s causing the button to be disabled. Instead, allow buttons to be pressed and provide appropriate feedback in response.
- Don’t hide buttons that represent critical actions. Actions that represent primary actions should be visible at all times.

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
| `"primary"` | Brand blue | Used to represent product experiences where brand should be reinforced. | Brand moments, Account creation |
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

#### Selected

When a button opens a panel or activates an action

1. Pair with label change
1. **Combine with **`mode="bleed"` for clean toggle appearance

#### Disabled

Used to prevent a person from performing an action or to show when an action is unavailable. A common use case is marking Button as disabled when `loading={true}`.

Disabled should be used sparingly and only when there’s a high degree of confidence that a person will understand why the button is disabled. For example, buttons for submitting information should remain enabled at all times–even when required fields are not filled.

People should know why an action is disabled. Provide context through an info icon, tooltip, or status message that describes why an action is disabled and steps they can take to enable it.

#### Loading

Used to show that the action initiated is in the process of completing. Loading should only be used for processes that take a noticeable amount of time to complete (typically a process that’s consistently longer than 500ms). The action should be `disabled `until the action has completed. For processes that take over three seconds to complete, consider triggering a Toast to reinforce that the action has been completed.

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

### **Accessibility**

To ensure the Button is accessible to all users, including those using screen readers and keyboard navigation:

- **Accessible Names:** All buttons must have an "accessible name." If the `text` prop is used, this serves as the name automatically. If the button is **icon-only** (visual only), you **must** manually provide an `aria-label` description (e.g., `aria-label="Add content"`).
- **Keyboard Interaction:**
  - Buttons must be focusable via the `Tab` key.
  - Buttons must be activatable using both the `Enter` and `Space` keys.
  - Ensure focus indicators are visible. Do not suppress the default focus outline unless replacing it with a custom high-contrast alternative.
- **Disabled States:** When `disabled` is true, the button is removed from the tab order and cannot be focused. Avoid using tooltips on disabled buttons as keyboard users cannot access them.
- **Color Contrast:** Ensure the button text maintains a contrast ratio of at least 3:1 against the button background.

### **Content**

- **Be concise:** Button labels should be short and predictable. Use simple and direct language.
- **Start with verbs:** Labels should describe the action taken (example: "Publish", "Edit", "Upload"). For extra clarity, add the subject of the action, (example: Upload image).
- **Sentence case:** Use sentence case for button labels (example: "Add item").


## Text

Used for the majority of UI copy, including body paragraphs, captions, and metadata. It is distinct from the **Heading** component, which should be reserved for structural page titles and section headers.

### **API documentation**

_Refer to TypeDocs in Text.tsx_

### **Usage guidelines**

**When to use:**

- You are displaying body copy, descriptions, or captions

**When not to use:**

- You need a field label for a form element. Use Label instead.
- You need to establish the structural hierarchy of a page (e.g., Page Title). Use Heading instead.
- You need a specific interaction link. Wrap the text in a link component or anchor tag, ensuring the clickable area is accessible.

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

Accent should only be used in rare circumstances where adding color is considered essential to communication. Use `weight` and/or `size` ahead of accent.

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


## Card

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

#### When to use

- The application consists of one view/page with important actions and filtering needing easy access. Example: A read-only content navigator.

#### When NOT to use

- When an application has multiple pages/views to navigate across. Use Shell with Navigation instead.
- When one or more items in the application needs a dedicated area to view/edit metadata. Use Shell with Inspector instead.

### Shell with Inspector

This layout supports a single view application with persistent actions and viewing/editing of content metadata. It’s ideal for simple management of content and its metadata.


#### When to use

- When one or more items in the application needs a dedicated area to view/edit metadata.

#### When NOT to use

- When an application has multiple pages/views to navigate across. Use Shell with Navigation and Inspector instead.
- When all editing of content metadata can be handled in the main content window. Use Shell or Shell with Toolbar instead.

### Shell with Navigation

This layout supports a multi-vew application with persistent navigation and actions. It’s ideal for more organized and fine-grained management of content.


#### When to use

- When an application has more than one page/view to navigate across.

#### When NOT to use

- When an application has only one view and requires no navigation. Use Shell, Shell with Toolbar, or Shell with Inspector instead.
- When at least one page/view in the application needs a dedicated area to view/edit metadata. Use Shell with Navigation and Inspector instead.

### Shell with Navigation and Inspector

This layout supports a multi-vew application with persistent navigation, actions and viewing/editing of content metadata. It’s ideal for more organized and fine-grained management of content and its metadata. **Note:** It’s recommended to hide the Inspector sidebar on pages/views where it’s not used.

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
