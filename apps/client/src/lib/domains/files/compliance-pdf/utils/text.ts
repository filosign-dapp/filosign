import type { PDFFont, PDFPage, RGB } from "pdf-lib";
import { breakTextIntoLines } from "pdf-lib";

const WORD_BREAKS_FULL = ["", " ", "-"] as const;

/** Default body line multiplier (matches PDF layout constants). */
const DEFAULT_LINE_MULT = 1.38;

const UNICODE_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
	["\u202f", " "],
	["\u00a0", " "],
	["\u2007", " "],
	["\u2009", " "],
	["\u200a", " "],
	["\u2018", "'"],
	["\u2019", "'"],
	["\u201c", '"'],
	["\u201d", '"'],
	["\u2013", "-"],
	["\u2014", "-"],
	["\u2026", "..."],
];

function normalizeUnicodeForPdf(text: string): string {
	let out = text;
	for (const [from, to] of UNICODE_REPLACEMENTS) {
		out = out.split(from).join(to);
	}
	return out;
}

function isWhitespaceLike(ch: string): boolean {
	return ch.trim() === "" && ch !== "";
}

function canMeasureChar(font: PDFFont, ch: string, size: number): boolean {
	try {
		font.widthOfTextAtSize(ch, size);
		return true;
	} catch {
		return false;
	}
}

/** Map dynamic strings to WinAnsi-safe text for pdf-lib StandardFonts. */
export function sanitizeTextForWinAnsiPdf(
	text: string,
	font: PDFFont,
	size: number,
): string {
	const normalized = normalizeUnicodeForPdf(text);
	try {
		font.widthOfTextAtSize(normalized, size);
		return normalized;
	} catch {
		return Array.from(normalized)
			.map((ch) => {
				if (canMeasureChar(font, ch, size)) return ch;
				return isWhitespaceLike(ch) ? " " : "?";
			})
			.join("");
	}
}

export function measureTextWidth(
	font: PDFFont,
	text: string,
	size: number,
): number {
	const safe = sanitizeTextForWinAnsiPdf(text, font, size);
	return font.widthOfTextAtSize(safe, size);
}

export function drawPdfText(
	page: PDFPage,
	text: string,
	options: {
		x: number;
		y: number;
		size: number;
		font: PDFFont;
		color: RGB;
	},
): void {
	const safe = sanitizeTextForWinAnsiPdf(text, options.font, options.size);
	page.drawText(safe, options);
}

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
	const safe = sanitizeTextForWinAnsiPdf(text, font, size);
	const measure = (t: string) => font.widthOfTextAtSize(t, size);
	return breakTextIntoLines(safe, [...WORD_BREAKS_FULL], maxWidth, measure);
}
