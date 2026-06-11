/** How much of the raster box width typed ink may occupy. */
export const SIGNATURE_RASTER_WIDTH_FILL = 0.92;

/** How much of the raster box height typed ink may occupy. */
export const SIGNATURE_RASTER_HEIGHT_FILL = 0.78;

export const SIGNATURE_RASTER_MIN_FONT_SIZE = 12;

/**
 * Scale a preferred font size so rendered text fills the raster box without clipping.
 * `measuredWidth` / `measuredHeight` must be from the same `preferredFontSize`.
 */
export function fitSignatureRasterFontSize(args: {
	measuredWidth: number;
	measuredHeight: number;
	preferredFontSize: number;
	boxWidth: number;
	boxHeight: number;
}): number {
	const {
		measuredWidth,
		measuredHeight,
		preferredFontSize,
		boxWidth,
		boxHeight,
	} = args;

	if (
		!Number.isFinite(measuredWidth) ||
		!Number.isFinite(measuredHeight) ||
		measuredWidth <= 0 ||
		measuredHeight <= 0
	) {
		return preferredFontSize;
	}

	const widthScale =
		(boxWidth * SIGNATURE_RASTER_WIDTH_FILL) / measuredWidth;
	const heightScale =
		(boxHeight * SIGNATURE_RASTER_HEIGHT_FILL) / measuredHeight;
	const scale = Math.min(widthScale, heightScale);

	return Math.max(
		SIGNATURE_RASTER_MIN_FONT_SIZE,
		Math.floor(preferredFontSize * scale),
	);
}

export function measureCanvasTextBox(
	ctx: CanvasRenderingContext2D,
	text: string,
	fontSize: number,
	cssFamily: string,
): { width: number; height: number } {
	ctx.font = `${fontSize}px ${cssFamily}`;
	const metrics = ctx.measureText(text);
	const width = metrics.width;
	const ascent = metrics.actualBoundingBoxAscent;
	const descent = metrics.actualBoundingBoxDescent;
	const height =
		Number.isFinite(ascent) && Number.isFinite(descent)
			? ascent + descent
			: fontSize * 0.85;

	return { width, height };
}
