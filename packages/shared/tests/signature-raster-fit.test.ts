import { describe, expect, test } from "bun:test";
import { fitSignatureRasterFontSize } from "../utils/signature-raster-fit";

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
});
