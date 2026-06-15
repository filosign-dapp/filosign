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
	test("rejects invalid data URLs from empty canvas export", async () => {
		const canvas = {
			toDataURL: () => "not-a-data-url",
		} as unknown as HTMLCanvasElement;

		await expect(canvasToPngBytes(canvas)).rejects.toThrow("Invalid data URL");
	});

	test("decodes base64 PNG data URLs", async () => {
		const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
		const base64 = btoa(String.fromCharCode(...pngBytes));
		const canvas = {
			toDataURL: () => `data:image/png;base64,${base64}`,
		} as unknown as HTMLCanvasElement;

		expect(Array.from(await canvasToPngBytes(canvas))).toEqual(
			Array.from(pngBytes),
		);
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

	test.skipIf(typeof document === "undefined")(
		"preserves bottom ink for middle-baseline text (no vertical clip)",
		() => {
			const boxWidth = 520;
			const boxHeight = 140;
			const fontSize = 72;
			const centerY = boxHeight * 0.55;
			const text = "Kartik";

			const source = document.createElement("canvas");
			source.width = boxWidth;
			source.height = boxHeight;
			const ctx = source.getContext("2d");
			if (!ctx) throw new Error("canvas context missing");

			ctx.fillStyle = "#111827";
			ctx.font = `${fontSize}px cursive`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(text, boxWidth / 2, centerY);

			const trimmed = trimCanvasToTextBounds({
				source,
				pixelRatio: 1,
				text,
				fontSize,
				cssFamily: "cursive",
				boxWidth,
				boxHeight,
				padding: 6,
			});

			const trimmedCtx = trimmed.getContext("2d");
			if (!trimmedCtx) throw new Error("canvas context missing");

			const bottomRow = trimmedCtx.getImageData(
				0,
				trimmed.height - 1,
				trimmed.width,
				1,
			).data;
			const hasBottomInk = Array.from({ length: trimmed.width }, (_, x) => {
				const alpha = bottomRow[x * 4 + 3] ?? 0;
				return alpha > 8;
			}).some(Boolean);

			expect(hasBottomInk).toBe(true);
			expect(trimmed.height).toBeGreaterThan(fontSize * 0.5);
		},
	);
});
