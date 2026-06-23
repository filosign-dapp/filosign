import { describe, expect, it } from "bun:test";
import type { FieldCompletion, PlacementField } from "@filosign/shared";
import { deriveOverlayFieldState } from "../../src/lib/domains/files/placement-overlay/overlay-field-state";

function textField(id = "text-1"): PlacementField {
	return {
		id,
		documentId: "doc-1",
		pageIndex: 0,
		rect: { x: 0.1, y: 0.2, width: 0.5, height: 0.02 },
		assignedRecipientEmail: "signer@example.com",
		required: true,
		type: "text",
	};
}

function textCompletion(fieldId: string, value: string): FieldCompletion {
	return {
		fieldId,
		valueKind: "text",
		sourceArtifactId: null,
		storageKey: null,
		contentSha256: null,
		textValue: value,
		previewUrl: null,
	};
}

describe("deriveOverlayFieldState", () => {
	it("routes signed text fields with values to interactive-applied-text", () => {
		const field = textField();
		const completion = textCompletion(field.id, "Foreign taxpayer");

		const { plan } = deriveOverlayFieldState({
			field,
			mode: "interactive",
			completions: { [field.id]: completion },
			alreadySigned: true,
			showPlaceholders: false,
		});

		expect(plan.kind).toBe("interactive-applied-text");
		if (plan.kind === "interactive-applied-text") {
			expect(plan.text).toBe("Foreign taxpayer");
		}
	});

	it("routes unsigned empty text fields to interactive-text", () => {
		const field = textField();

		const { plan } = deriveOverlayFieldState({
			field,
			mode: "interactive",
			completions: {},
			alreadySigned: false,
			showPlaceholders: false,
		});

		expect(plan.kind).toBe("interactive-text");
	});

	it("routes signed empty text fields to interactive-signed-readonly", () => {
		const field = textField();

		const { plan } = deriveOverlayFieldState({
			field,
			mode: "interactive",
			completions: {},
			alreadySigned: true,
			showPlaceholders: false,
		});

		expect(plan.kind).toBe("interactive-signed-readonly");
	});
});
