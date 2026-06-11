import type { PDFPage, RGB } from "pdf-lib";
import { rgb } from "pdf-lib";
import { recipientUnderlineHeight } from "./layout";

export function drawRecipientFieldChrome(
	page: PDFPage,
	x: number,
	yPdf: number,
	rw: number,
	rh: number,
	accent: RGB,
): void {
	const underlineH = recipientUnderlineHeight(rh);

	page.drawRectangle({
		x,
		y: yPdf,
		width: rw,
		height: rh,
		borderColor: rgb(0.12, 0.12, 0.12),
		borderWidth: 1,
		color: rgb(1, 1, 1),
	});

	page.drawRectangle({
		x,
		y: yPdf,
		width: rw,
		height: underlineH,
		color: accent,
		borderWidth: 0,
	});
}
