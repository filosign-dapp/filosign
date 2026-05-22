import type { PDFFont } from "pdf-lib";
import { breakTextIntoLines } from "pdf-lib";

const WORD_BREAKS_FULL = ["", " ", "-"] as const;

/** Default body line multiplier (matches PDF layout constants). */
const DEFAULT_LINE_MULT = 1.38;

export function lineHeightAt(
	font: PDFFont,
	size: number,
	mult: number = DEFAULT_LINE_MULT,
): number {
	return font.heightAtSize(size) * mult;
}

export function wrapLines(
	text: string,
	maxWidth: number,
	font: PDFFont,
	size: number,
): string[] {
	if (!text) return [""];
	const measure = (t: string) => font.widthOfTextAtSize(t, size);
	return breakTextIntoLines(text, [...WORD_BREAKS_FULL], maxWidth, measure);
}
