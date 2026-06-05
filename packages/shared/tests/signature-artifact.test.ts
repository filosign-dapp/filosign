import { describe, expect, test } from "bun:test";
import {
	contentSha256Hex,
	INITIAL_RECT_ASPECT_RATIO,
	SIGNATURE_RECT_ASPECT_RATIO,
	zFieldCompletion,
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

	test("contentSha256Hex returns 64-char lowercase hex", async () => {
		const bytes = new TextEncoder().encode("hello");
		const hash = await contentSha256Hex(bytes);
		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	test("signature aspect ratio constants remain placement-aligned", () => {
		expect(SIGNATURE_RECT_ASPECT_RATIO).toBeCloseTo(200 / 28, 6);
		expect(INITIAL_RECT_ASPECT_RATIO).toBeCloseTo(80 / 28, 6);
	});
});
