/**
 * Colour for console output.
 *
 * Named by meaning rather than by colour so the palette can be changed in
 * one place. Node handles turning colour off when output is piped to a file
 * or NO_COLOR is set.
 */

import { styleText } from "node:util";

export const success = (s) => styleText("green", s);
export const error = (s) => styleText("red", s);
export const warn = (s) => styleText("yellow", s);
export const dim = (s) => styleText("dim", s);
export const bold = (s) => styleText("bold", s);

/**
 * The `[label]` prefix on most log lines. Dimmed so the message reads first.
 */
export const tag = (label) => styleText("dim", `[${label}]`);

/** Heading for the startup block and section dividers. */
export const banner = (s) => styleText(["bold", "cyan"], s);
