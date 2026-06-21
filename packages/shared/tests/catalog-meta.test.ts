import { describe, expect, test } from "bun:test";
import { parseTagsInput, resolveCatalogInstallName } from "@filosign/shared";

describe("resolveCatalogInstallName", () => {
	test("returns trimmed name when version label is omitted", () => {
		expect(
			resolveCatalogInstallName({
				name: "  W-9  ",
				catalogVersionLabel: "irs-2025",
				appendVersionLabel: false,
			}),
		).toBe("W-9");
	});

	test("appends catalog version label when requested", () => {
		expect(
			resolveCatalogInstallName({
				name: "W-9",
				catalogVersionLabel: "irs-2025",
				appendVersionLabel: true,
			}),
		).toBe("W-9 (irs-2025)");
	});

	test("replaces existing version suffix instead of appending", () => {
		expect(
			resolveCatalogInstallName({
				name: "DePIN Day (v1.1)",
				catalogVersionLabel: "v1.2",
				appendVersionLabel: true,
			}),
		).toBe("DePIN Day (v1.2)");
	});

	test("strips stacked version suffixes before appending", () => {
		expect(
			resolveCatalogInstallName({
				name: "DePIN Day (v1.1) (v1.2)",
				catalogVersionLabel: "v1.3",
				appendVersionLabel: true,
			}),
		).toBe("DePIN Day (v1.3)");
	});
});

describe("parseTagsInput", () => {
	test("splits and trims comma-separated tags", () => {
		expect(parseTagsInput(" tax, contract , ")).toEqual(["tax", "contract"]);
	});
});
