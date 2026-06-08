import type { Modifier } from "@dnd-kit/core";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import {
	clampRectToViewport,
	PLACEMENT_PAGE_STRIP_GAP_PX,
	type PlacementRectPx,
	type PlacementViewport,
	snapPlacementRect,
} from "@/src/lib/domains/files/placement-viewport";

export type PageTransformState = {
	scale: number;
	positionX: number;
	positionY: number;
};

export const PLACEMENT_CANVAS_DROPPABLE_ID = "placement-canvas" as const;

/** Class used to exclude field overlays from react-zoom-pan-pinch panning. */
export const PLACEMENT_FIELD_OVERLAY_CLASS = "placement-field-overlay" as const;

export const SELF_ASSIGNEE_ID = "__self__" as const;

export function pageScale(pageEl: HTMLElement | null): number {
	if (!pageEl || pageEl.offsetWidth <= 0) return 1;
	const rect = pageEl.getBoundingClientRect();
	return rect.width / pageEl.offsetWidth;
}

/** Screen scale for drag previews (layout px → canvas px, includes pan/zoom). */
export function resolveDragPageScale(
	pageRefs: Map<number, HTMLDivElement>,
	getPageEl: (page: number) => HTMLDivElement | null,
	page = 1,
): number {
	const pageEl = getPageEl(page) ?? pageRefs.values().next().value ?? null;
	return pageScale(pageEl);
}

/** dnd-kit reports screen-space deltas; overlays live in page-local (unscaled) space. */
export function dragTransformInPageSpace(
	transform: { x: number; y: number; scaleX?: number; scaleY?: number },
	pageScaleFactor: number,
): { x: number; y: number; scaleX: number; scaleY: number } {
	const scale = pageScaleFactor > 0 ? pageScaleFactor : 1;
	return {
		x: transform.x / scale,
		y: transform.y / scale,
		scaleX: transform.scaleX ?? 1,
		scaleY: transform.scaleY ?? 1,
	};
}

export function isClientPointInsidePage(
	clientX: number,
	clientY: number,
	pageEl: HTMLElement | null,
): boolean {
	if (!pageEl) return false;
	const pageRect = pageEl.getBoundingClientRect();
	return (
		clientX >= pageRect.left &&
		clientX <= pageRect.right &&
		clientY >= pageRect.top &&
		clientY <= pageRect.bottom
	);
}

export function clampDragTransformToPage(args: {
	transform: { x: number; y: number; scaleX?: number; scaleY?: number };
	initialRect: PlacementRectPx;
	viewport: PlacementViewport;
	pageScaleFactor: number;
}): { x: number; y: number; scaleX: number; scaleY: number } {
	const { transform, initialRect, viewport, pageScaleFactor } = args;
	const pageDeltaX = transform.x / pageScaleFactor;
	const pageDeltaY = transform.y / pageScaleFactor;
	const clamped = clampRectToViewport(
		{
			...initialRect,
			x: initialRect.x + pageDeltaX,
			y: initialRect.y + pageDeltaY,
		},
		viewport,
	);
	return {
		x: (clamped.x - initialRect.x) * pageScaleFactor,
		y: (clamped.y - initialRect.y) * pageScaleFactor,
		scaleX: transform.scaleX ?? 1,
		scaleY: transform.scaleY ?? 1,
	};
}

export type FieldDragContext = {
	initialRect: PlacementRectPx;
	viewport: PlacementViewport;
	pageEl: HTMLElement | null;
};

export function createRestrictToPageModifier(
	getDragContext: () => FieldDragContext | null,
): Modifier {
	return ({ transform, active }) => {
		if (!active || !String(active.id).startsWith("field:")) {
			return transform;
		}
		const ctx = getDragContext();
		if (!ctx) return transform;
		return clampDragTransformToPage({
			transform,
			initialRect: ctx.initialRect,
			viewport: ctx.viewport,
			pageScaleFactor: pageScale(ctx.pageEl),
		});
	};
}

export function finalizePlacementRectAfterMove(args: {
	initial: PlacementRectPx;
	deltaX: number;
	deltaY: number;
	pageEl: HTMLElement | null;
	viewport: PlacementViewport;
	otherFieldsOnPage: PlacementRectPx[];
	snapThreshold?: number;
}): PlacementRectPx {
	const moved = placementRectAfterDrag(
		args.initial,
		args.deltaX,
		args.deltaY,
		args.pageEl,
		args.viewport,
	);
	return snapPlacementRect(moved, args.viewport, args.otherFieldsOnPage, {
		threshold: args.snapThreshold ?? 8,
	});
}

export function finalizePlacementRectAfterResize(args: {
	initial: PlacementRectPx;
	newWidth: number;
	aspectRatio: number;
	viewport: PlacementViewport;
	otherFieldsOnPage: PlacementRectPx[];
	snapThreshold?: number;
}): PlacementRectPx {
	const resized = placementRectAfterResize(
		args.initial,
		args.newWidth,
		args.aspectRatio,
		args.viewport,
	);
	return snapPlacementRect(resized, args.viewport, args.otherFieldsOnPage, {
		threshold: args.snapThreshold ?? 8,
	});
}

export function pageStripOffsetX(
	page: number,
	pageWidth: number,
	gap = PLACEMENT_PAGE_STRIP_GAP_PX,
): number {
	return Math.max(0, page - 1) * (pageWidth + gap);
}

export function findPageAtClientPoint(
	pageEls: Map<number, HTMLDivElement>,
	clientX: number,
	clientY: number,
): { page: number; el: HTMLDivElement } | null {
	for (const [page, el] of pageEls) {
		if (isClientPointInsidePage(clientX, clientY, el)) {
			return { page, el };
		}
	}
	return null;
}

