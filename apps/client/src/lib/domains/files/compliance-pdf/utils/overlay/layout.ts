import type { PDFFont, RGB } from "pdf-lib";
import { rgb } from "pdf-lib";

export type FieldInnerRect = {
	x: number;
	yPdf: number;
	width: number;
	height: number;
};

export function fieldInnerPadding(
	fieldWidth: number,
	fieldHeight: number,
): number {
	return Math.min(2.5, Math.max(1.5, Math.min(fieldWidth, fieldHeight) * 0.04));
}

export function recipientAccentWidth(fieldWidth: number): number {
	return Math.max(2, Math.min(3.5, fieldWidth * 0.045));
}

export function fieldCornerRadius(
	fieldWidth: number,
	fieldHeight: number,
): number {
	return Math.min(7, Math.max(3, Math.min(fieldWidth, fieldHeight) * 0.16));
}

export function innerRectFromField(
	x: number,
	yPdf: number,
	rw: number,
	rh: number,
): FieldInnerRect {
	const pad = fieldInnerPadding(rw, rh);
	const accentW = recipientAccentWidth(rw);
	return {
		x: x + accentW + pad,
		yPdf: yPdf + pad,
		width: Math.max(1, rw - accentW - 2 * pad),
		height: Math.max(1, rh - 2 * pad),
	};
}

export function fillContentFontSize(
	inner: FieldInnerRect,
	font: PDFFont,
	text: string,
	minSize = 6,
): number {
	const maxHeight = inner.height * 0.72;
	const maxWidth = inner.width * 0.92;
	let size = inner.height * 0.62;
	while (size > minSize) {
		if (
			font.widthOfTextAtSize(text, size) <= maxWidth &&
			font.heightAtSize(size) <= maxHeight
		) {
			return size;
		}
		size -= 0.25;
	}
	return minSize;
}

export function textBaselineY(
	inner: FieldInnerRect,
	font: PDFFont,
	size: number,
): number {
	const textHeight = font.heightAtSize(size);
	const capHeight = font.heightAtSize(size, { descender: false });
	const descenderDepth = textHeight - capHeight;
	const verticalNudge = Math.min(2.5, Math.max(1, inner.height * 0.05));
	return (
		inner.yPdf +
		(inner.height - textHeight) / 2 +
		descenderDepth -
		verticalNudge
	);
}

export function textXCentered(
	inner: FieldInnerRect,
	font: PDFFont,
	text: string,
	size: number,
): number {
	const textWidth = font.widthOfTextAtSize(text, size);
	return inner.x + (inner.width - textWidth) / 2;
}

export function hexToPdfRgb(hex: string): RGB {
	const normalized = hex.trim().replace(/^#/, "");
	if (normalized.length !== 6) {
		return rgb(0.2, 0.2, 0.2);
	}
	const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
	const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
	const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
	return rgb(r, g, b);
}
