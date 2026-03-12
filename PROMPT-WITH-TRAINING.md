Create a simple interface that mimics Sanity Studio using Sanity UI.  

# Instructions
* Use the latest version of Sanity Icons and Sanity UI v3 for the interface
* Rely on [Sanity UI's documentation site](https://www.sanity.io/ui) and the guidelines below for guidance on how to use the UI library.
* The project should be built on top of Vite
* Use as few NPM packagess as possible 
* Do not add unit tests of any kind
* Provide feedback on areas of friction when using Sanity UI, both in implementation and understanding correct usage


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
