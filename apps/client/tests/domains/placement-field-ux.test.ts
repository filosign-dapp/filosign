import { describe, expect, it } from "bun:test";
import {
	clampFieldHeight,
	clampFieldWidth,
	defaultPlacementFieldRect,
	normalizeSignatureFieldDimensions,
	PLACEMENT_FIELD_SCALE_MIN,
} from "../../src/lib/domains/files/field-box";
import {
	PLACEMENT_CHROME_SCALE_MIN,
	placementChromeScale,
} from "../../src/lib/domains/files/placement-chrome-scale";
import {
	COMPACT_FIELD_DISPLAY_MAX_HEIGHT,
	compactFieldFontSize,
	compactVisualPreviewSrc,
	shouldUseCompactFieldDisplay,
} from "../../src/lib/domains/files/placement-field-compact";
import { placementFieldResizeHandleSizePx } from "../../src/lib/domains/files/placement-field-resize-handle";
import {
	clampRectToViewport,
	placementRectAfterFreeformResize,
	placementSnapThreshold,
	snapPlacementRect,
} from "../../src/lib/domains/files/placement-viewport";
import {
	buildPlacementFieldNudgePatches,
	finalizePlacementRectAfterMove,
	placementKeyboardNudgeDelta,
	placementRectAfterClampedDrag,
	placementRectAfterKeyboardNudge,
	syncStoredFieldRectIfClamped,
} from "../../src/lib/domains/placement/utils/placement-coordinates";
import { mergePersistedFieldCompletions } from "../../src/routes/dashboard/document/sign/-lib/utils/field-draft-merge";

function finalizeMoveAtUnitScale(args: {
	initial: { x: number; y: number; width: number; height: number };
	deltaX: number;
	deltaY: number;
	viewport: { docWidth: number; docHeight: number; margin?: number };
	otherFieldsOnPage: {
		x: number;
		y: number;
		width: number;
		height: number;
	}[];
}) {
	const moved = clampRectToViewport(
		{
			...args.initial,
			x: args.initial.x + args.deltaX,
			y: args.initial.y + args.deltaY,
		},
		args.viewport,
	);
	return snapPlacementRect(moved, args.viewport, args.otherFieldsOnPage, {
		threshold: placementSnapThreshold(moved),
		initial: args.initial,
	});
}

describe("mergePersistedFieldCompletions", () => {
	it("keeps local completions for protected field ids", () => {
		const local = {
			text1: {
				fieldId: "text1",
				valueKind: "text" as const,
				textValue: "typing in progress",
			},
			text2: {
				fieldId: "text2",
				valueKind: "text" as const,
				textValue: "saved locally",
			},
		};
		const server = {
			text1: {
				fieldId: "text1",
				valueKind: "text" as const,
				textValue: "stale from server",
			},
			text2: {
				fieldId: "text2",
				valueKind: "text" as const,
				textValue: "server copy",
			},
		};

		const merged = mergePersistedFieldCompletions(local, server, ["text1"]);

		expect(merged.text1?.textValue).toBe("typing in progress");
		expect(merged.text2?.textValue).toBe("server copy");
	});
});

describe("placementRectAfterFreeformResize", () => {
	const viewport = { docWidth: 800, docHeight: 1100, margin: 24 };

	it("clamps oversized rects to the viewport", () => {
		const result = placementRectAfterFreeformResize(
			{ x: 700, y: 1000, width: 400, height: 300 },
			400,
			300,
			viewport,
		);

		expect(result.width).toBeLessThanOrEqual(800 - 24 * 2);
		expect(result.height).toBeLessThanOrEqual(1100 - 24 * 2);
		expect(result.x).toBeGreaterThanOrEqual(24);
		expect(result.y).toBeGreaterThanOrEqual(24);
	});
});

