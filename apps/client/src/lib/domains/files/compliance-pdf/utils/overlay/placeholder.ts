import type { PDFDocument, PDFFont } from "pdf-lib";
import { rgb } from "pdf-lib";
import { lineHeightAt } from "../text";
import {
	buildOverlaySegments,
	fitOverlaySegmentsToHeight,
	overlaySegTotalHeight,
} from "./text-layout";

type PlacementStatus = "signed" | "draft" | "pending";

function statusColors(st: PlacementStatus) {
	const border =
		st === "signed"
			? rgb(0.1, 0.55, 0.25)
			: st === "draft"
				? rgb(0.85, 0.5, 0.1)
				: rgb(0.55, 0.55, 0.55);
	const bg =
		st === "signed"
			? rgb(0.75, 0.95, 0.8)
			: st === "draft"
				? rgb(1, 0.94, 0.85)
				: rgb(0.94, 0.94, 0.94);
	return { border, bg };
}

type DrawPlaceholderOverlayInput = {
	page: ReturnType<PDFDocument["getPage"]>;
	x: number;
	yPdf: number;
	rw: number;
	rh: number;
	st: PlacementStatus;
	displayName: string;
	email: string;
	footerText: string;
	font: PDFFont;
	fontBold: PDFFont;
};

export function drawPlaceholderOverlay(
	input: DrawPlaceholderOverlayInput,
): void {
	const {
		page,
		x,
		yPdf,
		rw,
		rh,
		st,
		displayName,
		email,
		footerText,
		font,
		fontBold,
	} = input;

	const { border, bg } = statusColors(st);

	page.drawRectangle({
		x,
		y: yPdf,
		width: rw,
		height: rh,
		borderColor: border,
		borderWidth: 1.5,
		color: bg,
		opacity: 0.38,
	});

	const pad = Math.min(6, Math.max(3, Math.min(rw, rh) * 0.06));
	const innerW = Math.max(28, rw - 2 * pad);

	const nameSize = Math.min(8.5, Math.max(6, Math.min(rh / 5, rw / 22)));

	const rebuild = (nextNameSize: number) =>
		buildOverlaySegments({
			displayName,
			email,
			footerText,
			innerW,
			font,
			fontBold,
			nameSize: nextNameSize,
		});

	let segments = rebuild(nameSize);
	const cap = rh - 2 * pad;
	segments = fitOverlaySegmentsToHeight(segments, cap, nameSize, rebuild);

	if (segments.length === 0) return;

	const blockH = Math.min(
		cap,
		Math.max(overlaySegTotalHeight(segments), lineHeightAt(fontBold, nameSize)),
	);
	page.drawRectangle({
		x: x + 0.75,
		y: yPdf + rh - blockH - pad * 0.5,
		width: Math.max(0, rw - 1.5),
		height: blockH + pad * 0.5,
		color: rgb(1, 1, 1),
		opacity: 0.92,
		borderWidth: 0,
	});

	let baseline = yPdf + rh - pad - segments[0].size * 0.85;
	for (const seg of segments) {
		if (baseline < yPdf + pad) break;
		page.drawText(seg.text, {
			x: x + pad,
			y: baseline,
			size: seg.size,
			font: seg.font,
			color: rgb(0.1, 0.1, 0.11),
		});
		baseline -= lineHeightAt(seg.font, seg.size);
	}
}

export type { PlacementStatus };
