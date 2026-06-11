import type { PDFDocument, PDFImage } from "pdf-lib";

/** Target raster density when embedding field visuals into PDF (print-friendly). */
export const PDF_EMBED_DPI = 300;

const PDF_POINTS_PER_INCH = 72;

export function pdfPointsToEmbedPixels(
	points: number,
	dpi = PDF_EMBED_DPI,
): number {
	return Math.max(1, Math.ceil((points * dpi) / PDF_POINTS_PER_INCH));
}

function sniffImageMimeFromBytes(bytes: Uint8Array): string | null {
	if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50) {
		return "image/png";
	}
	if (bytes[0] === 0xff && bytes[1] === 0xd8) {
		return "image/jpeg";
	}
	const head = new TextDecoder()
		.decode(bytes.slice(0, Math.min(bytes.length, 256)))
		.trimStart()
		.toLowerCase();
	if (head.startsWith("<svg") || head.includes("<svg")) {
		return "image/svg+xml";
	}
	if (
		bytes.length >= 12 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return "image/webp";
	}
	return null;
}

export function resolveImageMime(
	bytes: Uint8Array,
	contentType: string | null | undefined,
): string {
	const declared = contentType?.split(";")[0]?.trim().toLowerCase();
	if (declared?.startsWith("image/")) return declared;
	const sniffed = sniffImageMimeFromBytes(bytes);
	return sniffed ?? "application/octet-stream";
}

async function canvasToPngBytes(
	canvas: HTMLCanvasElement,
): Promise<Uint8Array> {
	const pngBlob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
			"image/png",
		);
	});
	return new Uint8Array(await pngBlob.arrayBuffer());
}

/**
 * Rasterize image bytes to a PNG sized for sharp PDF embedding at the given
 * display dimensions (PDF points). Downscales high-res sources; upscales only
 * when the source is smaller than the print target.
 */
export async function supersampleImageBytesForPdfEmbed(
	bytes: Uint8Array,
	mime: string,
	displayWidthPt: number,
	displayHeightPt: number,
	dpi = PDF_EMBED_DPI,
): Promise<Uint8Array> {
	const targetW = pdfPointsToEmbedPixels(displayWidthPt, dpi);
	const targetH = pdfPointsToEmbedPixels(displayHeightPt, dpi);

	const blob = new Blob([bytes.slice()], {
		type: mime || "application/octet-stream",
	});
	const bitmap = await createImageBitmap(blob);

	const canvas = document.createElement("canvas");
	canvas.width = targetW;
	canvas.height = targetH;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Could not create canvas context");

	ctx.clearRect(0, 0, targetW, targetH);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";

	const scale = Math.min(targetW / bitmap.width, targetH / bitmap.height);
	const drawW = bitmap.width * scale;
	const drawH = bitmap.height * scale;
	const drawX = (targetW - drawW) / 2;
	const drawY = (targetH - drawH) / 2;
	ctx.drawImage(bitmap, drawX, drawY, drawW, drawH);
	bitmap.close();

	return canvasToPngBytes(canvas);
}

/**
 * Rasterize non-PNG/JPEG bytes to PNG for pdf-lib embedding (browser canvas).
 */
export async function bytesToPngBytes(
	bytes: Uint8Array,
	mime: string,
): Promise<Uint8Array> {
	const lower = mime.toLowerCase();
	if (
		lower === "image/png" ||
		lower === "image/jpeg" ||
		lower === "image/jpg"
	) {
		return bytes;
	}
	const blob = new Blob([bytes.slice()], {
		type: mime || "application/octet-stream",
	});
	const bitmap = await createImageBitmap(blob);
	const canvas = document.createElement("canvas");
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	const c2d = canvas.getContext("2d");
	if (!c2d) throw new Error("Could not create canvas context");
	c2d.drawImage(bitmap, 0, 0);
	bitmap.close();
	return canvasToPngBytes(canvas);
}

export async function embedComplianceLogo(
	doc: PDFDocument,
): Promise<PDFImage | null> {
	try {
		const res = await fetch("/logo.webp");
		if (!res.ok) return null;
		const raw = new Uint8Array(await res.arrayBuffer());
		const png = await bytesToPngBytes(raw, "image/webp");
		return await doc.embedPng(png);
	} catch {
		return null;
	}
}
