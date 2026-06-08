import { describe, expect, test } from "bun:test";
import {
	canonicalSignablePdfFileName,
	inferSignableDocumentKind,
	isAcceptedSignableDocumentUpload,
	validateSignableDocumentUpload,
} from "../utils/signable-document-upload";

describe("inferSignableDocumentKind", () => {
	test("detects pdf by mime and extension", () => {
		expect(inferSignableDocumentKind("a.pdf", "application/pdf")).toBe("pdf");
		expect(inferSignableDocumentKind("a.PDF", "")).toBe("pdf");
	});

	test("detects images", () => {
		expect(inferSignableDocumentKind("scan.png", "image/png")).toBe("image");
		expect(inferSignableDocumentKind("photo.jpg", "")).toBe("image");
	});

	test("rejects unsupported types", () => {
		expect(inferSignableDocumentKind("sheet.xlsx", "")).toBe("unsupported");
	});
});

describe("validateSignableDocumentUpload", () => {
	test("accepts valid pdf metadata", () => {
		const result = validateSignableDocumentUpload({
			name: "contract.pdf",
			sizeBytes: 1024,
			browserMime: "application/pdf",
		});
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.kind).toBe("pdf");
	});

	test("rejects oversize files", () => {
		const result = validateSignableDocumentUpload({
			name: "big.pdf",
			sizeBytes: 11 * 1024 * 1024,
		});
		expect(result.ok).toBe(false);
	});
});

describe("isAcceptedSignableDocumentUpload", () => {
	test("accepts png by extension", () => {
		expect(isAcceptedSignableDocumentUpload("scan.png", "")).toBe(true);
	});
});

describe("canonicalSignablePdfFileName", () => {
	test("replaces extension with pdf", () => {
		expect(canonicalSignablePdfFileName("folder/scan.PNG")).toBe("scan.pdf");
	});
});
