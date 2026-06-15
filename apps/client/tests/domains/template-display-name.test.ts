import { describe, expect, test } from "bun:test";
import {
	deriveTemplateDisplayName,
	truncateTemplateHeaderTitle,
} from "@/src/lib/domains/templates/utils/display-name";

describe("deriveTemplateDisplayName", () => {
	test("strips pdf extension", () => {
		expect(deriveTemplateDisplayName("Contract.pdf")).toBe("Contract");
	});

	test("returns fallback for opaque storage names", () => {
		expect(
			deriveTemplateDisplayName(
				"filosign-file-record-bafkzcibesk6rad57ntye2nlbtf-2026-05-21T15-30-5.pdf",
			),
		).toBe("New template");
	});

	test("returns fallback for very long names", () => {
		expect(deriveTemplateDisplayName("a".repeat(80))).toBe("New template");
	});

	test("keeps normal names", () => {
		expect(deriveTemplateDisplayName("DePIN Day")).toBe("DePIN Day");
	});
});

describe("truncateTemplateHeaderTitle", () => {
	test("leaves short names unchanged", () => {
		expect(truncateTemplateHeaderTitle("DePIN Day")).toBe("DePIN Day");
	});

	test("truncates long names", () => {
		expect(
			truncateTemplateHeaderTitle("abcdefghijklmnopqrstuvwxyz0123456789-extra"),
		).toBe("abcdefghijklmnopqrstuvwxyz012345678…");
	});
});
