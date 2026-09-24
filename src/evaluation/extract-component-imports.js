import { isJsxFile, MAX_PARSE_BYTES } from "./parse-files.js";

/**
 * Collect the component names a project imports from the design system.
 *
 * `importPathPrefixes` covers design systems that are copied into the project
 * rather than installed. shadcn/ui works this way: `npx shadcn add button`
 * writes `src/components/ui/button.tsx` and app code imports from
 * `@/components/ui/button`, so there is no package name to match on and
 * matching by package alone would report almost nothing.
 *
 * This only affects what gets counted. It never changes what the agent is
 * told, installs, or builds.
 *
 * @param {Array<{path:string,content:string}>} files
 * @param {string[]} [packageNames] Packages whose named imports to collect.
 * @param {string[]} [importPathPrefixes] Local path prefixes to also collect
 *        from, e.g. `["@/components/ui/"]`. Matched as a plain prefix.
 * @returns {Set<string>} Empty when neither argument is given.
 */
export function extractComponentImports(files, packageNames, importPathPrefixes) {
  const components = new Set();
  const names = Array.isArray(packageNames) ? packageNames : [];
  const prefixes = Array.isArray(importPathPrefixes) ? importPathPrefixes : [];
  if (names.length === 0 && prefixes.length === 0) {
    return components;
  }

  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Package names must match the whole import path. Path prefixes match any
  // import that starts with them.
  const alternatives = [...names.map(escRe), ...prefixes.map((p) => `${escRe(p)}[^'"]*`)];
  const pattern = alternatives.join("|");
  // Find `import {` and then locate the closing brace by searching forward,
  // rather than matching the whole statement with one regex. A single regex
  // gets very slow on files with many import statements.
  //
  // The optional name before the brace matters: Atlaskit writes
  // `import Avatar, { AvatarItem } from "@atlaskit/avatar"`, and matching
  // only on `import {` would miss the named half of those.
  const anchorRe = /import\s+(?:type\s+)?(?:[A-Za-z_$][\w$]*\s*,\s*)?\{/g;
  const tailRe = new RegExp(`^\\s*from\\s*['"](?:${pattern})['"]`);

  // Default imports, e.g. `import Button from "@atlaskit/button/new"`. Sanity
  // UI and shadcn use named imports, but Atlaskit ships most components as
  // default exports with one package each, so without this most of an
  // Atlaskit app's components would not be counted.
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
      if (dm[1]) components.add(dm[1]);
    }

    anchorRe.lastIndex = 0;
    let anchor;
    while ((anchor = anchorRe.exec(content)) !== null) {
      const braceOpen = anchor.index + anchor[0].length; // just past `{`
      const close = content.indexOf("}", braceOpen);
      // No closing brace ahead means no further import can match either.
      if (close === -1) break;
      // Check a short window after the brace for the `from "pkg"` part.
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