/** Pan/zoom the strip canvas so a page-local point is centered in the wrapper. */
export function focusPagePointInStripCanvas(args: {
	panPinchRef: ReactZoomPanPinchRef | null;
	wrapperEl: HTMLElement | null;
	page: number;
	pageX: number;
	pageY: number;
	pageWidth: number;
	gap?: number;
	animationMs?: number;
}): void {
	const gap = args.gap ?? PLACEMENT_PAGE_STRIP_GAP_PX;
	focusPagePointInCanvas({
		panPinchRef: args.panPinchRef,
		wrapperEl: args.wrapperEl,
		pageX: pageStripOffsetX(args.page, args.pageWidth, gap) + args.pageX,
		pageY: args.pageY,
		animationMs: args.animationMs,
	});
}

/** Pan/zoom the placement canvas so a page-local point is centered in the wrapper. */
export function focusPagePointInCanvas(args: {
	panPinchRef: ReactZoomPanPinchRef | null;
	wrapperEl: HTMLElement | null;
	pageX: number;
	pageY: number;
	animationMs?: number;
}): void {
	const { panPinchRef, wrapperEl, pageX, pageY, animationMs = 250 } = args;
	if (!panPinchRef || !wrapperEl) return;

	const { scale } = transformStateFromRef(panPinchRef);
	const wrapperWidth = wrapperEl.clientWidth;
	const wrapperHeight = wrapperEl.clientHeight;
	const newPositionX = wrapperWidth / 2 - pageX * scale;
	const newPositionY = wrapperHeight / 2 - pageY * scale;
	panPinchRef.setTransform(newPositionX, newPositionY, scale, animationMs);
}

/**
 * Map screen pointer to page-local coordinates (unscaled PDF layout space).
 */
export function clientPointToPageCoords(
	clientX: number,
	clientY: number,
	pageEl: HTMLElement | null,
	fieldSize: { width: number; height: number },
	options?: { anchor?: "top-left" | "center" },
): { x: number; y: number } | null {
	if (!pageEl) return null;

	const pageRect = pageEl.getBoundingClientRect();
	const scale = pageScale(pageEl);
	const rawX = (clientX - pageRect.left) / scale;
	const rawY = (clientY - pageRect.top) / scale;

	const anchor = options?.anchor ?? "center";
	const x = anchor === "center" ? rawX - fieldSize.width / 2 : rawX;
	const y = anchor === "center" ? rawY - fieldSize.height / 2 : rawY;

	return { x, y };
}

export function clampFieldAtPoint(
	x: number,
	y: number,
	fieldSize: { width: number; height: number },
	viewport: PlacementViewport,
): { x: number; y: number } {
	const clamped = clampRectToViewport(
		{ x, y, width: fieldSize.width, height: fieldSize.height },
		viewport,
	);
	return { x: clamped.x, y: clamped.y };
}

export function placementRectFromField(
	field: { x: number; y: number; width: number; height: number },
	viewport: PlacementViewport,
): PlacementRectPx {
	return clampRectToViewport(
		{
			x: field.x,
			y: field.y,
			width: field.width,
			height: field.height,
		},
		viewport,
	);
}

export function placementRectAfterDrag(
	initial: PlacementRectPx,
	deltaX: number,
	deltaY: number,
	pageEl: HTMLElement | null,
	viewport: PlacementViewport,
): PlacementRectPx {
	const scale = pageEl ? pageScale(pageEl) : 1;
	return clampRectToViewport(
		{
			...initial,
			x: initial.x + deltaX / scale,
			y: initial.y + deltaY / scale,
		},
		viewport,
	);
}

export function placementRectAfterResize(
	initial: PlacementRectPx,
	newWidth: number,
	aspectRatio: number,
	viewport: PlacementViewport,
): PlacementRectPx {
	const height = Math.round(newWidth / aspectRatio);
	return clampRectToViewport(
		{ x: initial.x, y: initial.y, width: newWidth, height },
		viewport,
	);
}

export function transformStateFromRef(
	ref: ReactZoomPanPinchRef | null,
): PageTransformState {
	if (!ref?.state) {
		return { scale: 1, positionX: 0, positionY: 0 };
	}
	return {
		scale: ref.state.scale,
		positionX: ref.state.positionX,
		positionY: ref.state.positionY,
	};
}

export function paletteDraggableId(
	type: string,
	surface: "sidebar" | "mobile" = "sidebar",
): string {
	return `palette:${surface}:${type}`;
}

export function fieldDraggableId(fieldId: string): string {
	return `field:${fieldId}`;
}

export function parsePaletteDraggableId(id: string | number): string | null {
	const raw = String(id);
	if (!raw.startsWith("palette:")) return null;
	const segments = raw.split(":");
	return segments[segments.length - 1] ?? null;
}

export function parseFieldDraggableId(id: string | number): string | null {
	const raw = String(id);
	if (!raw.startsWith("field:")) return null;
	return raw.slice("field:".length);
}

export function dragEndClientPoint(event: {
	activatorEvent: Event | null;
	delta: { x: number; y: number };
}): { clientX: number; clientY: number } | null {
	const activator = event.activatorEvent;
	if (activator instanceof MouseEvent) {
		return {
			clientX: activator.clientX + event.delta.x,
			clientY: activator.clientY + event.delta.y,
		};
	}
	if (activator instanceof TouchEvent) {
		const touch = activator.changedTouches[0] ?? activator.touches[0];
		if (!touch) return null;
		return {
			clientX: touch.clientX + event.delta.x,
			clientY: touch.clientY + event.delta.y,
		};
	}
	if (activator instanceof PointerEvent) {
		return {
			clientX: activator.clientX + event.delta.x,
			clientY: activator.clientY + event.delta.y,
		};
	}
	return null;
}