describe("placementSnapThreshold", () => {
	it("returns a smaller threshold for tiny fields", () => {
		expect(placementSnapThreshold({ x: 0, y: 0, width: 120, height: 8 })).toBe(
			3.2,
		);
	});

	it("keeps the base threshold for standard-height fields", () => {
		expect(placementSnapThreshold({ x: 0, y: 0, width: 200, height: 28 })).toBe(
			8,
		);
	});
});

describe("snapPlacementRect", () => {
	const viewport = { docWidth: 800, docHeight: 1100, margin: 24 };

	it("does not snap tiny fields back to the margin after a small nudge away", () => {
		const initial = { x: 100, y: 24, width: 120, height: 8 };
		const moved = { x: 100, y: 28, width: 120, height: 8 };

		const snapped = snapPlacementRect(moved, viewport, [], { initial });

		expect(snapped.y).toBe(28);
	});

	it("still snaps tiny fields toward a neighbor guide when moving closer", () => {
		const initial = { x: 100, y: 210, width: 120, height: 8 };
		const moved = { x: 100, y: 203, width: 120, height: 8 };
		const neighbor = { x: 300, y: 200, width: 120, height: 8 };

		const snapped = snapPlacementRect(moved, viewport, [neighbor], { initial });

		expect(snapped.y).toBe(200);
	});

	it("does not snap aligned tiny fields back when nudging along the same guide", () => {
		const initial = { x: 100, y: 200, width: 120, height: 8 };
		const moved = { x: 100, y: 204, width: 120, height: 8 };
		const neighbor = { x: 300, y: 200, width: 120, height: 8 };

		const snapped = snapPlacementRect(moved, viewport, [neighbor], { initial });

		expect(snapped.y).toBe(204);
	});

	it("still assists standard fields when approaching the margin", () => {
		const initial = { x: 100, y: 30, width: 200, height: 28 };
		const moved = { x: 100, y: 26, width: 200, height: 28 };

		const snapped = snapPlacementRect(moved, viewport, [], { initial });

		expect(snapped.y).toBe(24);
	});
});

describe("finalizePlacementRectAfterMove", () => {
	const viewport = { docWidth: 800, docHeight: 1100, margin: 24 };

	it("preserves tiny-field nudges through the move pipeline", () => {
		const initial = { x: 100, y: 24, width: 120, height: 8 };

		const next = finalizeMoveAtUnitScale({
			initial,
			deltaX: 0,
			deltaY: 4,
			viewport,
			otherFieldsOnPage: [],
		});

		expect(next.y).toBe(28);
	});

	it("snaps tiny fields toward a neighbor guide when dragged closer", () => {
		const initial = { x: 100, y: 210, width: 120, height: 8 };
		const neighbor = { x: 300, y: 200, width: 120, height: 8 };

		const next = finalizeMoveAtUnitScale({
			initial,
			deltaX: 0,
			deltaY: -7,
			viewport,
			otherFieldsOnPage: [neighbor],
		});

		expect(next.y).toBe(200);
	});

	it("commits clamped drag position at non-unit scale", () => {
		const initial = { x: 100, y: 100, width: 120, height: 28 };
		const pageEl = {
			offsetWidth: 600,
			getBoundingClientRect: () => ({ width: 1200 }),
		} as HTMLElement;

		const next = finalizePlacementRectAfterMove({
			initial,
			deltaX: 200,
			deltaY: 0,
			pageEl,
			viewport,
			otherFieldsOnPage: [],
		});

		expect(next.x).toBe(200);
	});

	it("skips snap when skipSnap is true", () => {
		const initial = { x: 100, y: 30, width: 200, height: 28 };

		const next = finalizePlacementRectAfterMove({
			initial,
			deltaX: 0,
			deltaY: -4,
			pageEl: null,
			viewport,
			otherFieldsOnPage: [],
			skipSnap: true,
		});

		expect(next.y).toBe(26);
	});
});

