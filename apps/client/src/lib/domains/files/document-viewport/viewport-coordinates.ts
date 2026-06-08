import type { PlacementField } from "@filosign/shared";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import {
	normalizedRectToPx,
	PLACEMENT_PAGE_STRIP_GAP_PX,
	PLACEMENT_VIEWPORT_WIDTH,
} from "@/src/lib/domains/files/placement-viewport";

export type PageTransformState = {
	scale: number;
	positionX: number;
	positionY: number;
};

/** Class used to exclude field overlays from react-zoom-pan-pinch panning. */
export const PLACEMENT_FIELD_OVERLAY_CLASS = "placement-field-overlay" as const;

export function pageScale(pageEl: HTMLElement | null): number {
	if (!pageEl || pageEl.offsetWidth <= 0) return 1;
	const rect = pageEl.getBoundingClientRect();
	return rect.width / pageEl.offsetWidth;
}

export function pageStripOffsetX(
	page: number,
	pageWidth: number,
	gap = PLACEMENT_PAGE_STRIP_GAP_PX,
): number {
	return Math.max(0, page - 1) * (pageWidth + gap);
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

export function focusNormalizedFieldInViewport(args: {
	panPinchRef: ReactZoomPanPinchRef | null;
	wrapperEl: HTMLElement | null;
	field: Pick<PlacementField, "rect" | "pageIndex">;
	getPageHeight: (page: number) => number;
	pageWidth?: number;
	gap?: number;
	animationMs?: number;
}): void {
	const pageWidth = args.pageWidth ?? PLACEMENT_VIEWPORT_WIDTH;
	const page = args.field.pageIndex + 1;
	const px = normalizedRectToPx(args.field.rect, {
		docWidth: pageWidth,
		docHeight: args.getPageHeight(page),
	});
	focusPagePointInStripCanvas({
		panPinchRef: args.panPinchRef,
		wrapperEl: args.wrapperEl,
		page,
		pageX: px.x + px.width / 2,
		pageY: px.y + px.height / 2,
		pageWidth,
		gap: args.gap,
		animationMs: args.animationMs,
	});
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
