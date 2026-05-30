import { describe, expect, test } from "bun:test";
import {
	isImmediateCancellation,
	isScheduledCancellation,
	shouldDowngradeToFree,
} from "@/lib/domains/billing/policy";
import {
	mapDodoSubscriptionStatus,
	resolveWebhookOrgSync,
	resolveWebhookUserPlanId,
} from "@/lib/domains/billing/webhook-sync";

describe("shouldDowngradeToFree", () => {
	test("only expires immediately revokes", () => {
		expect(shouldDowngradeToFree("subscription.expired")).toBe(true);
		expect(shouldDowngradeToFree("subscription.cancelled")).toBe(false);
		expect(shouldDowngradeToFree("subscription.active")).toBe(false);
	});
});

describe("cancellation scheduling helpers", () => {
	test("detects scheduled vs immediate cancellation", () => {
		expect(
			isScheduledCancellation({
				eventType: "subscription.cancelled",
				cancelAtNextBillingDate: true,
			}),
		).toBe(true);
		expect(
			isImmediateCancellation({
				eventType: "subscription.cancelled",
				cancelAtNextBillingDate: false,
			}),
		).toBe(true);
	});
});

describe("mapDodoSubscriptionStatus", () => {
	test("keeps active status for cancel at period end", () => {
		expect(
			mapDodoSubscriptionStatus("cancelled", "subscription.cancelled", true),
		).toBe("active");
	});

	test("maps on_hold to past_due", () => {
		expect(
			mapDodoSubscriptionStatus("on_hold", "subscription.on_hold", false),
		).toBe("past_due");
	});
});

describe("resolveWebhookOrgSync", () => {
	test("keeps org plan and seats on scheduled cancel", () => {
		const result = resolveWebhookOrgSync({
			eventType: "subscription.cancelled",
			mappedPlan: null,
			cancelAtNextBillingDate: true,
			quantity: undefined,
			existingPlanId: "teams",
			existingSeatCount: 5,
		});
		expect(result.planId).toBe("teams");
		expect(result.seatCount).toBe(5);
		expect(result.requireQuantity).toBe(false);
	});

	test("downgrades on expire", () => {
		const result = resolveWebhookOrgSync({
			eventType: "subscription.expired",
			mappedPlan: "teams_pro",
			cancelAtNextBillingDate: false,
			quantity: 8,
			existingPlanId: "teams_pro",
			existingSeatCount: 8,
		});
		expect(result.planId).toBe("free");
		expect(result.seatCount).toBe(1);
	});

	test("requires quantity for active org plan sync", () => {
		const result = resolveWebhookOrgSync({
			eventType: "subscription.plan_changed",
			mappedPlan: "teams_pro",
			cancelAtNextBillingDate: false,
			quantity: 4,
			existingPlanId: "teams",
			existingSeatCount: 4,
		});
		expect(result.planId).toBe("teams_pro");
		expect(result.seatCount).toBe(4);
		expect(result.requireQuantity).toBe(true);
	});

	test("throws when org plan cannot be resolved", () => {
		expect(() =>
			resolveWebhookOrgSync({
				eventType: "subscription.active",
				mappedPlan: null,
				cancelAtNextBillingDate: false,
				quantity: 2,
			}),
		).toThrow();
	});
});

describe("resolveWebhookUserPlanId", () => {
	test("keeps individual on scheduled cancel", () => {
		expect(
			resolveWebhookUserPlanId({
				eventType: "subscription.cancelled",
				mappedPlan: null,
				cancelAtNextBillingDate: true,
				existingPlanId: "individual",
			}),
		).toBe("individual");
	});

	test("downgrades individual on expire", () => {
		expect(
			resolveWebhookUserPlanId({
				eventType: "subscription.expired",
				mappedPlan: "individual",
				cancelAtNextBillingDate: false,
				existingPlanId: "individual",
			}),
		).toBe("free");
	});
});
