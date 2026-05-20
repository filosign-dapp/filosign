/** Canonical width for placement manifest coordinates (add-sign + sign). */
export const PLACEMENT_VIEWPORT_WIDTH = 600;

export function constrainFieldTopLeft(args: {
	x: number;
	y: number;
	docWidth: number;
	docHeight: number;
	fieldWidth: number;
	fieldHeight: number;
	margin?: number;
}): { x: number; y: number } {
	const margin = args.margin ?? 0;
	const maxX = args.docWidth - args.fieldWidth - margin;
	const maxY = args.docHeight - args.fieldHeight - margin;
	return {
		x: Math.max(margin, Math.min(args.x, maxX)),
		y: Math.max(margin, Math.min(args.y, maxY)),
	};
}

/** Normalized rect (0–1) with x+width and y+height clamped inside the page. */
export function placementManifestRect(args: {
	x: number;
	y: number;
	docWidth: number;
	docHeight: number;
	fieldWidth: number;
	fieldHeight: number;
}): { x: number; y: number; width: number; height: number } {
	const dw = Math.max(args.docWidth, 1);
	const dh = Math.max(args.docHeight, 1);
	const width = Math.min(1, Math.max(args.fieldWidth / dw, 0));
	const height = Math.min(1, Math.max(args.fieldHeight / dh, 0));
	let x = Math.max(0, Math.min(args.x / dw, 1));
	let y = Math.max(0, Math.min(args.y / dh, 1));
	x = Math.min(x, 1 - width);
	y = Math.min(y, 1 - height);
	return { x, y, width, height };
}
