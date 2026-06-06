import type { FieldCompletionWireRow } from "@filosign/shared";
import type { PDFDocument, PDFFont } from "pdf-lib";
import { rgb } from "pdf-lib";
import { bytesToPngBytes } from "../images";

async function fetchCompletionImageBytes(
	completion: FieldCompletionWireRow,
): Promise<Uint8Array | null> {
	if (!completion.previewUrl) return null;
	try {
		const res = await fetch(completion.previewUrl);
		if (!res.ok) return null;
		return new Uint8Array(await res.arrayBuffer());
	} catch {
		return null;
	}
}

export async function drawFieldCompletionVisual(
	doc: PDFDocument,
	page: ReturnType<PDFDocument["getPage"]>,
	x: number,
	yPdf: number,
	rw: number,
	rh: number,
	completion: FieldCompletionWireRow,
): Promise<boolean> {
	if (completion.valueKind !== "visual" || !completion.previewUrl) {
		return false;
	}
	const bytes = await fetchCompletionImageBytes(completion);
	if (!bytes) return false;

	let image: Awaited<ReturnType<PDFDocument["embedPng"]>>;
	try {
		image = await doc.embedPng(await bytesToPngBytes(bytes, "image/png"));
	} catch {
		try {
			image = await doc.embedPng(await bytesToPngBytes(bytes, "image/webp"));
		} catch {
			return false;
		}
	}

	const pad = Math.min(4, Math.min(rw, rh) * 0.08);
	const innerW = Math.max(1, rw - 2 * pad);
	const innerH = Math.max(1, rh - 2 * pad);
	const scale = Math.min(innerW / image.width, innerH / image.height);
	const w = image.width * scale;
	const h = image.height * scale;
	const ix = x + (rw - w) / 2;
	const iy = yPdf + (rh - h) / 2;
	page.drawImage(image, { x: ix, y: iy, width: w, height: h });
	return true;
}

export function drawCompletionTextOnField(
	page: ReturnType<PDFDocument["getPage"]>,
	x: number,
	yPdf: number,
	_rw: number,
	rh: number,
	completion: FieldCompletionWireRow,
	font: PDFFont,
): boolean {
	if (
		!completion.textValue ||
		!(
			completion.valueKind === "auto" ||
			completion.valueKind === "text" ||
			completion.valueKind === "checkbox"
		)
	) {
		return false;
	}

	const text =
		completion.valueKind === "checkbox"
			? completion.textValue === "true"
				? "✓"
				: ""
			: completion.textValue;
	if (!text) return false;

	const size = Math.min(10, Math.max(7, rh * 0.35));
	page.drawText(text, {
		x: x + 4,
		y: yPdf + rh / 2 - size / 3,
		size,
		font,
		color: rgb(0.1, 0.1, 0.11),
	});
	return true;
}
