import {
	fitSignatureRasterFontSize,
	getSignatureFontRasterSpec,
	measureCanvasTextBox,
	SIGNATURE_RASTER_INK,
	type UserSignatureRole,
} from "@filosign/shared";
import { dataUrlToBytes } from "./upload-user-signature";

/** Physical pixels per logical raster unit (sharp PDF + retina previews). */
const RASTER_PIXEL_RATIO = 4;
const WEBKIT_RASTER_PIXEL_RATIO = 2;
const TRIM_PADDING_PX = 6;
const FONT_LOAD_TIMEOUT_MS = 5000;
const CURSIVE_FALLBACK_FAMILY = "cursive";

export function isWebKitBrowser(): boolean {
	if (typeof navigator === "undefined") return false;
	const ua = navigator.userAgent;
	return (
		/AppleWebKit/i.test(ua) &&
		!/Chrome|Chromium|Edg|OPR|Firefox|FxiOS/i.test(ua)
	);
}

export function resolveSignatureRasterPixelRatio(devicePixelRatio = 1): number {
	const cap = isWebKitBrowser()
		? WEBKIT_RASTER_PIXEL_RATIO
		: RASTER_PIXEL_RATIO;
	return Math.min(devicePixelRatio, cap);
}

function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	message: string,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(message)), ms);
		void promise
			.then((value) => {
				clearTimeout(timer);
				resolve(value);
			})
			.catch((error: unknown) => {
				clearTimeout(timer);
				reject(error);
			});
	});
}

const TRIM_ALPHA_THRESHOLD = 8;

/** Load one font descriptor; on timeout or failure, fall back to generic cursive. */
export async function loadSignatureDrawFont(args: {
	fontSize: number;
	cssFamily: string;
}): Promise<string> {
	const descriptor = `${args.fontSize}px ${args.cssFamily}`;
	try {
		await withTimeout(
			document.fonts.load(descriptor),
			FONT_LOAD_TIMEOUT_MS,
			"Signature font load timed out",
		);
		return args.cssFamily;
	} catch {
		const fallbackDescriptor = `${args.fontSize}px ${CURSIVE_FALLBACK_FAMILY}`;
		try {
			await withTimeout(
				document.fonts.load(fallbackDescriptor),
				FONT_LOAD_TIMEOUT_MS,
				"Signature fallback font load timed out",
			);
		} catch {
			// Best-effort; canvas will use browser default cursive.
		}
		return CURSIVE_FALLBACK_FAMILY;
	}
}

/** Crop to actual alpha ink bounds (measureText underestimates script ascenders). */
export function trimCanvasToInk(
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
	let hasInk = false;

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const alpha = data[(y * width + x) * 4 + 3] ?? 0;
			if (alpha > TRIM_ALPHA_THRESHOLD) {
				hasInk = true;
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y);
			}
		}
	}

	if (!hasInk) return source;

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

/** @deprecated Prefer trimCanvasToInk; measureText bounds clip script font ascenders. */
export function trimCanvasToTextBounds(args: {
	source: HTMLCanvasElement;
	pixelRatio: number;
	text: string;
	fontSize: number;
	cssFamily: string;
	boxWidth: number;
	boxHeight: number;
	padding?: number;
}): HTMLCanvasElement {
	const {
		source,
		pixelRatio,
		text,
		fontSize,
		cssFamily,
		boxWidth,
		boxHeight,
		padding = TRIM_PADDING_PX,
	} = args;

	const probe = document.createElement("canvas").getContext("2d");
	if (!probe) return source;

	probe.font = `${fontSize}px ${cssFamily}`;
	const metrics = probe.measureText(text);
	const textWidth = metrics.width;
	const ascent = Number.isFinite(metrics.actualBoundingBoxAscent)
		? metrics.actualBoundingBoxAscent
		: fontSize * 0.8;
	const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
		? metrics.actualBoundingBoxDescent
		: fontSize * 0.2;
	const textHeight = ascent + descent;

	const centerX = boxWidth / 2;
	const centerY = boxHeight * 0.55;

	const minX = Math.max(0, centerX - textWidth / 2 - padding);
	// fillText uses textBaseline "middle" at centerY, not alphabetic baseline.
	const minY = Math.max(0, centerY - textHeight / 2 - padding);
	const maxX = Math.min(boxWidth, centerX + textWidth / 2 + padding);
	const maxY = Math.min(boxHeight, centerY + textHeight / 2 + padding);

	const cropW = Math.max(1, Math.round((maxX - minX) * pixelRatio));
	const cropH = Math.max(1, Math.round((maxY - minY) * pixelRatio));
	const sx = Math.round(minX * pixelRatio);
	const sy = Math.round(minY * pixelRatio);

	const cropped = document.createElement("canvas");
	cropped.width = cropW;
	cropped.height = cropH;
	const croppedCtx = cropped.getContext("2d");
	if (!croppedCtx) return source;

	croppedCtx.drawImage(source, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
	return cropped;
}

/** Safari-safe PNG export (toBlob callbacks can hang on WebKit). */
export async function canvasToPngBytes(
	canvas: HTMLCanvasElement,
): Promise<Uint8Array> {
	const { bytes } = await dataUrlToBytes(canvas.toDataURL("image/png"));
	return bytes;
}

export async function rasterizeTypedSignature(args: {
	text: string;
	fontId: string;
	role: UserSignatureRole;
	boxWidth?: number;
	boxHeight?: number;
}): Promise<Uint8Array> {
	const { cssFamily, dimensions, fontSize } = getSignatureFontRasterSpec(
		args.fontId,
		args.role,
	);
	const boxWidth = args.boxWidth ?? dimensions.width;
	const boxHeight = args.boxHeight ?? dimensions.height;

	const probe = document.createElement("canvas").getContext("2d");
	if (!probe) {
		throw new Error("Canvas is not supported in this browser");
	}

	const measured = measureCanvasTextBox(probe, args.text, fontSize, cssFamily);
	const fittedFontSize = fitSignatureRasterFontSize({
		measuredWidth: measured.width,
		measuredHeight: measured.height,
		preferredFontSize: fontSize,
		boxWidth,
		boxHeight,
	});

	const drawFamily = await loadSignatureDrawFont({
		fontSize: fittedFontSize,
		cssFamily,
	});

	const pixelRatio = resolveSignatureRasterPixelRatio(
		typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1,
	);

	const canvas = document.createElement("canvas");
	canvas.width = Math.round(boxWidth * pixelRatio);
	canvas.height = Math.round(boxHeight * pixelRatio);

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Canvas is not supported in this browser");
	}

	ctx.scale(pixelRatio, pixelRatio);
	ctx.clearRect(0, 0, boxWidth, boxHeight);
	ctx.fillStyle = SIGNATURE_RASTER_INK;
	ctx.font = `${fittedFontSize}px ${drawFamily}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(args.text, boxWidth / 2, boxHeight * 0.55);

	const trimmed = trimCanvasToInk(canvas);

	return await canvasToPngBytes(trimmed);
}
