## Type checking

Build tools like Vite and esbuild strip TypeScript types without checking them. Your app compiles and runs even when type errors exist. The most common result: you pass a prop to a component, it gets ignored, and nothing tells you.

Run the TypeScript compiler to catch these:

```
npx tsc --noEmit
```

This checks every `.ts` and `.tsx` file without producing output. It exits with a non-zero code if errors exist.

### What it catches

**Card layout props** — Card ignores `flexGrow`, `minWidth`, `overflow`, and other layout props at runtime. No error appears. `tsc` flags them:

```
// ✗ — renders but layout silently breaks
<Card flexGrow={1} overflow="auto">...</Card>
// tsc: Property 'flexGrow' does not exist on type 'CardProps'.
```

**Removed v3 props** — `padding`, `radius`, `shadow`, `border`, `selected`, and `scheme` no longer exist on Card. `tsc` catches each one.

**Wrong prop on wrong component** — `Flex` uses `gap`. `Stack` uses `space`. Swapping them does nothing at runtime. `tsc` flags the mismatch.

### Setup

Add to `package.json`:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

Run `npm run typecheck` after setup, after code changes, and before review. For CI, chain it before your build:

```json
{
  "scripts": {
    "build": "tsc --noEmit && vite build"
  }
}
```

Make sure `tsconfig.json` has `"strict": true` — without it, many prop mismatches go unreported.
