import type { FieldCompletionWireRow } from "@filosign/shared";
import type { PDFDocument, PDFFont } from "pdf-lib";
import { rgb } from "pdf-lib";
import { resolveImageMime, supersampleImageBytesForPdfEmbed } from "../images";
import {
	bodyFontSize,
	type FieldInnerRect,
	fitTextFontSize,
	textBaselineY,
	textXCentered,
} from "./layout";

async function fetchCompletionImageBytes(
	completion: FieldCompletionWireRow,
): Promise<{ bytes: Uint8Array; mime: string } | null> {
	if (!completion.previewUrl) return null;
	try {
		const res = await fetch(completion.previewUrl);
		if (!res.ok) return null;
		const bytes = new Uint8Array(await res.arrayBuffer());
		const mime = resolveImageMime(bytes, res.headers.get("content-type"));
		return { bytes, mime };
	} catch {
		return null;
	}
}

export async function drawFieldCompletionVisual(
	doc: PDFDocument,
	page: ReturnType<PDFDocument["getPage"]>,
	inner: FieldInnerRect,
	completion: FieldCompletionWireRow,
): Promise<boolean> {
	if (completion.valueKind !== "visual" || !completion.previewUrl) {
		return false;
	}
	const fetched = await fetchCompletionImageBytes(completion);
	if (!fetched) return false;

	const { x, yPdf, width: innerW, height: innerH } = inner;

	let image: Awaited<ReturnType<PDFDocument["embedPng"]>>;
	try {
		const pngBytes = await supersampleImageBytesForPdfEmbed(
			fetched.bytes,
			fetched.mime,
			innerW,
			innerH,
		);
		image = await doc.embedPng(pngBytes);
	} catch {
		return false;
	}

	const scale = Math.min(innerW / image.width, innerH / image.height);
	const w = image.width * scale;
	const h = image.height * scale;
	const ix = x + (innerW - w) / 2;
	const iy = yPdf + (innerH - h) / 2;
	page.drawImage(image, { x: ix, y: iy, width: w, height: h });
	return true;
}

function drawCheckboxMark(
	page: ReturnType<PDFDocument["getPage"]>,
	inner: FieldInnerRect,
): void {
	const { x, yPdf, width: rw, height: rh } = inner;
	const stroke = rgb(0.1, 0.1, 0.11);
	const thickness = Math.max(1.2, Math.min(rw, rh) * 0.12);
	const markW = Math.min(rw * 0.7, rh * 0.85);
	const markH = rh * 0.7;
	const baseX = x + (rw - markW) / 2;
	const baseY = yPdf + (rh - markH) / 2;
	page.drawLine({
		start: { x: baseX, y: baseY + markH * 0.45 },
		end: { x: baseX + markW * 0.35, y: baseY },
		thickness,
		color: stroke,
	});
	page.drawLine({
		start: { x: baseX + markW * 0.35, y: baseY },
		end: { x: baseX + markW, y: baseY + markH },
		thickness,
		color: stroke,
	});
}

export function drawCompletionTextOnField(
	page: ReturnType<PDFDocument["getPage"]>,
	inner: FieldInnerRect,
	completion: FieldCompletionWireRow,
	font: PDFFont,
): boolean {
	if (completion.valueKind === "checkbox") {
		if (completion.textValue !== "true") return false;
		drawCheckboxMark(page, inner);
		return true;
	}

	if (
		!completion.textValue ||
		!(completion.valueKind === "auto" || completion.valueKind === "text")
	) {
		return false;
	}

	const preferredSize = bodyFontSize(inner.height);
	const size = fitTextFontSize(
		inner,
		font,
		completion.textValue,
		preferredSize,
	);
	page.drawText(completion.textValue, {
		x: textXCentered(inner, font, completion.textValue, size),
		y: textBaselineY(inner, font, size),
		size,
		font,
		color: rgb(0.1, 0.1, 0.11),
	});
	return true;
}
