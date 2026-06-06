import { describe, expect, test } from "bun:test";
import {
	contentSha256Hex,
	enrichFieldCompletionMap,
	enrichVisualCompletionPreview,
	fieldCompletionFromInput,
	fieldCompletionInputFromStored,
	fieldCompletionMapFromInput,
	INITIAL_RECT_ASPECT_RATIO,
	SIGNATURE_RECT_ASPECT_RATIO,
	zFieldCompletion,
	zFieldCompletionInput,
	zFieldCompletionInputMap,
	zFieldCompletionMap,
	zUserSignatureCreateInput,
} from "@filosign/shared";

describe("signature-artifact", () => {
	test("zUserSignatureCreateInput round-trips typed SVG artifact", () => {
		const input = {
			kind: "typed" as const,
			role: "signature" as const,
			storageKey: "signatures/0xabc/deadbeef.svg",
			contentType: "image/svg+xml",
			contentSha256: "a".repeat(64),
			typedMeta: { text: "Jane Doe", fontId: "caveat" },
		};
		expect(zUserSignatureCreateInput.parse(input)).toEqual(input);
	});

	test("zFieldCompletionMap validates completion records", () => {
		const map = {
			field_1: {
				fieldId: "field_1",
				valueKind: "visual" as const,
				sourceArtifactId: "550e8400-e29b-41d4-a716-446655440000",
				storageKey: "envelope-fields/piece/field_1/abc.svg",
				contentSha256: "b".repeat(64),
				textValue: null,
				previewUrl: "https://example.com/preview",
			},
		};
		expect(zFieldCompletionMap.parse(map)).toEqual(map);
		expect(zFieldCompletion.parse(map.field_1)).toEqual(map.field_1);
	});

	test("field completion input wire shape omits previewUrl", () => {
		const input = {
			fieldId: "field_1",
			valueKind: "visual" as const,
			sourceArtifactId: "550e8400-e29b-41d4-a716-446655440000",
			storageKey: "envelope-fields/piece/field_1/abc.svg",
			contentSha256: "b".repeat(64),
			textValue: null,
		};
		expect(zFieldCompletionInput.parse(input)).toEqual(input);
		const map = { field_1: input };
		expect(zFieldCompletionInputMap.parse(map)).toEqual(map);
		expect(fieldCompletionMapFromInput(map)).toEqual({
			field_1: { ...input, previewUrl: null },
		});
		expect(
			fieldCompletionInputFromStored(fieldCompletionFromInput(input)),
		).toEqual(input);
	});

	test("contentSha256Hex returns 64-char lowercase hex", async () => {
		const bytes = new TextEncoder().encode("hello");
		const hash = await contentSha256Hex(bytes);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	test("signature aspect ratio constants remain placement-aligned", () => {
		expect(SIGNATURE_RECT_ASPECT_RATIO).toBeCloseTo(200 / 28, 6);
		expect(INITIAL_RECT_ASPECT_RATIO).toBeCloseTo(80 / 28, 6);
	});

	test("enrichVisualCompletionPreview prefers presigned artifact preview URL", () => {
		const artifactId = "550e8400-e29b-41d4-a716-446655440000";
		const presigned = "https://example.com/signature.png";
		const signatures = [
			{
				id: artifactId,
				walletAddress: "0xabc",
				kind: "typed" as const,
				role: "signature" as const,
				storageKey: "signatures/0xabc/sig.png",
				contentType: "image/png",
				contentSha256: "c".repeat(64),
				typedMeta: { text: "Jane Doe", fontId: "caveat" },
				intrinsicAspectRatio: 200 / 28,
				previewUrl: presigned,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
		];
		const stored = fieldCompletionFromInput({
			fieldId: "field_1",
			valueKind: "visual",
			sourceArtifactId: artifactId,
			storageKey: "signatures/0xabc/sig.png",
			contentSha256: "c".repeat(64),
			textValue: null,
		});

		const enriched = enrichVisualCompletionPreview(stored, signatures);
		expect(enriched.previewUrl).toBe(presigned);

		const map = enrichFieldCompletionMap({ field_1: stored }, signatures);
		expect(map.field_1?.previewUrl).toBe(presigned);
	});

	test("enrichVisualCompletionPreview falls back to SVG when presigned URL is missing", () => {
		const artifactId = "550e8400-e29b-41d4-a716-446655440000";
		const signatures = [
			{
				id: artifactId,
				walletAddress: "0xabc",
				kind: "typed" as const,
				role: "signature" as const,
				storageKey: "signatures/0xabc/sig.png",
				contentType: "image/png",
				contentSha256: "c".repeat(64),
				typedMeta: { text: "Jane Doe", fontId: "typed" },
				intrinsicAspectRatio: 200 / 28,
				previewUrl: null,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			},
		];
		const stored = fieldCompletionFromInput({
			fieldId: "field_1",
			valueKind: "visual",
			sourceArtifactId: artifactId,
			storageKey: "signatures/0xabc/sig.png",
			contentSha256: "c".repeat(64),
			textValue: null,
		});
		expect(stored.previewUrl).toBeNull();

		const enriched = enrichVisualCompletionPreview(stored, signatures);
		expect(enriched.previewUrl).toMatch(/^data:image\/svg\+xml/);
	});
});
