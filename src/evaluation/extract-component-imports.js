import { isJsxFile, MAX_PARSE_BYTES } from "./parse-files.js";

/**
 * Extract unique imported component names from a set of source files,
 * scanning imports from any of the listed packages — and, optionally, from
 * local path prefixes.
 *
 * `importPathPrefixes` exists for "copy-in" design systems, where components
 * are vendored into the project's own tree rather than installed as a
 * package. shadcn/ui is the reference case: `npx shadcn add button` writes
 * `src/components/ui/button.tsx`, and app code imports
 * `from '@/components/ui/button'` — there is no package specifier to match,
 * so package-name matching alone reports ~0 components for an app that
 * actually uses dozens (measured 2026-09-03: 7 captured vs ~25 real, all 7
 * being icons from the one genuinely-installed package). That made the
 * report's component counts incomparable between copy-in and installed
 * systems.
 *
 * This is measurement only. It changes what the harness *counts*, never what
 * the agent is told, installs, or builds. Omitted/empty leaves behaviour
 * byte-identical to package-name-only matching.
 *
 * @param {Array<{path:string,content:string}>} files
 * @param {string[]} [packageNames]
 *        Package names whose named imports should be collected.
 * @param {string[]} [importPathPrefixes]
 *        Local import-specifier prefixes to also collect from, e.g.
 *        `["@/components/ui/"]`. Matched as a literal prefix of the
 *        specifier, so `@/components/ui/button` matches but
 *        `@/components/layout/header` does not.
 * @returns {Set<string>}
 *        Empty when both `packageNames` and `importPathPrefixes` are
 *        empty/omitted.
 */
export function extractComponentImports(files, packageNames, importPathPrefixes) {
  const components = new Set();
  const names = Array.isArray(packageNames) ? packageNames : [];
  const prefixes = Array.isArray(importPathPrefixes) ? importPathPrefixes : [];
  if (names.length === 0 && prefixes.length === 0) {
    return components;
  }

  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Package names keep EXACT whole-specifier matching, unchanged — adding
  // subpath tolerance here would silently alter what every existing test
  // counts (e.g. `@sanity/icons/Search`) and break comparability with past
  // runs. Path prefixes are purely additive: they match any specifier
  // starting with the prefix. One alternation keeps the tail test a single
  // anchored regex, preserving the linear-scan properties above.
  const alternatives = [...names.map(escRe), ...prefixes.map((p) => `${escRe(p)}[^'"]*`)];
  const pattern = alternatives.join("|");
  // Anchor: `import [type] {` up to the opening brace. No nested unbounded
  // quantifiers, so no catastrophic backtracking. The brace BODY and the
  // `} from "pkg"` tail are matched WITHOUT a `[^}]+`-to-far-terminator regex
  // (see below) — that pattern backtracked across the whole buffer at every
  // anchor on `import {`-flood input (O(n²)); a size cap alone can't tame
  // that at multi-MB sizes, so the body is found by linear indexOf instead.
  // The optional `Default,` before the brace matters: Atlaskit writes
  // `import Avatar, { AvatarItem } from "@atlaskit/avatar"`, and anchoring
  // strictly on `import {` dropped the NAMED half of every such statement.
  // Bounded group, so the linear-scan property above is unchanged.
  const anchorRe = /import\s+(?:type\s+)?(?:[A-Za-z_$][\w$]*\s*,\s*)?\{/g;
  const tailRe = new RegExp(`^\\s*from\\s*['"](?:${pattern})['"]`);

  // Default imports (`import Button from "@atlaskit/button/new"`). The brace
  // scanner below only sees `import { … } from`, which is what Sanity UI and
  // shadcn use — but Atlassian's design system exports most components as
  // DEFAULTS, one package per component, so without this the majority of an
  // Atlaskit app's components are invisible to the count (measured
  // 2026-09-09: 3 of 6 real imports captured). Scoped to the same specifier
  // list as the named-import path, so a test that matches no specifier here
  // is unaffected.
  const defaultRe = new RegExp(
    `import\\s+(?:type\\s+)?([A-Za-z_$][\\w$]*)\\s*(?:,\\s*\\{[^}]*\\})?\\s*from\\s*['"](?:${pattern})['"]`,
    "g",
  );

  for (const file of files) {
    if (!isJsxFile(file.path)) continue;

    const content =
      file.content.length > MAX_PARSE_BYTES ? file.content.slice(0, MAX_PARSE_BYTES) : file.content;

    defaultRe.lastIndex = 0;
    let dm;
    while ((dm = defaultRe.exec(content)) !== null) {
      // `import type X from` is a type-only import; still a referenced export.
      if (dm[1]) components.add(dm[1]);
    }

    anchorRe.lastIndex = 0;
    let anchor;
    while ((anchor = anchorRe.exec(content)) !== null) {
      const braceOpen = anchor.index + anchor[0].length; // just past `{`
      const close = content.indexOf("}", braceOpen);
      // No closing brace anywhere ahead → no valid import can follow either,
      // since anchors only advance. Stop instead of rescanning to EOF per
      // anchor (which is what made the old regex quadratic).
      if (close === -1) break;
      // Only inspect a bounded tail window for the `} from "pkg"` suffix.
      if (tailRe.test(content.slice(close + 1, close + 1 + 512))) {
        const names = content
          .slice(braceOpen, close)
          .split(",")
          .map((s) =>
            s
              .trim()
              .split(/\s+as\s+/)[0]
              .trim(),
          );
        for (const name of names) {
          if (name) components.add(name);
        }
      }
      anchorRe.lastIndex = close + 1; // resume after this brace
    }
  }

  return components;
}
