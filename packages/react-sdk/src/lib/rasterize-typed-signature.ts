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

/** Crop to measured text ink bounds (avoids full-canvas getImageData scan). */
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

	const centerX = boxWidth / 2;
	const centerY = boxHeight * 0.55;

	const minX = Math.max(0, centerX - textWidth / 2 - padding);
	const minY = Math.max(0, centerY - ascent - padding);
	const maxX = Math.min(boxWidth, centerX + textWidth / 2 + padding);
	const maxY = Math.min(boxHeight, centerY + descent + padding);

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
}): Promise<Uint8Array> {
	const { cssFamily, dimensions, fontSize } = getSignatureFontRasterSpec(
		args.fontId,
		args.role,
	);

	const probe = document.createElement("canvas").getContext("2d");
	if (!probe) {
		throw new Error("Canvas is not supported in this browser");
	}

	const measured = measureCanvasTextBox(probe, args.text, fontSize, cssFamily);
	const fittedFontSize = fitSignatureRasterFontSize({
		measuredWidth: measured.width,
		measuredHeight: measured.height,
		preferredFontSize: fontSize,
		boxWidth: dimensions.width,
		boxHeight: dimensions.height,
	});

	const drawFamily = await loadSignatureDrawFont({
		fontSize: fittedFontSize,
		cssFamily,
	});

	const pixelRatio = resolveSignatureRasterPixelRatio(
		typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1,
	);

	const canvas = document.createElement("canvas");
	canvas.width = Math.round(dimensions.width * pixelRatio);
	canvas.height = Math.round(dimensions.height * pixelRatio);

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Canvas is not supported in this browser");
	}

	ctx.scale(pixelRatio, pixelRatio);
	ctx.clearRect(0, 0, dimensions.width, dimensions.height);
	ctx.fillStyle = SIGNATURE_RASTER_INK;
	ctx.font = `${fittedFontSize}px ${drawFamily}`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(args.text, dimensions.width / 2, dimensions.height * 0.55);

	const trimmed = trimCanvasToTextBounds({
		source: canvas,
		pixelRatio,
		text: args.text,
		fontSize: fittedFontSize,
		cssFamily: drawFamily,
		boxWidth: dimensions.width,
		boxHeight: dimensions.height,
	});

	return await canvasToPngBytes(trimmed);
}
