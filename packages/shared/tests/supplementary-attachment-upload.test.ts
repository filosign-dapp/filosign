import { describe, expect, test } from "bun:test";
import {
	inferSupplementaryAttachmentMimeType,
	isSafeSupplementaryAttachmentFileName,
	sanitizeSupplementaryAttachmentFileName,
	validateSupplementaryAttachmentFile,
} from "../utils/supplementary-attachment-upload";

describe("sanitizeSupplementaryAttachmentFileName", () => {
	test("strips path segments and control characters", () => {
		expect(sanitizeSupplementaryAttachmentFileName("folder/report.pdf")).toBe(
			"report.pdf",
		);
		expect(sanitizeSupplementaryAttachmentFileName("..\\evil.txt")).toBe(
			"evil.txt",
		);
		expect(sanitizeSupplementaryAttachmentFileName("a\u0001b.pdf")).toBe(
			"ab.pdf",
		);
	});

	test("falls back when empty after sanitize", () => {
		expect(sanitizeSupplementaryAttachmentFileName("   ")).toBe("attachment");
	});
});

describe("inferSupplementaryAttachmentMimeType", () => {
	test("prefers browser mime", () => {
		expect(inferSupplementaryAttachmentMimeType("application/x-custom")).toBe(
			"application/x-custom",
		);
	});

	test("defaults to octet-stream when browser mime is missing", () => {
		expect(inferSupplementaryAttachmentMimeType()).toBe(
			"application/octet-stream",
		);
		expect(inferSupplementaryAttachmentMimeType("")).toBe(
			"application/octet-stream",
		);
	});
});

describe("validateSupplementaryAttachmentFile", () => {
	test("accepts valid file metadata", () => {
		const result = validateSupplementaryAttachmentFile({
			name: "exhibit-a.zip",
			sizeBytes: 1024,
			browserMime: "application/zip",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.sanitizedName).toBe("exhibit-a.zip");
			expect(result.mimeType).toBe("application/zip");
		}
	});

	test("rejects empty files", () => {
		const result = validateSupplementaryAttachmentFile({
			name: "empty.txt",
			sizeBytes: 0,
		});
		expect(result.ok).toBe(false);
	});

	test("rejects oversize files", () => {
		const result = validateSupplementaryAttachmentFile({
			name: "big.bin",
			sizeBytes: 6 * 1024 * 1024,
		});
		expect(result.ok).toBe(false);
	});
});

describe("isSafeSupplementaryAttachmentFileName", () => {
	test("rejects path separators", () => {
		expect(isSafeSupplementaryAttachmentFileName("a/b.pdf")).toBe(false);
	});

	test("accepts sanitized names", () => {
		expect(isSafeSupplementaryAttachmentFileName("report.pdf")).toBe(true);
	});
});
