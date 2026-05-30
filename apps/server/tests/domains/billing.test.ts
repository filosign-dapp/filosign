import { describe, expect, test } from "bun:test";
import {
	isAllowedReturnUrlOrigin,
	isOrgBillingPlanId,
	resolveIntervalFromProductId,
	resolvePlanIdFromProductId,
	shouldDowngradeToFree,
} from "@/lib/domains/billing/policy";
import { assertTimestampWithinTolerance } from "@/lib/domains/billing/webhook-security";

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

describe("dodo webhook plan mapping", () => {
	test("maps known monthly and yearly products", () => {
		expect(resolvePlanIdFromProductId("pdt_0NfmPizJ6Qed3qp9tEeim")).toBe(
			"individual",
		);
		expect(resolvePlanIdFromProductId("pdt_0NfmfWinEiPodeNWGQ3ul")).toBe(
			"individual",
		);
		expect(resolvePlanIdFromProductId("pdt_0NfmPufibqNnTIXEIbszF")).toBe(
			"teams",
		);
		expect(resolvePlanIdFromProductId("pdt_0NfmfhPh81Fgklfe8WgQz")).toBe(
			"teams",
		);
		expect(resolvePlanIdFromProductId("pdt_0NfmQBAAvXDqYiqWSz79B")).toBe(
			"teams_pro",
		);
		expect(resolvePlanIdFromProductId("pdt_0Nfmg1rLmulqhqBBM2KHW")).toBe(
			"teams_pro",
		);

		expect(resolvePlanIdFromProductId("pdt_0NfmyRtNYwE5g8OYgkbL3")).toBe(
			"individual",
		);
		expect(resolvePlanIdFromProductId("pdt_0NfmyWM4nN9jYCspf5Scl")).toBe(
			"individual",
		);
		expect(resolvePlanIdFromProductId("pdt_0NfmymopLpOgIv1IRallv")).toBe(
			"teams",
		);
		expect(resolvePlanIdFromProductId("pdt_0NfmytI1yAAbhFZQEtUgK")).toBe(
			"teams",
		);
		expect(resolvePlanIdFromProductId("pdt_0Nfmz3zlE8nPXI2lthZ9w")).toBe(
			"teams_pro",
		);
		expect(resolvePlanIdFromProductId("pdt_0Nfmz9m978R3nH8g6DL3y")).toBe(
			"teams_pro",
		);
	});

	test("returns null for unknown products", () => {
		expect(resolvePlanIdFromProductId("pdt_unknown")).toBeNull();
		expect(resolvePlanIdFromProductId(undefined)).toBeNull();
	});
});

describe("dodo webhook downgrade rules", () => {
	test("downgrades only on expire events", () => {
		expect(shouldDowngradeToFree("subscription.cancelled")).toBe(false);
		expect(shouldDowngradeToFree("subscription.expired")).toBe(true);
		expect(shouldDowngradeToFree("subscription.active")).toBe(false);
	});
});

describe("dodo product interval mapping", () => {
	test("maps yearly SKUs", () => {
		expect(resolveIntervalFromProductId("pdt_0NfmfWinEiPodeNWGQ3ul")).toBe(
			"yearly",
		);
		expect(resolveIntervalFromProductId("pdt_0NfmPufibqNnTIXEIbszF")).toBe(
			"monthly",
		);
	});

	test("identifies org billing plans", () => {
		expect(isOrgBillingPlanId("teams")).toBe(true);
		expect(isOrgBillingPlanId("teams_pro")).toBe(true);
		expect(isOrgBillingPlanId("individual")).toBe(false);
	});
});

describe("dodo webhook timestamp tolerance", () => {
	test("accepts current timestamp", () => {
		const nowSec = Math.floor(Date.now() / 1000).toString();
		expect(() => assertTimestampWithinTolerance(nowSec)).not.toThrow();
	});

	test("rejects stale timestamp", () => {
		const staleSec = Math.floor(
			(Date.now() - 10 * 60 * 1000) / 1000,
		).toString();
		expect(() => assertTimestampWithinTolerance(staleSec)).toThrow();
	});
});
