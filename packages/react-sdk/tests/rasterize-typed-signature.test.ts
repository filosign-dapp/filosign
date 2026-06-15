import { describe, expect, test } from "bun:test";
import {
	canvasToPngBytes,
	resolveSignatureRasterPixelRatio,
	trimCanvasToInk,
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

function firstInkRow(canvas: HTMLCanvasElement): number {
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("canvas context missing");
	const { width, height } = canvas;
	const data = ctx.getImageData(0, 0, width, height).data;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const alpha = data[(y * width + x) * 4 + 3] ?? 0;
			if (alpha > 8) return y;
		}
	}
	return -1;
}

function lastInkRow(canvas: HTMLCanvasElement): number {
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("canvas context missing");
	const { width, height } = canvas;
	const data = ctx.getImageData(0, 0, width, height).data;
	for (let y = height - 1; y >= 0; y--) {
		for (let x = 0; x < width; x++) {
			const alpha = data[(y * width + x) * 4 + 3] ?? 0;
			if (alpha > 8) return y;
		}
	}
	return -1;
}

function drawMiddleBaselineText(args: {
	width: number;
	height: number;
	fontSize: number;
	text: string;
}) {
	const source = document.createElement("canvas");
	source.width = args.width;
	source.height = args.height;
	const ctx = source.getContext("2d");
	if (!ctx) throw new Error("canvas context missing");

	ctx.fillStyle = "#111827";
	ctx.font = `${args.fontSize}px cursive`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(args.text, args.width / 2, args.height * 0.55);
	return source;
}

describe("trimCanvasToInk", () => {
	test.skipIf(typeof document === "undefined")(
		"preserves top ink that measureText trim would clip",
		() => {
			const boxWidth = 520;
			const boxHeight = 140;
			const fontSize = 72;
			const text = "Kartik";

			const source = drawMiddleBaselineText({
				width: boxWidth,
				height: boxHeight,
				fontSize,
				text,
			});

			const inkTrimmed = trimCanvasToInk(source, 6);
			const metricsTrimmed = trimCanvasToTextBounds({
				source,
				pixelRatio: 1,
				text,
				fontSize,
				cssFamily: "cursive",
				boxWidth,
				boxHeight,
				padding: 6,
			});

			expect(inkTrimmed.height).toBeGreaterThanOrEqual(metricsTrimmed.height);

			const inkTop = firstInkRow(inkTrimmed);
			const metricsTop = firstInkRow(metricsTrimmed);
			expect(inkTop).toBeGreaterThanOrEqual(0);
			expect(inkTop).toBeLessThanOrEqual(metricsTop + 2);

			const topMargin = inkTop;
			const bottomMargin = inkTrimmed.height - 1 - lastInkRow(inkTrimmed);
			expect(Math.abs(topMargin - bottomMargin)).toBeLessThanOrEqual(8);
		},
	);
});
