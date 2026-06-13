import type { PDFPage, RGB } from "pdf-lib";
import { rgb } from "pdf-lib";
import {
	type FieldInnerRect,
	fieldCornerRadius,
	recipientAccentWidth,
} from "./layout";

export const PLACEMENT_CHROME = rgb(0.051, 0.051, 0.051);
export const PLACEMENT_CHROME_BORDER = rgb(1, 1, 1);
export const PLACEMENT_FILL = rgb(1, 1, 1);

function clampRadius(radius: number, width: number, height: number): number {
	return Math.min(radius, width / 2, height / 2);
}

export function roundedRectSvgPath(
	width: number,
	height: number,
	radius: number,
): string {
	const r = clampRadius(radius, width, height);
	const w = width;
	const h = height;
	return [
		`M ${r} 0`,
		`L ${w - r} 0`,
		`Q ${w} 0 ${w} ${r}`,
		`L ${w} ${h - r}`,
		`Q ${w} ${h} ${w - r} ${h}`,
		`L ${r} ${h}`,
		`Q 0 ${h} 0 ${h - r}`,
		`L 0 ${r}`,
		`Q 0 0 ${r} 0`,
		"Z",
	].join(" ");
}

function leftAccentSvgPath(
	accentW: number,
	height: number,
	radius: number,
): string {
	const r = clampRadius(radius, accentW * 2, height);
	const w = accentW;
	const h = height;
	return [
		`M 0 ${r}`,
		`Q 0 0 ${r} 0`,
		`L ${w} 0`,
		`L ${w} ${h}`,
		`L ${r} ${h}`,
		`Q 0 ${h} 0 ${h - r}`,
		"Z",
	].join(" ");
}

export function drawRecipientFieldChrome(
	page: PDFPage,
	x: number,
	yPdf: number,
	rw: number,
	rh: number,
	accent: RGB,
	options?: { variant?: "default" | "muted" },
): void {
	const radius = fieldCornerRadius(rw, rh);
	const accentW = recipientAccentWidth(rw);
	const variant = options?.variant ?? "default";

	page.drawSvgPath(roundedRectSvgPath(rw, rh, radius), {
		x,
		y: yPdf + rh,
		color: PLACEMENT_CHROME,
		borderColor: PLACEMENT_CHROME_BORDER,
		borderWidth: 0.75,
		borderOpacity: variant === "muted" ? 0.18 : 0.22,
		opacity: variant === "muted" ? 0.92 : 1,
	});

	page.drawSvgPath(leftAccentSvgPath(accentW, rh, radius), {
		x,
		y: yPdf + rh,
		color: accent,
		borderWidth: 0,
	});
}

export function drawPlacementFieldInnerFill(
	page: PDFPage,
	inner: FieldInnerRect,
	outerW: number,
	outerH: number,
): void {
	const radius = Math.max(2, fieldCornerRadius(outerW, outerH) * 0.72);
	page.drawSvgPath(roundedRectSvgPath(inner.width, inner.height, radius), {
		x: inner.x,
		y: inner.yPdf + inner.height,
		color: PLACEMENT_FILL,
		borderWidth: 0,
	});
}
