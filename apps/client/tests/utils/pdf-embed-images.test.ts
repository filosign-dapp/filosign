import { describe, expect, it } from "bun:test";
import {
	PDF_EMBED_DPI,
	pdfPointsToEmbedPixels,
} from "../../src/lib/domains/files/compliance-pdf/utils/images";

describe("pdfPointsToEmbedPixels", () => {
	it("targets print density for typical signature field width", () => {
		const px = pdfPointsToEmbedPixels(150, PDF_EMBED_DPI);
		expect(px).toBe(Math.ceil((150 * 300) / 72));
		expect(px).toBeGreaterThanOrEqual(625);
	});
});
