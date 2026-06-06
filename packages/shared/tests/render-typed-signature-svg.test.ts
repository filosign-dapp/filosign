import { describe, expect, test } from "bun:test";
import {
	renderTypedSignatureSvg,
	resolveDefaultSignatureArtifact,
	typedSignatureArtifactPreviewSrc,
} from "@filosign/shared";

describe("renderTypedSignatureSvg", () => {
	test("escapes font-family quotes for valid XML", () => {
		const svg = renderTypedSignatureSvg({
			text: "Kartikay Tiwari",
			fontId: "dancing-script",
		});

		expect(svg).toContain('font-family="&quot;Dancing Script&quot;, cursive"');
		expect(svg).not.toContain('font-family=""Dancing Script"');
	});

	test("maps legacy font ids when rendering", () => {
		const svg = renderTypedSignatureSvg({
			text: "KT",
			fontId: "homemade-apple",
			width: 200,
			height: 80,
		});

		expect(svg).toContain("Dancing Script");
		expect(svg).toContain('font-size="26"');
	});

	test("typed preview prefers presigned raster URL over SVG fallback", () => {
		const presigned = "https://example.com/signature.png";
		expect(
			typedSignatureArtifactPreviewSrc({
				artifact: {
					kind: "typed",
					role: "signature",
					typedMeta: { text: "Jane Doe", fontId: "caveat" },
					previewUrl: presigned,
				},
			}),
		).toBe(presigned);
	});

	test("typed preview falls back to SVG when presigned URL is missing", () => {
		const src = typedSignatureArtifactPreviewSrc({
			artifact: {
				kind: "typed",
				role: "signature",
				typedMeta: { text: "Jane Doe", fontId: "caveat" },
				previewUrl: null,
			},
		});

		expect(src?.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
	});
});

describe("resolveDefaultSignatureArtifact", () => {
	test("prefers profile default id when present", () => {
		const match = resolveDefaultSignatureArtifact(
			[
				{
					id: "a",
					role: "signature",
					createdAt: "2026-01-02T00:00:00.000Z",
				} as never,
				{
					id: "b",
					role: "signature",
					createdAt: "2026-01-01T00:00:00.000Z",
				} as never,
			],
			"signature",
			"b",
		);
		expect(match?.id).toBe("b");
	});
});
