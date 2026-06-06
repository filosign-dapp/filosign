import { describe, expect, test } from "bun:test";
import type { FieldCompletionMap } from "@filosign/shared";
import { enrichFieldCompletionMapPreviews } from "@/lib/domains/files/utils/enrich-field-completion-previews";
import { presignObjectPreviewGet } from "@/lib/platform/s3/presign-preview";

describe("presignObjectPreviewGet", () => {
	test("returns null for empty storage key", async () => {
		expect(await presignObjectPreviewGet(null)).toBeNull();
		expect(await presignObjectPreviewGet("")).toBeNull();
	});

	test("returns presigned URL from injectable presigner", async () => {
		const url = await presignObjectPreviewGet(
			"signatures/test.png",
			async (_key, _opts) => "https://example.com/presigned",
		);
		expect(url).toBe("https://example.com/presigned");
	});
});

describe("enrichFieldCompletionMapPreviews", () => {
	test("presigns visual completions missing previewUrl", async () => {
		const map: FieldCompletionMap = {
			field_1: {
				fieldId: "field_1",
				valueKind: "visual",
				sourceArtifactId: "550e8400-e29b-41d4-a716-446655440000",
				storageKey: "signatures/0xabc/sig.png",
				contentSha256: "c".repeat(64),
				textValue: null,
				previewUrl: null,
			},
		};

		const enriched = await enrichFieldCompletionMapPreviews(
			map,
			async (key) => `https://example.com/${key}`,
		);

		expect(enriched.field_1.previewUrl).toBe(
			"https://example.com/signatures/0xabc/sig.png",
		);
	});

	test("skips non-visual and already presigned rows", async () => {
		const map: FieldCompletionMap = {
			field_1: {
				fieldId: "field_1",
				valueKind: "text",
				sourceArtifactId: null,
				storageKey: null,
				contentSha256: null,
				textValue: "hello",
				previewUrl: null,
			},
			field_2: {
				fieldId: "field_2",
				valueKind: "visual",
				sourceArtifactId: null,
				storageKey: "signatures/x.png",
				contentSha256: "d".repeat(64),
				textValue: null,
				previewUrl: "https://example.com/existing",
			},
		};

		const enriched = await enrichFieldCompletionMapPreviews(map, async () => {
			throw new Error("should not presign");
		});

		expect(enriched).toBe(map);
	});
});
