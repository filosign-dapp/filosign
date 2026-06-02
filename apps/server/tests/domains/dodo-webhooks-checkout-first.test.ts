import { describe, expect, test } from "bun:test";
import { isOrgBillingPlanId } from "@/lib/domains/billing/utils/policy";
import {
	resolveCheckoutFirstBillingInterval,
	resolveCheckoutFirstSeatCount,
} from "@/lib/domains/billing/utils/webhooks";
import { attachPendingOrgBillingOnCreateWithTx } from "@/lib/domains/platform-access";

describe("checkout-first webhook helpers", () => {
	test("prefers metadata seat count over payload quantity", () => {
		expect(
			resolveCheckoutFirstSeatCount({
				metadata: { filosign_seat_count: 5 },
				payloadQuantity: 3,
				intentSeatCount: 2,
			}),
		).toBe(5);
	});

	test("falls back to payload quantity then intent seat count", () => {
		expect(
			resolveCheckoutFirstSeatCount({
				payloadQuantity: 4,
				intentSeatCount: 2,
			}),
		).toBe(4);
		expect(resolveCheckoutFirstSeatCount({ intentSeatCount: 2 })).toBe(2);
		expect(resolveCheckoutFirstSeatCount({})).toBe(1);
	});

	test("resolves billing interval from metadata, intent, then product id", () => {
		expect(
			resolveCheckoutFirstBillingInterval({
				metadata: { filosign_interval: "yearly" },
				productId: "pdt_0NfmPufibqNnTIXEIbszF",
			}),
		).toBe("yearly");
		expect(
			resolveCheckoutFirstBillingInterval({
				intentInterval: "monthly",
				productId: "pdt_0NfmfhPh81Fgklfe8WgQz",
			}),
		).toBe("monthly");
		expect(
			resolveCheckoutFirstBillingInterval({
				productId: "pdt_0NfmfhPh81Fgklfe8WgQz",
			}),
		).toBe("yearly");
	});
});

describe("org billing attach contract", () => {
	test("teams plans route to org billing, not user subscriptions", () => {
		expect(isOrgBillingPlanId("teams")).toBe(true);
		expect(isOrgBillingPlanId("teams_pro")).toBe(true);
		expect(isOrgBillingPlanId("individual")).toBe(false);
	});

	test("attachPendingOrgBillingOnCreateWithTx is exported", () => {
		expect(typeof attachPendingOrgBillingOnCreateWithTx).toBe("function");
	});
});

describe("checkout-first routing contract", () => {
	test("handleDodoWebhook exports checkout-first seat helpers", async () => {
		const mod = await import("@/lib/domains/billing/utils/webhooks");
		expect(typeof mod.handleDodoWebhook).toBe("function");
		expect(typeof mod.resolveCheckoutFirstSeatCount).toBe("function");
		expect(typeof mod.resolveCheckoutFirstBillingInterval).toBe("function");
	});
});
