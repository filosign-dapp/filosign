import type { Modifier } from "@dnd-kit/core";
import {
	focusPagePointInCanvas,
	focusPagePointInStripCanvas,
	isClientPointInsidePage,
	type PageTransformState,
	PLACEMENT_FIELD_OVERLAY_CLASS,
	pageScale,
	pageStripOffsetX,
	transformStateFromRef,
} from "@/src/lib/domains/files/document-viewport/viewport-coordinates";
import {
	clampRectToViewport,
	PLACEMENT_PAGE_STRIP_GAP_PX,
	type PlacementRectPx,
	type PlacementViewport,
	placementRectAfterFreeformResize,
	placementSnapThreshold,
	snapPlacementRect,
} from "@/src/lib/domains/files/placement-viewport";

export type { PageTransformState };
export {
	focusPagePointInCanvas,
	focusPagePointInStripCanvas,
	isClientPointInsidePage,
	PLACEMENT_FIELD_OVERLAY_CLASS,
	pageScale,
	pageStripOffsetX,
	transformStateFromRef,
};

export const PLACEMENT_CANVAS_DROPPABLE_ID = "placement-canvas" as const;

export const SELF_ASSIGNEE_ID = "__self__" as const;

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
	skipSnap: boolean;
};

export function placementRectAfterClampedDrag(args: {
	initial: PlacementRectPx;
	deltaX: number;
	deltaY: number;
	pageEl: HTMLElement | null;
	viewport: PlacementViewport;
}): PlacementRectPx {
	const scale = args.pageEl ? pageScale(args.pageEl) : 1;
	const clamped = clampDragTransformToPage({
		transform: { x: args.deltaX, y: args.deltaY },
		initialRect: args.initial,
		viewport: args.viewport,
		pageScaleFactor: scale,
	});
	return clampRectToViewport(
		{
			...args.initial,
			x: args.initial.x + clamped.x / scale,
			y: args.initial.y + clamped.y / scale,
		},
		args.viewport,
	);
}

export function syncStoredFieldRectIfClamped(args: {
	stored: { x: number; y: number; width: number; height: number };
	viewport: PlacementViewport;
}): Partial<{ x: number; y: number }> | null {
	const clamped = placementRectFromField(args.stored, args.viewport);
	if (clamped.x === args.stored.x && clamped.y === args.stored.y) {
		return null;
	}
	return { x: clamped.x, y: clamped.y };
}

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
	skipSnap?: boolean;
}): PlacementRectPx {
	const moved = placementRectAfterClampedDrag({
		initial: args.initial,
		deltaX: args.deltaX,
		deltaY: args.deltaY,
		pageEl: args.pageEl,
		viewport: args.viewport,
	});
	const threshold = args.skipSnap
		? 0
		: (args.snapThreshold ?? placementSnapThreshold(moved));
	return snapPlacementRect(moved, args.viewport, args.otherFieldsOnPage, {
		threshold,
		initial: args.initial,
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
		threshold: args.snapThreshold ?? placementSnapThreshold(resized),
		initial: args.initial,
	});
}

export { placementRectAfterFreeformResize };

export function finalizePlacementRectAfterFreeformResize(args: {
	initial: PlacementRectPx;
	newWidth: number;
	newHeight: number;
	viewport: PlacementViewport;
	otherFieldsOnPage: PlacementRectPx[];
	snapThreshold?: number;
}): PlacementRectPx {
	const resized = placementRectAfterFreeformResize(
		args.initial,
		args.newWidth,
		args.newHeight,
		args.viewport,
	);
	return snapPlacementRect(resized, args.viewport, args.otherFieldsOnPage, {
		threshold: args.snapThreshold ?? placementSnapThreshold(resized),
		initial: args.initial,
	});
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

export const PLACEMENT_KEYBOARD_NUDGE_STEP_PX = 1;
export const PLACEMENT_KEYBOARD_NUDGE_SHIFT_STEP_PX = 8;

export function placementRectAfterKeyboardNudge(
	initial: PlacementRectPx,
	deltaX: number,
	deltaY: number,
	viewport: PlacementViewport,
): PlacementRectPx {
	return clampRectToViewport(
		{
			...initial,
			x: initial.x + deltaX,
			y: initial.y + deltaY,
		},
		viewport,
	);
}

export type PlacementNudgeField = {
	id: string;
	documentId: string;
	page: number;
	x: number;
	y: number;
	width: number;
	height: number;
};

export function buildPlacementFieldNudgePatches(args: {
	fieldIds: Iterable<string>;
	fields: PlacementNudgeField[];
	currentDocumentId: string;
	deltaX: number;
	deltaY: number;
	viewportForPage: (page: number) => PlacementViewport;
}): Map<string, { x: number; y: number }> {
	const moveIds = new Set(args.fieldIds);
	const patches = new Map<string, { x: number; y: number }>();

	for (const field of args.fields) {
		if (!moveIds.has(field.id)) continue;
		if (field.documentId !== args.currentDocumentId) continue;

		const viewport = args.viewportForPage(field.page);
		const initial = placementRectFromField(field, viewport);
		const next = placementRectAfterKeyboardNudge(
			initial,
			args.deltaX,
			args.deltaY,
			viewport,
		);

		if (next.x !== field.x || next.y !== field.y) {
			patches.set(field.id, { x: next.x, y: next.y });
		}
	}

	return patches;
}

export function placementKeyboardNudgeDelta(
	key: string,
	shiftKey: boolean,
): { deltaX: number; deltaY: number } | null {
	const step = shiftKey
		? PLACEMENT_KEYBOARD_NUDGE_SHIFT_STEP_PX
		: PLACEMENT_KEYBOARD_NUDGE_STEP_PX;

	switch (key) {
		case "ArrowUp":
			return { deltaX: 0, deltaY: -step };
		case "ArrowDown":
			return { deltaX: 0, deltaY: step };
		case "ArrowLeft":
			return { deltaX: -step, deltaY: 0 };
		case "ArrowRight":
			return { deltaX: step, deltaY: 0 };
		default:
			return null;
	}
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

export { PLACEMENT_PAGE_STRIP_GAP_PX };
