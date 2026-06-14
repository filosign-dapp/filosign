import { describe, expect, test } from "bun:test";
import {
	DEFAULT_ACCOUNT_FIRST_NAME,
	isPersonalizationComplete,
	isReservedAccountFirstName,
} from "@/src/lib/auth/account-defaults";

describe("account-defaults", () => {
	test("isReservedAccountFirstName matches bootstrap placeholder", () => {
		expect(isReservedAccountFirstName(DEFAULT_ACCOUNT_FIRST_NAME)).toBe(true);
		expect(isReservedAccountFirstName("  Filosign User  ")).toBe(true);
		expect(isReservedAccountFirstName("Jane")).toBe(false);
	});

	test("isPersonalizationComplete rejects reserved placeholder name", () => {
		expect(
			isPersonalizationComplete({ firstName: DEFAULT_ACCOUNT_FIRST_NAME }),
		).toBe(false);
		expect(isPersonalizationComplete({ firstName: "Jane" })).toBe(true);
	});
});
