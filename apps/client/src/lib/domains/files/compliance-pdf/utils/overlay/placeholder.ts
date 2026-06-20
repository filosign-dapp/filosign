import type { PDFDocument, PDFFont, RGB } from "pdf-lib";
import { rgb } from "pdf-lib";
import { drawPdfText, lineHeightAt } from "../text";
import { drawRecipientFieldChrome } from "./chrome";
import { recipientAccentWidth } from "./layout";
import {
	buildOverlaySegments,
	fitOverlaySegmentsToHeight,
	overlaySegTotalHeight,
} from "./text-layout";

type PlacementStatus = "signed" | "draft" | "pending";

const PLACEMENT_CHROME_FOREGROUND = rgb(0.985, 0.985, 0.985);
const PLACEMENT_CHROME_MUTED_FG = rgb(0.62, 0.62, 0.65);

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
	accent: RGB;
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
		displayName,
		email,
		footerText,
		font,
		fontBold,
		accent,
	} = input;

	drawRecipientFieldChrome(page, x, yPdf, rw, rh, accent, {
		variant: "muted",
	});

	const pad = Math.min(6, Math.max(3, Math.min(rw, rh) * 0.06));
	const accentW = recipientAccentWidth(rw);
	const innerX = x + accentW + pad;
	const innerW = Math.max(28, rw - accentW - 2 * pad);
	const innerTop = yPdf + rh - pad;

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

	let baseline = innerTop - segments[0].size * 0.85;
	const verticalOffset = Math.max(0, (cap - blockH) / 2);
	baseline -= verticalOffset;

	for (const [index, seg] of segments.entries()) {
		if (baseline < yPdf + pad) break;
		drawPdfText(page, seg.text, {
			x: innerX,
			y: baseline,
			size: seg.size,
			font: seg.font,
			color:
				index === 0 ? PLACEMENT_CHROME_FOREGROUND : PLACEMENT_CHROME_MUTED_FG,
		});
		baseline -= lineHeightAt(seg.font, seg.size);
	}
}

export type { PlacementStatus };
