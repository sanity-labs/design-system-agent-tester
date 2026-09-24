/**
 * Reduce generated source to a canonical shape, so two outputs can be
 * compared on what they built rather than on how they were typed.
 *
 * The variance metric used to compare raw source text as character n-grams.
 * That number moves when a model renames a variable, reorders JSX
 * attributes, reflows a line, or adds a comment — none of which are
 * differences in the app. It could report two identical component trees as
 * meaningfully different, and two different trees as similar because they
 * shared boilerplate.
 *
 * Parsing gives three sets per iteration instead, because they answer
 * different questions and a single number conflates them:
 *
 *   names — every element as `kind:Name`. Did the runs reach for the same
 *     components at all?
 *   composition — every parent-to-child pair as `kind:Parent>kind:Child`. Did
 *     they assemble those components the same way? This is the one that
 *     matches the intent most closely: a Dialog wrapping a Button and a Card
 *     wrapping one differ here even when their element sets match.
 *   elements — every element as `kind:Name{sorted,prop,names}`. Did they
 *     configure them the same way? This is the most sensitive of the three,
 *     because every distinct combination of layout props on a Box or Flex is
 *     its own token. Measured on a real run, component names agreed 87% of
 *     the time while prop combinations agreed 30% — most of that spread is
 *     incidental layout tuning rather than a different app, so read this as a
 *     drill-down and not as the headline.
 *
 * Prop values are dropped throughout, so a renamed handler is not a change,
 * and prop names are sorted, so attribute order is not either.
 *
 * `kind` is `ds`, `local` or `html`, so a component rebuilt out of raw
 * elements scores apart from one using the real thing even if the names look
 * similar.
 *
 * Locally defined components are recorded WITHOUT their names. What an agent
 * calls its own wrapper — `Stepper` or `StepperRail`, `ConfirmModal` or
 * `ConfirmationDialog` — is a naming choice, and how it splits the app into
 * components is a factoring choice. Neither is a difference in what was
 * built, and counting them reintroduces exactly the noise this module exists
 * to remove. The design system elements inside those wrappers are still
 * counted, so the real content is not lost.
 */

import { createRequire } from "node:module";
import { isJsxFile } from "./parse-files.js";

// TypeScript is a devDependency and this is the only runtime code that needs
// it, so it is loaded here rather than at the top of the module. A sync
// require keeps the callers sync. When it is missing the caller reports no
// normalized number instead of failing the run.
let tsModule;
function loadTypeScript() {
  if (tsModule !== undefined) return tsModule;
  try {
    tsModule = createRequire(import.meta.url)("typescript");
  } catch {
    tsModule = null;
  }
  return tsModule;
}

/** Reset the cached module. Tests only. */
export function _resetTypeScriptCache() {
  tsModule = undefined;
}

/** React wrappers that render nothing, so they are not part of the output. */
const NON_RENDERING = new Set(["React.Fragment", "Fragment", "React.StrictMode", "StrictMode"]);

/**
 * Which bucket an element name belongs to. A compound name like
 * `Dialog.Footer` is judged by its root, `Dialog`.
 */
function kindOf(name, dsComponents) {
  const root = name.split(".")[0];
  if (!/^[A-Z]/.test(root)) return "html";
  return dsComponents.has(root) ? "ds" : "local";
}

/**
 * The name to record for an element. Local components collapse to `*` so
 * their arbitrary names cannot affect the comparison.
 *
 * This also absorbs a known gap elsewhere: `extractComponentImports` matches
 * package names whole, so an icon imported from a subpath such as
 * `@sanity/icons/Edit` is not in `dsComponents` and lands here as local.
 * Collapsing means a run that used EditIcon and one that used CheckmarkIcon
 * no longer look structurally different for that reason alone.
 */
function identityOf(name, kind, collapseLocalNames) {
  return kind === "local" && collapseLocalNames ? "*" : name;
}

/**
 * Parse one file and add its elements and parent-child pairs to the sets.
 * A file that cannot be parsed is skipped rather than failing the batch —
 * generated code is sometimes genuinely broken, which is a build failure
 * rather than a reason to lose the whole comparison.
 */
