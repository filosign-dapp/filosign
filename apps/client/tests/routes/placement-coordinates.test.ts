import { describe, expect, it } from "bun:test";
import {
	normalizedRectToPx,
	pxRectToNormalized,
	snapPlacementRect,
} from "@/src/lib/domains/files/placement-viewport";
import {
	clampDragTransformToPage,
	dragTransformInPageSpace,
	finalizePlacementRectAfterMove,
	isClientPointInsidePage,
	placementRectAfterDrag,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-coordinates";

describe("placement-coordinates", () => {
	it("placementRectAfterDrag clamps to viewport", () => {
		const result = placementRectAfterDrag(
			{ x: 400, y: 100, width: 148, height: 76 },
			200,
			0,
			null,
			{ docWidth: 600, docHeight: 800 },
		);
		expect(result.x + result.width).toBeLessThanOrEqual(600);
	});

	it("placementRectAfterDrag applies screen delta in page space", () => {
		const result = placementRectAfterDrag(
			{ x: 100, y: 100, width: 148, height: 76 },
			30,
			0,
			null,
			{ docWidth: 600, docHeight: 800 },
		);
		expect(result.x).toBe(130);
	});

	it("placementRectAfterDrag scales delta when page is zoomed", () => {
		const pageEl = {
			offsetWidth: 600,
			getBoundingClientRect: () => ({ width: 1200 }),
		} as HTMLElement;
		const atZoom = placementRectAfterDrag(
			{ x: 100, y: 100, width: 148, height: 76 },
			40,
			0,
			pageEl,
			{ docWidth: 600, docHeight: 800 },
		);
		expect(atZoom.x).toBe(120);
	});

	it("dragTransformInPageSpace divides screen delta by zoom", () => {
		expect(dragTransformInPageSpace({ x: 80, y: 40 }, 2)).toEqual({
			x: 40,
			y: 20,
			scaleX: 1,
			scaleY: 1,
		});
	});

	it("clampDragTransformToPage limits live drag transform", () => {
		const initial = { x: 500, y: 100, width: 148, height: 76 };
		const viewport = { docWidth: 600, docHeight: 800 };
		const clamped = clampDragTransformToPage({
			transform: { x: 200, y: 0 },
			initialRect: initial,
			viewport,
			pageScaleFactor: 1,
		});
		const next = placementRectAfterDrag(
			initial,
			clamped.x,
			clamped.y,
			null,
			viewport,
		);
		expect(next.x + next.width).toBeLessThanOrEqual(600);
	});

	it("isClientPointInsidePage detects pointer within page bounds", () => {
		const pageEl = {
			getBoundingClientRect: () => ({
				left: 100,
				top: 50,
				right: 700,
				bottom: 850,
			}),
		} as HTMLElement;
		expect(isClientPointInsidePage(200, 200, pageEl)).toBe(true);
		expect(isClientPointInsidePage(50, 200, pageEl)).toBe(false);
	});

	it("finalizePlacementRectAfterMove snaps near page margin", () => {
		const initial = { x: 12, y: 100, width: 148, height: 76 };
		const viewport = { docWidth: 600, docHeight: 800 };
		const result = finalizePlacementRectAfterMove({
			initial,
			deltaX: -8,
			deltaY: 0,
			pageEl: null,
			viewport,
			otherFieldsOnPage: [],
		});
		expect(result.x).toBe(0);
	});

	it("normalized rect round-trips across page heights", () => {
		const sourceViewport = { docWidth: 600, docHeight: 800 };
		const px = { x: 60, y: 160, width: 148, height: 76 };
		const normalized = pxRectToNormalized(px, sourceViewport);
		const tallPage = normalizedRectToPx(normalized, {
			docWidth: 600,
			docHeight: 1000,
		});
		expect(tallPage.y).toBe(200);
		expect(tallPage.height).toBe(95);
	});
});

describe("snapPlacementRect", () => {
	it("snaps to another field edge within threshold", () => {
		const viewport = { docWidth: 600, docHeight: 800 };
		const rect = { x: 154, y: 100, width: 148, height: 76 };
		const others = [{ x: 150, y: 100, width: 148, height: 76 }];
		const snapped = snapPlacementRect(rect, viewport, others, {
			threshold: 8,
		});
		expect(snapped.x).toBe(150);
	});
});
