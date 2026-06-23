import type { CSSProperties } from "react";

export const PLACEMENT_CHROME_REFERENCE_HEIGHT = 28;
export const PLACEMENT_CHROME_SCALE_MIN = 0.25;
export const PLACEMENT_CHROME_SCALE_MAX = 1;

export function placementChromeScale(fieldHeightPx: number): number {
	const raw = fieldHeightPx / PLACEMENT_CHROME_REFERENCE_HEIGHT;
	return Math.max(
		PLACEMENT_CHROME_SCALE_MIN,
		Math.min(PLACEMENT_CHROME_SCALE_MAX, raw),
	);
}

export function placementChromeScaleStyle(scale: number): CSSProperties {
	return {
		transform: `scale(${scale})`,
		transformOrigin: "top left",
		width: `${100 / scale}%`,
		height: `${100 / scale}%`,
	};
}