describe("placementRectAfterClampedDrag", () => {
	const viewport = { docWidth: 800, docHeight: 1100, margin: 24 };

	it("clamps movement that would leave the page bounds", () => {
		const initial = { x: 700, y: 100, width: 120, height: 28 };
		const pageEl = {
			offsetWidth: 600,
			getBoundingClientRect: () => ({ width: 600 }),
		} as HTMLElement;

		const next = placementRectAfterClampedDrag({
			initial,
			deltaX: 500,
			deltaY: 0,
			pageEl,
			viewport,
		});

		expect(next.x).toBeLessThanOrEqual(800 - 24 - 120);
	});
});

describe("syncStoredFieldRectIfClamped", () => {
	const viewport = { docWidth: 800, docHeight: 1100, margin: 24 };

	it("returns null when stored coords match clamped display", () => {
		expect(
			syncStoredFieldRectIfClamped({
				stored: { x: 100, y: 100, width: 120, height: 28 },
				viewport,
			}),
		).toBeNull();
	});

	it("returns synced x/y when stored coords exceed viewport", () => {
		const patch = syncStoredFieldRectIfClamped({
			stored: { x: 900, y: 1200, width: 120, height: 28 },
			viewport,
		});

		expect(patch).not.toBeNull();
		expect(patch?.x).toBeLessThan(900);
		expect(patch?.y).toBeLessThan(1200);
	});
});

describe("placementChromeScale", () => {
	it("returns 1 at reference height", () => {
		expect(placementChromeScale(28)).toBe(1);
	});

	it("scales proportionally at half reference height", () => {
		expect(placementChromeScale(14)).toBe(0.5);
	});

	it("floors at minimum scale for very short fields", () => {
		expect(placementChromeScale(6)).toBe(PLACEMENT_CHROME_SCALE_MIN);
	});
});

describe("normalizeSignatureFieldDimensions", () => {
	it("preserves stored height instead of deriving from aspect ratio", () => {
		const normalized = normalizeSignatureFieldDimensions({
			id: "f1",
			type: "text",
			page: 1,
			documentId: "doc-1",
			x: 10,
			y: 10,
			width: 200,
			height: 48,
			assignedSignerWallet: "0x0000000000000000000000000000000000000001",
			assignedSignerEmail: "a@example.com",
			assignedSignerName: "A",
			required: true,
		});

		expect(normalized.height).toBe(48);
	});

	it("preserves custom signature height for freeform resize", () => {
		const normalized = normalizeSignatureFieldDimensions({
			id: "f1",
			type: "signature",
			page: 1,
			documentId: "doc-1",
			x: 10,
			y: 10,
			width: 200,
			height: 12,
			assignedSignerWallet: "0x0000000000000000000000000000000000000001",
			assignedSignerEmail: "a@example.com",
			assignedSignerName: "A",
			required: true,
		});

		expect(normalized.height).toBe(12);
	});

	it("clamps custom height to scale bounds", () => {
		const normalized = normalizeSignatureFieldDimensions({
			id: "f1",
			type: "text",
			page: 1,
			documentId: "doc-1",
			x: 10,
			y: 10,
			width: 200,
			height: 200,
			assignedSignerWallet: "0x0000000000000000000000000000000000000001",
			assignedSignerEmail: "a@example.com",
			assignedSignerName: "A",
			required: true,
		});

		expect(normalized.height).toBe(clampFieldHeight("text", 200));
		expect(normalized.height).toBeLessThan(200);
	});

	it("clamps width at minimum scale", () => {
		const minWidth = Math.round(
			defaultPlacementFieldRect("text").width * PLACEMENT_FIELD_SCALE_MIN,
		);
		expect(clampFieldWidth("text", 10)).toBe(minWidth);
	});

	it("enforces absolute min height floor for text fields", () => {
		const belowFloor = clampFieldHeight("text", 4);
		expect(belowFloor).toBe(8);
		expect(belowFloor).toBeLessThan(
			defaultPlacementFieldRect("text").height * 0.5,
		);
	});
});

