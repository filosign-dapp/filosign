import { describe, expect, test } from "bun:test";
import {
	canvasToPngBytes,
	resolveSignatureRasterPixelRatio,
	trimCanvasToTextBounds,
} from "../src/lib/rasterize-typed-signature";

describe("resolveSignatureRasterPixelRatio", () => {
	test("caps at 4 on non-WebKit runtimes", () => {
		expect(resolveSignatureRasterPixelRatio(3)).toBe(3);
		expect(resolveSignatureRasterPixelRatio(5)).toBe(4);
	});
});

describe("canvasToPngBytes", () => {
	test("rejects invalid data URLs from empty canvas export", () => {
		const canvas = {
			toDataURL: () => "not-a-data-url",
		} as unknown as HTMLCanvasElement;

		expect(() => canvasToPngBytes(canvas)).toThrow(
			"Failed to export signature PNG",
		);
	});

	test("decodes base64 PNG data URLs", () => {
		const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
		const base64 = btoa(String.fromCharCode(...pngBytes));
		const canvas = {
			toDataURL: () => `data:image/png;base64,${base64}`,
		} as unknown as HTMLCanvasElement;

		expect(Array.from(canvasToPngBytes(canvas))).toEqual(Array.from(pngBytes));
	});
});

describe("trimCanvasToTextBounds", () => {
	test.skipIf(typeof document === "undefined")(
		"returns a smaller canvas than the source when text is narrower",
		() => {
			const source = document.createElement("canvas");
			source.width = 400;
			source.height = 120;
			const ctx = source.getContext("2d");
			if (!ctx) throw new Error("canvas context missing");

			ctx.fillStyle = "#111827";
			ctx.font = "48px cursive";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("AB", 200, 66);

			const trimmed = trimCanvasToTextBounds({
				source,
				pixelRatio: 1,
				text: "AB",
				fontSize: 48,
				cssFamily: "cursive",
				boxWidth: 400,
				boxHeight: 120,
			});

			expect(trimmed.width).toBeLessThan(source.width);
			expect(trimmed.height).toBeLessThanOrEqual(source.height);
		},
	);
});
