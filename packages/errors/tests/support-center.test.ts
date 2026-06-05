import { describe, expect, test } from "bun:test";
import {
	listSupportCenterEntries,
	listUserDocumentedErrors,
	SUPPORT_CATEGORIES,
	supportCategoryForCode,
} from "../src/index";

describe("support center", () => {
	test("supportCategoryForCode maps prefixes", () => {
		expect(supportCategoryForCode("SIGNING.VIEW_REQUIRED")).toBe("Signing");
		expect(supportCategoryForCode("ENTITLEMENT.QUOTA_EXCEEDED")).toBe(
			"Billing & plans",
		);
		expect(supportCategoryForCode("CLIENT.CRYPTO.WALLET_NOT_UNLOCKED")).toBe(
			"Wallet & keys",
		);
		expect(supportCategoryForCode("AUTH.SIGN_IN_REQUIRED")).toBe("Account");
		expect(supportCategoryForCode("GENERIC.UNKNOWN")).toBe("General");
	});

	test("listSupportCenterEntries aligns with documented errors", () => {
		const entries = listSupportCenterEntries();
		const documented = listUserDocumentedErrors();
		expect(entries.length).toBe(documented.length);
		for (const row of documented) {
			expect(entries.some((e) => e.supportSlug === row.supportSlug)).toBe(true);
		}
	});

	test("every entry has a known category", () => {
		for (const entry of listSupportCenterEntries()) {
			expect(SUPPORT_CATEGORIES).toContain(entry.category);
			expect(entry.steps.length).toBeGreaterThan(0);
		}
	});
});