function collectFromFile(
  ts,
  path,
  content,
  dsComponents,
  elements,
  composition,
  collapseLocalNames,
) {
  let sourceFile;
  try {
    sourceFile = ts.createSourceFile(
      path,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
  } catch {
    return;
  }

  const nameOf = (node) => {
    try {
      return node.tagName.getText(sourceFile);
    } catch {
      return null;
    }
  };

  const propsOf = (node) => {
    const names = [];
    for (const prop of node.attributes?.properties ?? []) {
      // A spread carries no name of its own. It is recorded as one token so
      // that spreading props and listing them are not treated as the same.
      if (ts.isJsxSpreadAttribute(prop)) {
        names.push("...");
        continue;
      }
      try {
        names.push(prop.name.getText(sourceFile));
      } catch {
        // Unnamed or malformed attribute: skip it.
      }
    }
    // Sorted so attribute order never affects the result. De-duplicated
    // because a repeated attribute is a mistake, not a structural fact.
    return [...new Set(names)].sort();
  };

  const parentIdOf = (name) => {
    const kind = kindOf(name, dsComponents);
    return `${kind}:${identityOf(name, kind, collapseLocalNames)}`;
  };

  const record = (node, name, parentName) => {
    const kind = kindOf(name, dsComponents);
    const id = identityOf(name, kind, collapseLocalNames);
    // A local component's prop names are as arbitrary as its name, so they
    // are dropped too. Design system and raw elements keep theirs.
    const props = kind === "local" && collapseLocalNames ? "" : propsOf(node).join(",");
    elements.add(`${kind}:${id}{${props}}`);
    if (parentName) composition.add(`${parentName}>${kind}:${id}`);
  };

  // JSX can also appear inside a prop, e.g. `header={<Text/>}`. That element
  // really does render inside this one, so it is walked with this element as
  // its parent.
  const walkAttributes = (node, parentName) => {
    for (const prop of node.attributes?.properties ?? []) {
      ts.forEachChild(prop, (child) => walk(child, parentName));
    }
  };

  // In the TypeScript AST a JsxElement holds its opening tag and its children
  // as siblings, so the opening tag is NOT an ancestor of the children.
  // Parentage has to be threaded from the JsxElement itself.
  const walk = (node, parentName) => {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      const name = nameOf(opening);
      const rendered = name && !NON_RENDERING.has(name);
      if (rendered) record(opening, name, parentName);
      const next = rendered ? parentIdOf(name) : parentName;
      walkAttributes(opening, next);
      for (const child of node.children) walk(child, next);
      return;
    }

    if (ts.isJsxSelfClosingElement(node)) {
      const name = nameOf(node);
      const rendered = name && !NON_RENDERING.has(name);
      if (rendered) record(node, name, parentName);
      walkAttributes(node, rendered ? parentIdOf(name) : parentName);
      return;
    }

    // A fragment renders nothing itself, so its children keep the outer parent.
    if (ts.isJsxFragment(node)) {
      for (const child of node.children) walk(child, parentName);
      return;
    }

    ts.forEachChild(node, (child) => walk(child, parentName));
  };

  walk(sourceFile, null);
}

/**
 * Canonical sets for one iteration's files.
 *
 * @param {Array<{path:string,content:string}>} files
 * @param {object} [options]
 * @param {Set<string>|string[]} [options.dsComponents] Names imported from the
 *   design system, from `extractComponentImports`. Without it every
 *   capitalised element counts as local, which still compares fairly across
 *   iterations of the same test — they are all judged the same way.
 * @param {boolean} [options.collapseLocalNames=true] Record locally defined
 *   components without their names. Set false only to inspect raw output.
 * @returns {{names: Set<string>, elements: Set<string>, composition: Set<string>}|null}
 *   null when TypeScript is unavailable.
 */
export function normalizeIteration(files, options = {}) {
  const ts = loadTypeScript();
  if (!ts) return null;

  const dsComponents = new Set(options.dsComponents ?? []);
  const collapseLocalNames = options.collapseLocalNames ?? true;
  const elements = new Set();
  const composition = new Set();
  const names = new Set();

  for (const file of files ?? []) {
    if (!file?.path || typeof file.content !== "string") continue;
    if (!isJsxFile(file.path)) continue;
    collectFromFile(
      ts,
      file.path,
      file.content,
      dsComponents,
      elements,
      composition,
      collapseLocalNames,
    );
  }

  // Component choice is the element set with the prop detail removed.
  for (const token of elements) names.add(token.slice(0, token.indexOf("{")));

  return { names, elements, composition };
}

/** True when the normalized comparison can run at all. */
export function normalizationAvailable() {
  return loadTypeScript() !== null;
}
