/** Canonical width for placement manifest coordinates (add-sign + sign). */
export const PLACEMENT_VIEWPORT_WIDTH = 600;

export type PlacementRectPx = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export type PlacementViewport = {
	docWidth: number;
	docHeight: number;
	margin?: number;
};

export type PlacementRectNormalized = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export function clampRectToViewport(
	rect: PlacementRectPx,
	viewport: PlacementViewport,
): PlacementRectPx {
	const margin = viewport.margin ?? 0;
	const maxX = viewport.docWidth - rect.width - margin;
	const maxY = viewport.docHeight - rect.height - margin;
	return {
		width: rect.width,
		height: rect.height,
		x: Math.max(margin, Math.min(rect.x, maxX)),
		y: Math.max(margin, Math.min(rect.y, maxY)),
	};
}

export function topLeftFromRect(rect: PlacementRectPx): {
	x: number;
	y: number;
} {
	return { x: rect.x, y: rect.y };
}

export function constrainFieldTopLeft(args: {
	x: number;
	y: number;
	docWidth: number;
	docHeight: number;
	fieldWidth: number;
	fieldHeight: number;
	margin?: number;
}): { x: number; y: number } {
	return topLeftFromRect(
		clampRectToViewport(
			{
				x: args.x,
				y: args.y,
				width: args.fieldWidth,
				height: args.fieldHeight,
			},
			{
				docWidth: args.docWidth,
				docHeight: args.docHeight,
				margin: args.margin,
			},
		),
	);
}

export function pxRectToNormalized(
	rect: PlacementRectPx,
	viewport: PlacementViewport,
): PlacementRectNormalized {
	const dw = Math.max(viewport.docWidth, 1);
	const dh = Math.max(viewport.docHeight, 1);
	return {
		x: rect.x / dw,
		y: rect.y / dh,
		width: rect.width / dw,
		height: rect.height / dh,
	};
}

export function normalizedRectToPx(
	rect: PlacementRectNormalized,
	viewport: PlacementViewport,
): PlacementRectPx {
	return {
		x: rect.x * viewport.docWidth,
		y: rect.y * viewport.docHeight,
		width: rect.width * viewport.docWidth,
		height: rect.height * viewport.docHeight,
	};
}

/** Percentage box for overlays on a page-sized container (add-sign px rect round-trip). */
export function normalizedRectToCssPercentStyle(
	rect: PlacementRectNormalized,
): {
	left: string;
	top: string;
	width: string;
	height: string;
} {
	return {
		left: `${rect.x * 100}%`,
		top: `${rect.y * 100}%`,
		width: `${rect.width * 100}%`,
		height: `${rect.height * 100}%`,
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
}): PlacementRectNormalized {
	const clamped = clampRectToViewport(
		{ x: args.x, y: args.y, width: args.fieldWidth, height: args.fieldHeight },
		{ docWidth: args.docWidth, docHeight: args.docHeight },
	);
	return pxRectToNormalized(clamped, {
		docWidth: args.docWidth,
		docHeight: args.docHeight,
	});
}

export function placementManifestRectFromField(args: {
	x: number;
	y: number;
	width: number;
	height: number;
	docWidth: number;
	docHeight: number;
}): PlacementRectNormalized {
	return placementManifestRect({
		x: args.x,
		y: args.y,
		docWidth: args.docWidth,
		docHeight: args.docHeight,
		fieldWidth: args.width,
		fieldHeight: args.height,
	});
}

/** Snap field edges to page margins and other fields on the same page. */
export function snapPlacementRect(
	rect: PlacementRectPx,
	viewport: PlacementViewport,
	otherFields: PlacementRectPx[],
	options?: { threshold?: number },
): PlacementRectPx {
	const threshold = options?.threshold ?? 8;
	const margin = viewport.margin ?? 0;
	let { x, y, width, height } = rect;

	const xSnapTargets = [margin];
	const ySnapTargets = [margin];
	const rightSnapTargets = [viewport.docWidth - margin];
	const bottomSnapTargets = [viewport.docHeight - margin];

	for (const other of otherFields) {
		xSnapTargets.push(other.x, other.x + other.width);
		ySnapTargets.push(other.y, other.y + other.height);
		rightSnapTargets.push(other.x, other.x + other.width);
		bottomSnapTargets.push(other.y, other.y + other.height);
	}

	for (const target of xSnapTargets) {
		if (Math.abs(x - target) <= threshold) x = target;
	}
	for (const target of ySnapTargets) {
		if (Math.abs(y - target) <= threshold) y = target;
	}
	for (const target of rightSnapTargets) {
		if (Math.abs(x + width - target) <= threshold) x = target - width;
	}
	for (const target of bottomSnapTargets) {
		if (Math.abs(y + height - target) <= threshold) y = target - height;
	}

	return clampRectToViewport({ x, y, width, height }, viewport);
}
