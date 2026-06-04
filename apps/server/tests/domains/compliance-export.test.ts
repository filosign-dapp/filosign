import { describe, expect, test } from "bun:test";
import {
	assertExportDocumentSha256Matches,
	ExportDocumentSha256MismatchError,
	isComplianceExportAllowed,
} from "@/lib/domains/files/utils/compliance-export";

describe("isComplianceExportAllowed", () => {
	test("allows when fully executed", () => {
		expect(
			isComplianceExportAllowed({
				completedAt: new Date(),
				revokedBeforeCompletedAt: null,
			}),
		).toBe(true);
	});

	test("allows when voided before complete", () => {
		expect(
			isComplianceExportAllowed({
				completedAt: null,
				revokedBeforeCompletedAt: new Date(),
			}),
		).toBe(true);
	});

	test("denies in-flight envelope", () => {
		expect(
			isComplianceExportAllowed({
				completedAt: null,
				revokedBeforeCompletedAt: null,
			}),
		).toBe(false);
	});
});

describe("assertExportDocumentSha256Matches", () => {
	const registered =
		"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

	test("allows omitted client root", () => {
		expect(() =>
			assertExportDocumentSha256Matches({ provided: undefined, registered }),
		).not.toThrow();
	});

	test("allows matching root (case-insensitive)", () => {
		expect(() =>
			assertExportDocumentSha256Matches({
				provided: registered.toUpperCase(),
				registered,
			}),
		).not.toThrow();
	});

	test("rejects mismatch", () => {
		expect(() =>
			assertExportDocumentSha256Matches({
				provided:
					"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
				registered,
			}),
		).toThrow(ExportDocumentSha256MismatchError);
	});
});
