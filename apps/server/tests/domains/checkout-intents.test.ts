import { describe, expect, test } from "bun:test";
import { CHECKOUT_PLAN_IDS } from "@/lib/domains/billing/checkout-intents";
import { isOrgBillingPlanId } from "@/lib/domains/billing/utils/policy";
import {
	generatePlatformInviteToken,
	generateSetupToken,
} from "@/lib/domains/platform-access";

describe("checkout-first tokens", () => {
	test("checkout plan ids include individual paid tier", () => {
		expect(CHECKOUT_PLAN_IDS).toContain("individual");
	});

	test("team checkout plans are org billing plans", () => {
		expect(CHECKOUT_PLAN_IDS).toContain("teams");
		expect(CHECKOUT_PLAN_IDS).toContain("teams_pro");
		expect(isOrgBillingPlanId("teams")).toBe(true);
	});

	test("continue and setup tokens are url-safe", () => {
		const continueToken = generatePlatformInviteToken();
		const setupToken = generateSetupToken();
		expect(continueToken).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(setupToken).toMatch(/^[A-Za-z0-9_-]+$/);
	});
});
