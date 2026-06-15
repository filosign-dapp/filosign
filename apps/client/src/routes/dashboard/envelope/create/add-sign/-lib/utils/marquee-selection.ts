import { PLACEMENT_FIELD_OVERLAY_CLASS } from "@/src/lib/domains/placement/utils/placement-coordinates";

export const MARQUEE_DRAG_THRESHOLD_PX = 4;

export type ClientRect = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export function isMarqueeModifierKey(event: {
	metaKey: boolean;
	ctrlKey: boolean;
}): boolean {
	return event.metaKey || event.ctrlKey;
}

export function normalizeClientRect(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): ClientRect {
	const left = Math.min(x1, x2);
	const top = Math.min(y1, y2);
	return {
		left,
		top,
		width: Math.abs(x2 - x1),
		height: Math.abs(y2 - y1),
	};
}

export function clientRectsIntersect(
	a: ClientRect,
	b: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
): boolean {
	return !(
		a.left + a.width < b.left ||
		b.right < a.left ||
		a.top + a.height < b.top ||
		b.bottom < a.top
	);
}

export function isPlacementFieldOverlayTarget(
	target: EventTarget | null,
): boolean {
	if (!(target instanceof Element)) return false;
	return Boolean(target.closest(`.${PLACEMENT_FIELD_OVERLAY_CLASS}`));
}

export function collectFieldIdsInMarquee(
	marquee: ClientRect,
	root: ParentNode,
): string[] {
	const overlays = root.querySelectorAll<HTMLElement>(
		`.${PLACEMENT_FIELD_OVERLAY_CLASS}[data-field-id]`,
	);
	const ids: string[] = [];
	for (const overlay of overlays) {
		const fieldId = overlay.dataset.fieldId;
		if (!fieldId) continue;
		if (clientRectsIntersect(marquee, overlay.getBoundingClientRect())) {
			ids.push(fieldId);
		}
	}
	return ids;
}
