import { describe, expect, it } from "bun:test";
import {
	clampFieldHeight,
	defaultPlacementFieldRect,
	fieldRectFromWidth,
	normalizeSignatureFieldDimensions,
} from "../../src/lib/domains/files/field-box";
import { placementRectAfterFreeformResize } from "../../src/lib/domains/files/placement-viewport";
import { mergePersistedFieldCompletions } from "../../src/routes/dashboard/document/sign/-lib/utils/field-draft-merge";

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

	it("re-derives signature height from width and aspect ratio", () => {
		const normalized = normalizeSignatureFieldDimensions({
			id: "f1",
			type: "signature",
			page: 1,
			documentId: "doc-1",
			x: 10,
			y: 10,
			width: 200,
			height: 80,
			assignedSignerWallet: "0x0000000000000000000000000000000000000001",
			assignedSignerEmail: "a@example.com",
			assignedSignerName: "A",
			required: true,
		});

		const expected = fieldRectFromWidth("signature", 200).height;
		expect(normalized.height).toBe(expected);
		expect(normalized.height).not.toBe(80);
	});

	it("enforces absolute min height floor for text fields", () => {
		const belowFloor = clampFieldHeight("text", 10);
		expect(belowFloor).toBeGreaterThanOrEqual(28);
		expect(belowFloor).toBeGreaterThan(
			defaultPlacementFieldRect("text").height * 0.5,
		);
	});
});
