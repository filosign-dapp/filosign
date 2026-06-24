import { describe, expect, it } from "bun:test";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import {
	normalizedRectToCssPercentStyle,
	normalizedRectToPx,
} from "@/src/lib/domains/files/placement-viewport";
import { signatureFieldToPlacementField } from "@/src/lib/domains/files/signature-field-to-placement";

function sampleSignatureField(
	overrides: Partial<SignatureField> = {},
): SignatureField {
	return {
		id: "field-1",
		type: "text",
		x: 60,
		y: 160,
		width: 180,
		height: 24,
		page: 1,
		documentId: "doc-1",
		assignedSignerWallet: "",
		assignedSignerName: "Alice",
		assignedSignerEmail: "alice@example.com",
		required: true,
		...overrides,
	};
}

describe("signatureFieldToPlacementField", () => {
	const viewport = { docWidth: 600, docHeight: 800, margin: 0 };

	it("maps page and assignee email to placement field shape", () => {
		const field = sampleSignatureField({ page: 2 });

		const placement = signatureFieldToPlacementField(field, viewport);

		expect(placement.pageIndex).toBe(1);
		expect(placement.assignedRecipientEmail).toBe("alice@example.com");
		expect(placement.documentId).toBe("doc-1");
		expect(placement.type).toBe("text");
	});

	it("round-trips px rect through normalized coords for overlay positioning", () => {
		const field = sampleSignatureField();

		const placement = signatureFieldToPlacementField(field, viewport);
		const roundTripPx = normalizedRectToPx(placement.rect, viewport);
		const css = normalizedRectToCssPercentStyle(placement.rect);

		expect(roundTripPx.x).toBeCloseTo(field.x, 5);
		expect(roundTripPx.y).toBeCloseTo(field.y, 5);
		expect(roundTripPx.width).toBeCloseTo(field.width, 5);
		expect(roundTripPx.height).toBeCloseTo(field.height, 5);
		expect(css.left).toBe(`${placement.rect.x * 100}%`);
		expect(css.top).toBe(`${placement.rect.y * 100}%`);
	});
});
