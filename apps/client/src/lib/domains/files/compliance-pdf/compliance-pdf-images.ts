import type { PDFDocument, PDFImage } from "pdf-lib";

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
	const pngBlob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
			"image/png",
		);
	});
	const buf = await pngBlob.arrayBuffer();
	return new Uint8Array(buf);
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
