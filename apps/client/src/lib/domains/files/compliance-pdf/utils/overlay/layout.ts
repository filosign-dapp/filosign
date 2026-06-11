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
	return Math.min(3, Math.max(2, Math.min(fieldWidth, fieldHeight) * 0.06));
}

export function recipientUnderlineHeight(fieldHeight: number): number {
	return Math.max(2, Math.min(4, fieldHeight * 0.14));
}

export function innerRectFromField(
	x: number,
	yPdf: number,
	rw: number,
	rh: number,
): FieldInnerRect {
	const pad = fieldInnerPadding(rw, rh);
	const underlineH = recipientUnderlineHeight(rh);
	return {
		x: x + pad,
		yPdf: yPdf + pad,
		width: Math.max(1, rw - 2 * pad),
		height: Math.max(1, rh - 2 * pad - underlineH),
	};
}

export function bodyFontSize(fieldHeight: number): number {
	return Math.min(11, Math.max(8, fieldHeight * 0.62));
}

export function textBaselineY(
	inner: FieldInnerRect,
	font: PDFFont,
	size: number,
): number {
	const textHeight = font.heightAtSize(size);
	return inner.yPdf + (inner.height - textHeight) / 2;
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

export function fitTextFontSize(
	inner: FieldInnerRect,
	font: PDFFont,
	text: string,
	preferredSize: number,
	minSize = 7,
): number {
	let size = preferredSize;
	while (size > minSize && font.widthOfTextAtSize(text, size) > inner.width) {
		size -= 0.5;
	}
	return size;
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
