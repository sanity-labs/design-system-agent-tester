# Sanity Icons Type Registry

A **zero-runtime-cost** solution to icon discoverability in `@sanity/icons`.

## The problem

Developers don't know which icon names exist until they try an import and it fails:

```ts
import { LocationIcon } from '@sanity/icons'
//       ~~~~~~~~~~~~ ← doesn't exist, no error until build/runtime
```

There's no autocomplete, no search, and no compile-time validation of icon names used as strings (e.g., in config objects or data).

## The wrong solution

Import every icon into a runtime registry:

```ts
import * as AllIcons from '@sanity/icons'
// ← pulls the ENTIRE icon library into the bundle, even if you use one icon
```

This defeats tree-shaking entirely. A barrel re-export has the same problem.

## This solution

A **build-time generator** that reads `@sanity/icons` exports and emits a `.ts` file containing only types and identity functions. Nothing is imported at runtime. The generated file provides:

| Export | What it does | Runtime cost |
|--------|-------------|--------------|
| `SanityIconName` | Union type of all 235 icon names — full autocomplete | **0 bytes** (type-only) |
| `SanityIconBaseName` | Same without the `Icon` suffix (`'Edit'`, `'Search'`, ...) | **0 bytes** (type-only) |
| `IconsByKeyword` | Interface mapping keywords → icon names (hover `'arrow'` to see all arrow icons) | **0 bytes** (type-only) |
| `iconName()` | Compile-time assertion: `iconName('EditIcon')` ✓, `iconName('FooIcon')` ✗ | **identity function, inlined by minifier** |
| `iconBaseName()` | Same for short names: `iconBaseName('Edit')` ✓ | **identity function, inlined by minifier** |
| `SANITY_ICON_COUNT` | `235 as const` — useful for documentation | **const, inlined by minifier** |

## Usage

### Autocomplete on icon names

```ts
import type { SanityIconName } from './generated/sanity-icons'

// Your IDE now autocompletes all 235 icon names
function renderIcon(name: SanityIconName) {
  // ...
}

renderIcon('EditIcon')    // ✓ autocomplete + type-checked
renderIcon('FooIcon')     // ✗ TypeScript error
```

### Keyword discovery (hover in IDE)

```ts
import type { IconsByKeyword } from './generated/sanity-icons'

// Hover over 'arrow' in your IDE to see:
//   ArrowDownIcon | ArrowLeftIcon | ArrowRightIcon | ArrowTopRightIcon | ArrowUpIcon
type ArrowIcons = IconsByKeyword['arrow']

// Hover over 'document':
//   DocumentIcon | DocumentPdfIcon | DocumentRemoveIcon | DocumentSheetIcon | ...
type DocIcons = IconsByKeyword['document']
```

### Compile-time validation

```ts
import { iconName } from './generated/sanity-icons'
import { EditIcon } from '@sanity/icons'  // direct import — tree-shaking works

// Validates at compile time without importing the icon module
const name = iconName('EditIcon')    // ✓ narrowed to literal type 'EditIcon'
const bad  = iconName('LocationIcon') // ✗ compile error — LocationIcon doesn't exist
```

### Config objects / serialized data

```ts
import type { SanityIconBaseName } from './generated/sanity-icons'

interface NavItem {
  label: string
  icon: SanityIconBaseName  // autocomplete: 'Edit', 'Search', 'Home', ...
}

const items: NavItem[] = [
  { label: 'Dashboard', icon: 'Dashboard' },  // ✓
  { label: 'Settings',  icon: 'Cog' },        // ✓
  { label: 'Profile',   icon: 'Location' },   // ✗ compile error
]
```

## Generating the registry

```sh
# Write to file (recommended — commit the output)
node generate-icon-registry.mjs --out src/generated/sanity-icons.ts

# Print to stdout
node generate-icon-registry.mjs
```

Add to your build pipeline so it stays in sync:

```json
{
  "scripts": {
    "prebuild": "node generate-icon-registry.mjs --out src/generated/sanity-icons.ts"
  }
}
```

The generated file should be **committed to source control** so that:
- Consumers without `@sanity/icons` installed still get autocomplete
- CI builds don't need the generation step
- The file is diffable in PRs after icon upgrades

## How it works

1. The generator script (`generate-icon-registry.mjs`) requires `@sanity/icons` at build time
2. It reads all exports ending in `Icon` (excluding the generic `Icon` wrapper)
3. It splits PascalCase names into keyword fragments (`DoubleChevronDown` → `double`, `chevron`, `down`)
4. It emits a `.ts` file with type unions, keyword mappings, and identity assertion functions
5. The generated file imports nothing — TypeScript erases it entirely in the compiled output

## Files

| File | Purpose |
|------|---------|
| `generate-icon-registry.mjs` | Build-time script — reads `@sanity/icons`, emits `sanity-icons.ts` |
| `sanity-icons.ts` | Generated output — 760 lines, 0 bytes runtime cost |
| `README.md` | This file |