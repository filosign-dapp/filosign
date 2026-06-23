import { describe, expect, test } from "bun:test";
import {
	fitSignatureRasterFontSize,
	resolveSignatureRasterMinFontSize,
} from "../utils/signature-raster-fit";

describe("resolveSignatureRasterMinFontSize", () => {
	test("caps min font at 12 for catalog-height boxes", () => {
		expect(resolveSignatureRasterMinFontSize(140)).toBe(12);
	});

	test("allows font down to 6 for very short boxes", () => {
		expect(resolveSignatureRasterMinFontSize(14)).toBe(6);
	});
});

describe("fitSignatureRasterFontSize", () => {
	test("scales up short initials to fill the raster box", () => {
		const size = fitSignatureRasterFontSize({
			measuredWidth: 40,
			measuredHeight: 26,
			preferredFontSize: 26,
			boxWidth: 200,
			boxHeight: 80,
		});

		expect(size).toBeGreaterThan(26);
		expect(size).toBeLessThanOrEqual(80);
	});

	test("scales down long names that exceed box width", () => {
		const size = fitSignatureRasterFontSize({
			measuredWidth: 480,
			measuredHeight: 44,
			preferredFontSize: 44,
			boxWidth: 520,
			boxHeight: 140,
		});

		expect(size).toBeLessThan(44);
		expect(size).toBeGreaterThanOrEqual(12);
	});

	test("uses dynamic min font floor when scale would go lower", () => {
		const size = fitSignatureRasterFontSize({
			measuredWidth: 800,
			measuredHeight: 80,
			preferredFontSize: 44,
			boxWidth: 100,
			boxHeight: 14,
		});

		expect(size).toBe(6);
	});
});
