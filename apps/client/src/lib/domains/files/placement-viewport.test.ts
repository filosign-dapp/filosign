import { describe, expect, it } from "bun:test";
import {
	clampRectToViewport,
	constrainFieldTopLeft,
	PLACEMENT_VIEWPORT_WIDTH,
	placementManifestRect,
	placementManifestRectFromField,
	snapPlacementRect,
} from "@/src/lib/domains/files/placement-viewport";

const DESKTOP_BOX = { width: 148, height: 76 };
const DOC_W = PLACEMENT_VIEWPORT_WIDTH;
const DOC_H = 800;

describe("placement-viewport", () => {
	it("clamps right edge so rect stays inside viewport", () => {
		const rect = clampRectToViewport(
			{ x: 500, y: 100, width: DESKTOP_BOX.width, height: DESKTOP_BOX.height },
			{ docWidth: DOC_W, docHeight: DOC_H },
		);
		expect(rect.x + rect.width).toBeLessThanOrEqual(DOC_W);
		expect(rect.x).toBe(DOC_W - DESKTOP_BOX.width);
	});

	it("clamps bottom edge", () => {
		const rect = clampRectToViewport(
			{ x: 0, y: 900, width: DESKTOP_BOX.width, height: DESKTOP_BOX.height },
			{ docWidth: DOC_W, docHeight: DOC_H },
		);
		expect(rect.y + rect.height).toBeLessThanOrEqual(DOC_H);
	});

	it("constrainFieldTopLeft matches clampRect for desktop box", () => {
		const point = constrainFieldTopLeft({
			x: 500,
			y: 100,
			docWidth: DOC_W,
			docHeight: DOC_H,
			fieldWidth: DESKTOP_BOX.width,
			fieldHeight: DESKTOP_BOX.height,
		});
		expect(point.x).toBe(DOC_W - DESKTOP_BOX.width);
	});

	it("placementManifestRect keeps normalized width inside page", () => {
		const norm = placementManifestRect({
			x: 500,
			y: 100,
			docWidth: DOC_W,
			docHeight: DOC_H,
			fieldWidth: DESKTOP_BOX.width,
			fieldHeight: DESKTOP_BOX.height,
		});
		expect(norm.x + norm.width).toBeLessThanOrEqual(1);
		expect(norm.y + norm.height).toBeLessThanOrEqual(1);
	});

	it("placementManifestRectFromField uses per-field dimensions", () => {
		const norm = placementManifestRectFromField({
			x: 50,
			y: 100,
			width: 200,
			height: 28,
			docWidth: DOC_W,
			docHeight: DOC_H,
		});
		expect(norm.width).toBeCloseTo(200 / DOC_W, 5);
		expect(norm.height).toBeCloseTo(28 / DOC_H, 5);
	});

	it("mobile box dimensions clamp at right edge", () => {
		const mobile = { width: 100, height: 60 };
		const rect = clampRectToViewport(
			{ x: 550, y: 0, width: mobile.width, height: mobile.height },
			{ docWidth: 300, docHeight: 400 },
		);
		expect(rect.x + rect.width).toBeLessThanOrEqual(300);
	});

	it("snapPlacementRect snaps left edge to page margin", () => {
		const rect = snapPlacementRect(
			{ x: 5, y: 100, width: 148, height: 76 },
			{ docWidth: 600, docHeight: 800 },
			[],
			{ threshold: 8 },
		);
		expect(rect.x).toBe(0);
	});
});
