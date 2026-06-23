import { describe, expect, it } from "bun:test";
import { shouldAutoOpenAcroformImport } from "../../src/lib/domains/placement/utils/acroform-import-prompt";

describe("shouldAutoOpenAcroformImport", () => {
	it("opens only when the document is empty and acroform fields exist", () => {
		expect(
			shouldAutoOpenAcroformImport({
				detectedCount: 3,
				currentDocumentFieldCount: 0,
				alreadyOfferedThisSession: false,
			}),
		).toBe(true);
	});

	it("does not open when placement fields already exist", () => {
		expect(
			shouldAutoOpenAcroformImport({
				detectedCount: 3,
				currentDocumentFieldCount: 2,
				alreadyOfferedThisSession: false,
			}),
		).toBe(false);
	});

	it("does not open when the prompt was already offered this session", () => {
		expect(
			shouldAutoOpenAcroformImport({
				detectedCount: 3,
				currentDocumentFieldCount: 0,
				alreadyOfferedThisSession: true,
			}),
		).toBe(false);
	});
});
