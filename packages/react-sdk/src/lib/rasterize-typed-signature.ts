import type { UserSignatureRole } from "@filosign/shared";
import {
	fitSignatureRasterFontSize,
	getSignatureFontRasterSpec,
	measureCanvasTextBox,
	SIGNATURE_RASTER_INK,
} from "@filosign/shared";

/** Physical pixels per logical raster unit (sharp PDF + retina previews). */
const RASTER_PIXEL_RATIO = 4;
const TRIM_ALPHA_THRESHOLD = 8;
const TRIM_PADDING_PX = 6;

function trimCanvasToInk(
	source: HTMLCanvasElement,
	padding = TRIM_PADDING_PX,
): HTMLCanvasElement {
	const ctx = source.getContext("2d");
	if (!ctx) return source;

	const { width, height } = source;
	const data = ctx.getImageData(0, 0, width, height).data;
	let minX = width;
	let minY = height;
	let maxX = 0;
	let maxY = 0;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const alpha = data[(y * width + x) * 4 + 3] ?? 0;
			if (alpha > TRIM_ALPHA_THRESHOLD) {
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y);
			}
		}
	}

	if (maxX < minX || maxY < minY) return source;

	minX = Math.max(0, minX - padding);
	minY = Math.max(0, minY - padding);
	maxX = Math.min(width - 1, maxX + padding);
	maxY = Math.min(height - 1, maxY + padding);

	const cropW = maxX - minX + 1;
	const cropH = maxY - minY + 1;
	const cropped = document.createElement("canvas");
	cropped.width = cropW;
	cropped.height = cropH;
	const croppedCtx = cropped.getContext("2d");
	if (!croppedCtx) return source;

	croppedCtx.drawImage(source, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
	return cropped;
}

export async function rasterizeTypedSignature(args: {
	text: string;
	fontId: string;
	role: UserSignatureRole;
}): Promise<Uint8Array> {
	const { cssFamily, dimensions, fontSize } = getSignatureFontRasterSpec(
		args.fontId,
		args.role,
	);

	await document.fonts.load(`${fontSize}px ${cssFamily}`);
	await document.fonts.ready;

	const canvas = document.createElement("canvas");
	const pixelRatio = Math.min(
		typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1,
		RASTER_PIXEL_RATIO,
	);
	canvas.width = Math.round(dimensions.width * pixelRatio);
	canvas.height = Math.round(dimensions.height * pixelRatio);

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Canvas is not supported in this browser");
	}

	ctx.scale(pixelRatio, pixelRatio);

	const probe = document.createElement("canvas").getContext("2d");
	if (!probe) {
		throw new Error("Canvas is not supported in this browser");
	}

	const measured = measureCanvasTextBox(
		probe,
		args.text,
		fontSize,
		cssFamily,
	);
	const fittedFontSize = fitSignatureRasterFontSize({
		measuredWidth: measured.width,
		measuredHeight: measured.height,
		preferredFontSize: fontSize,
		boxWidth: dimensions.width,
		boxHeight: dimensions.height,
	});

	ctx.clearRect(0, 0, dimensions.width, dimensions.height);
	ctx.fillStyle = SIGNATURE_RASTER_INK;
	ctx.font = `${fittedFontSize}px ${cssFamily}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(args.text, dimensions.width / 2, dimensions.height * 0.55);

	const trimmed = trimCanvasToInk(canvas);

	const blob = await new Promise<Blob>((resolve, reject) => {
		trimmed.toBlob(
			(value) =>
				value
					? resolve(value)
					: reject(new Error("Failed to export signature PNG")),
			"image/png",
		);
	});

	return new Uint8Array(await blob.arrayBuffer());
}