describe("compact field display", () => {
	it("uses compact display below chrome reference threshold", () => {
		expect(shouldUseCompactFieldDisplay(undefined)).toBe(false);
		expect(shouldUseCompactFieldDisplay(28)).toBe(false);
		expect(shouldUseCompactFieldDisplay(COMPACT_FIELD_DISPLAY_MAX_HEIGHT)).toBe(
			false,
		);
		expect(shouldUseCompactFieldDisplay(20)).toBe(true);
		expect(shouldUseCompactFieldDisplay(8)).toBe(true);
	});

	it("clamps compact text font size for tiny and normal fields", () => {
		expect(compactFieldFontSize(8)).toBeCloseTo(6, 5);
		expect(compactFieldFontSize(28)).toBeCloseTo(14, 5);
		expect(compactFieldFontSize(100)).toBe(14);
	});

	it("prefers SVG preview for typed signatures in compact mode", () => {
		const src = compactVisualPreviewSrc({
			completion: {
				fieldId: "f1",
				valueKind: "visual",
				sourceArtifactId: "art-1",
				storageKey: null,
				contentSha256: null,
				textValue: null,
				previewUrl: "data:image/png;base64,abc",
			},
			artifact: {
				kind: "typed",
				role: "signature",
				previewUrl: "data:image/png;base64,abc",
				typedMeta: { text: "Jane Doe", fontId: "dancing-script" },
			},
		});

		expect(src?.startsWith("data:image/svg+xml")).toBe(true);
	});

	it("compact helpers are for content sizing only, not empty chrome", () => {
		expect(shouldUseCompactFieldDisplay(8)).toBe(true);
		expect(shouldUseCompactFieldDisplay(undefined)).toBe(false);
	});
});

describe("placementFieldResizeHandleSizePx", () => {
	it("scales down for small checkbox-sized fields", () => {
		expect(placementFieldResizeHandleSizePx(24)).toBe(5);
		expect(placementFieldResizeHandleSizePx(12)).toBe(3);
	});

	it("caps handle size for large fields", () => {
		expect(placementFieldResizeHandleSizePx(80)).toBe(8);
	});
});

describe("placement keyboard nudge", () => {
	const viewport = { docWidth: 800, docHeight: 1100, margin: 24 };

	it("maps arrow keys to 1px deltas and shift to 8px", () => {
		expect(placementKeyboardNudgeDelta("ArrowUp", false)).toEqual({
			deltaX: 0,
			deltaY: -1,
		});
		expect(placementKeyboardNudgeDelta("ArrowDown", true)).toEqual({
			deltaX: 0,
			deltaY: 8,
		});
		expect(placementKeyboardNudgeDelta("ArrowLeft", false)).toEqual({
			deltaX: -1,
			deltaY: 0,
		});
		expect(placementKeyboardNudgeDelta("Enter", false)).toBeNull();
	});

	it("clamps keyboard nudges inside the page margin", () => {
		const initial = { x: 24, y: 24, width: 120, height: 28 };
		const next = placementRectAfterKeyboardNudge(initial, 0, -1, viewport);
		expect(next.y).toBe(24);
	});

	it("moves selected fields on the current document only", () => {
		const patches = buildPlacementFieldNudgePatches({
			fieldIds: new Set(["a", "b"]),
			fields: [
				{
					id: "a",
					documentId: "doc-1",
					page: 1,
					x: 100,
					y: 200,
					width: 120,
					height: 28,
				},
				{
					id: "b",
					documentId: "doc-2",
					page: 1,
					x: 100,
					y: 200,
					width: 120,
					height: 28,
				},
			],
			currentDocumentId: "doc-1",
			deltaX: 0,
			deltaY: 2,
			viewportForPage: () => viewport,
		});

		expect(patches.size).toBe(1);
		expect(patches.get("a")).toEqual({ x: 100, y: 202 });
	});
});
