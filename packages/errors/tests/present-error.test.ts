import { describe, expect, test } from "bun:test";
import { presentError } from "../src/present-error";

describe("presentError", () => {
	test("maps ORPC appCode to catalog", () => {
		const presented = presentError(
			{
				code: "FORBIDDEN",
				message: "View the document first",
				data: { appCode: "SIGNING.VIEW_REQUIRED" },
			},
			{ helpBaseUrl: "https://filosign.com" },
		);
		expect(presented.code).toBe("SIGNING.VIEW_REQUIRED");
		expect(presented.title).toBe("Open the document first");
		expect(presented.supportUrl).toBe(
			"https://filosign.com/help#signing-view-required",
		);
	});

	test("maps network TypeError to GENERIC.NETWORK", () => {
		const presented = presentError(new TypeError("Failed to fetch"));
		expect(presented.code).toBe("GENERIC.NETWORK");
	});

	test("interpolates entitlement params", () => {
		const presented = presentError({
			code: "FORBIDDEN",
			message: "QUOTA_EXCEEDED",
			data: {
				code: "QUOTA_EXCEEDED",
				used: 10,
				limit: 10,
			},
		});
		expect(presented.code).toBe("ENTITLEMENT.QUOTA_EXCEEDED");
		expect(presented.description).toContain("10");
	});

	test("interpolates catalog dedupeKey from params", () => {
		const presented = presentError({
			code: "FORBIDDEN",
			message: "QUOTA_EXCEEDED",
			data: {
				code: "QUOTA_EXCEEDED",
				used: 3,
				limit: 5,
			},
		});
		expect(presented.dedupeKey).toBe("3-5");
	});
});
