import { describe, expect, it } from "bun:test";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
	sanitizeTextForWinAnsiPdf,
	wrapLines,
} from "@/src/lib/domains/files/compliance-pdf/utils/text";

async function helvetica() {
	const doc = await PDFDocument.create();
	return doc.embedFont(StandardFonts.Helvetica);
}

describe("sanitizeTextForWinAnsiPdf", () => {
	it("replaces narrow no-break space with a regular space", async () => {
		const font = await helvetica();
		const input = `Contract\u202f2024.pdf`;
		const out = sanitizeTextForWinAnsiPdf(input, font, 10);
		expect(out).toBe("Contract 2024.pdf");
		expect(() => font.widthOfTextAtSize(out, 10)).not.toThrow();
	});

	it("normalizes curly apostrophes to ASCII", async () => {
		const font = await helvetica();
		const input = "file\u2019s commitments";
		const out = sanitizeTextForWinAnsiPdf(input, font, 10);
		expect(out).toBe("file's commitments");
		expect(() => font.widthOfTextAtSize(out, 10)).not.toThrow();
	});

	it("replaces unencodable emoji with question marks", async () => {
		const font = await helvetica();
		const input = "Signed \u{1F44D}";
		const out = sanitizeTextForWinAnsiPdf(input, font, 10);
		expect(out).toBe("Signed ?");
		expect(() => font.widthOfTextAtSize(out, 10)).not.toThrow();
	});
});

describe("wrapLines", () => {
	it("does not throw on narrow no-break space in document names", async () => {
		const font = await helvetica();
		expect(() => wrapLines(`Contract\u202f2024`, 200, font, 10)).not.toThrow();
	});

	it("wraps curly apostrophe copy without throwing", async () => {
		const font = await helvetica();
		const lines = wrapLines(
			"Initial registration of the file\u2019s commitments",
			300,
			font,
			10,
		);
		expect(lines.length).toBeGreaterThan(0);
		for (const line of lines) {
			expect(() => font.widthOfTextAtSize(line, 10)).not.toThrow();
		}
	});
});
