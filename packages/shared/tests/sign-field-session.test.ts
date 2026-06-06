import { describe, expect, test } from "bun:test";
import type { FieldCompletion, PlacementField } from "@filosign/shared";
import {
	allRequiredFieldsComplete,
	buildVisualCompletionFromArtifact,
	canLazyProvisionRequiredVisualFields,
	canSubmitPlacementSign,
	fieldCompleteForSubmit,
	fieldCompletionStatus,
	parsePlacementManifestForSigner,
	requiredFieldCompletionProgress,
} from "@filosign/shared";

const manifest = {
	version: 1 as const,
	documents: [
		{
			id: "doc-1",
			name: "Test.pdf",
			sha256Plaintext: `0x${"a".repeat(64)}`,
			pageCount: 1,
		},
	],
	fields: [
		{
			id: "sig-1",
			documentId: "doc-1",
			pageIndex: 0,
			rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
			assignedRecipientEmail: "signer@example.com",
			required: true,
			type: "signature" as const,
		},
		{
			id: "txt-1",
			documentId: "doc-1",
			pageIndex: 0,
			rect: { x: 0.1, y: 0.2, width: 0.2, height: 0.05 },
			assignedRecipientEmail: "signer@example.com",
			required: false,
			type: "text" as const,
		},
	],
};

const signatureField = manifest.fields[0];
const textField = manifest.fields[1];
if (!signatureField || !textField) {
	throw new Error("test manifest fields missing");
}

const visualCompletion: FieldCompletion = {
	fieldId: "sig-1",
	valueKind: "visual",
	sourceArtifactId: "550e8400-e29b-41d4-a716-446655440000",
	storageKey: "signatures/0xabc/sig.png",
	contentSha256: "c".repeat(64),
	textValue: null,
	previewUrl: "https://example.com/preview.png",
};

describe("parsePlacementManifestForSigner", () => {
	test("filters fields for signer email", () => {
		const parsed = parsePlacementManifestForSigner(
			manifest,
			"Signer@Example.com",
		);
		expect(parsed.myFields).toHaveLength(2);
		expect(parsed.requiredFields).toHaveLength(1);
		expect(parsed.allFields).toHaveLength(2);
	});

	test("returns empty for invalid manifest", () => {
		expect(
			parsePlacementManifestForSigner(null, "signer@example.com").myFields,
		).toHaveLength(0);
	});
});

describe("fieldCompletionStatus", () => {
	test("display accepts storageKey without previewUrl", () => {
		const completion = { ...visualCompletion, previewUrl: null };
		expect(
			fieldCompletionStatus(signatureField, completion, ["sig-1"], "display"),
		).toBe(true);
	});

	test("submit requires storageKey for visual fields", () => {
		expect(
			fieldCompletionStatus(
				signatureField,
				visualCompletion,
				["sig-1"],
				"submit",
			),
		).toBe(true);
		expect(
			fieldCompletionStatus(
				signatureField,
				{ ...visualCompletion, storageKey: null },
				["sig-1"],
				"submit",
			),
		).toBe(false);
	});

	test("lazyProvision treats required signature as complete before tap", () => {
		expect(
			fieldCompletionStatus(signatureField, undefined, [], "lazyProvision"),
		).toBe(true);
	});

	test("draft requires completedFieldIds membership", () => {
		expect(
			fieldCompletionStatus(signatureField, visualCompletion, [], "draft"),
		).toBe(false);
	});
});

describe("allRequiredFieldsComplete", () => {
	test("returns true when all required fields pass submit mode", () => {
		const completions = { "sig-1": visualCompletion };
		expect(
			allRequiredFieldsComplete(
				manifest.fields as PlacementField[],
				completions,
				["sig-1"],
				"submit",
			),
		).toBe(true);
	});

	test("optional text field does not block submit mode", () => {
		expect(
			allRequiredFieldsComplete(
				[signatureField],
				{ "sig-1": visualCompletion },
				["sig-1"],
				"submit",
			),
		).toBe(true);
		expect(textField.required).toBe(false);
	});
});

describe("buildVisualCompletionFromArtifact", () => {
	test("maps artifact fields onto completion", () => {
		const completion = buildVisualCompletionFromArtifact(signatureField, {
			id: "550e8400-e29b-41d4-a716-446655440000",
			storageKey: "signatures/0xabc/sig.png",
			contentSha256: "c".repeat(64),
			previewUrl: "https://example.com/preview.png",
		});
		expect(completion.fieldId).toBe("sig-1");
		expect(completion.previewUrl).toBe("https://example.com/preview.png");
	});
});

describe("requiredFieldCompletionProgress", () => {
	test("computes percent from draft mode", () => {
		expect(
			requiredFieldCompletionProgress(
				manifest.fields as PlacementField[],
				{ "sig-1": visualCompletion },
				["sig-1"],
			),
		).toEqual({ completed: 1, total: 1, percent: 100 });
	});
});

describe("canLazyProvisionRequiredVisualFields", () => {
	test("detects required visual fields", () => {
		expect(canLazyProvisionRequiredVisualFields(manifest.fields)).toBe(true);
	});
});

describe("canSubmitPlacementSign", () => {
	test("allows submit when required visual can lazy-provision and no leaf yet", () => {
		expect(
			canSubmitPlacementSign({
				canSign: true,
				myPlacementFields: manifest.fields as PlacementField[],
				requiredPlacementFields: [signatureField],
				fieldCompletions: {},
				completedFieldIds: [],
			}),
		).toBe(true);
	});

	test("blocks when canSign is false", () => {
		expect(
			canSubmitPlacementSign({
				canSign: false,
				myPlacementFields: manifest.fields as PlacementField[],
				requiredPlacementFields: [signatureField],
				fieldCompletions: {},
				completedFieldIds: [],
			}),
		).toBe(false);
	});

	test("blocks when my fields empty", () => {
		expect(
			canSubmitPlacementSign({
				canSign: true,
				myPlacementFields: [],
				requiredPlacementFields: [],
				fieldCompletions: {},
				completedFieldIds: [],
			}),
		).toBe(false);
	});

	test("requires leaf completion when no lazy-provision path", () => {
		const textOnlyField = {
			...textField,
			required: true,
		};
		expect(
			canSubmitPlacementSign({
				canSign: true,
				myPlacementFields: [textOnlyField],
				requiredPlacementFields: [textOnlyField],
				fieldCompletions: {},
				completedFieldIds: [],
			}),
		).toBe(false);
		expect(
			canSubmitPlacementSign({
				canSign: true,
				myPlacementFields: [textOnlyField],
				requiredPlacementFields: [textOnlyField],
				fieldCompletions: {
					"txt-1": {
						fieldId: "txt-1",
						valueKind: "text",
						sourceArtifactId: null,
						storageKey: null,
						contentSha256: null,
						textValue: "hello",
						previewUrl: null,
					},
				},
				completedFieldIds: ["txt-1"],
			}),
		).toBe(true);
	});
});

describe("fieldCompleteForSubmit", () => {
	test("requires storage for visual fields", () => {
		expect(
			fieldCompleteForSubmit(signatureField, { "sig-1": visualCompletion }, [
				"sig-1",
			]),
		).toBe(true);
		expect(
			fieldCompleteForSubmit(
				signatureField,
				{
					"sig-1": { ...visualCompletion, storageKey: null },
				},
				["sig-1"],
			),
		).toBe(false);
	});
});
