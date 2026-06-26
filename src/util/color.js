/**
 * Console-text coloring via Node's built-in `util.styleText`.
 *
 * Wraps the underlying formats in semantic names so the palette can be
 * tuned in one place. `styleText` itself respects TTY detection and the
 * NO_COLOR environment variable, so output piped to a file or run in CI
 * comes out as plain text without any extra handling.
 */

import { styleText } from "node:util";

export const success = (s) => styleText("green", s);
export const error = (s) => styleText("red", s);
export const warn = (s) => styleText("yellow", s);
export const dim = (s) => styleText("dim", s);
export const bold = (s) => styleText("bold", s);

/**
 * `[iter-label]` prefix used at the start of most pipeline log lines.
 * Dimmed so the iteration label fades into the gutter and the actual
 * status message is what reads first.
 */
export const tag = (label) => styleText("dim", `[${label}]`);

/**
 * Bold-cyan banner heading for the startup block and top-level section
 * dividers (e.g. `=== Agent Tester ===`).
 */
export const banner = (s) => styleText(["bold", "cyan"], s);
