import { describe, expect, test } from "bun:test";
import { isAllowedReturnUrlOrigin } from "./policy";

describe("isAllowedReturnUrlOrigin", () => {
	test("allows client origin", () => {
		expect(
			isAllowedReturnUrlOrigin({
				returnUrl: "https://app.filosign.xyz/dashboard",
				clientUrl: "https://app.filosign.xyz",
			}),
		).toBe(true);
	});

	test("allows explicit additional origins", () => {
		expect(
			isAllowedReturnUrlOrigin({
				returnUrl: "https://preview.filosign.xyz/dashboard",
				clientUrl: "https://app.filosign.xyz",
				allowedOrigins:
					"https://preview.filosign.xyz, https://staging.filosign.xyz",
			}),
		).toBe(true);
	});

	test("rejects non-allowlisted origin", () => {
		expect(
			isAllowedReturnUrlOrigin({
				returnUrl: "https://evil.tld/return",
				clientUrl: "https://app.filosign.xyz",
			}),
		).toBe(false);
	});
});
