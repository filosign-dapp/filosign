import { beforeAll, describe, expect, mock, test } from "bun:test";
import {
	buildUpgradeOfferings,
	resolveMarketingCheckoutPreview,
} from "@/lib/domains/billing/utils/plans";
import {
	isImmediateCancellation,
	isOrgBillingPlanId,
	isScheduledCancellation,
	shouldDowngradeToFree,
} from "@/lib/domains/billing/utils/policy";
import {
	resolveCheckoutFirstBillingInterval,
	resolveCheckoutFirstSeatCount,
} from "@/lib/domains/billing/utils/webhooks";
import {
	mapDodoSubscriptionStatus,
	resolveWebhookOrgSync,
	resolveWebhookUserPlanId,
} from "@/lib/domains/billing/utils/webhooks/sync";
import { attachPendingOrgBillingOnCreateWithTx } from "@/lib/domains/platform-access";

describe("billing", () => {
	describe("plan-transitions", () => {
		describe("buildUpgradeOfferings", () => {
			test("solo workspace blocked from team feature sees teams and teams_pro only", () => {
				const result = buildUpgradeOfferings({
					reason: "features.shared_templates",
					userPlanId: "free",
					orgPlanId: "individual",
					hasUserDodo: false,
					hasOrgDodo: true,
				});
				const visible = result.offerings.map((o) => o.planId);
				expect(visible).toEqual(["teams", "teams_pro"]);
				expect(visible).not.toContain("individual");
			});

			test("free workspace document quota can select solo", () => {
				const result = buildUpgradeOfferings({
					reason: "documents.sent.monthly",
					userPlanId: "free",
					orgPlanId: "free",
					hasUserDodo: false,
					hasOrgDodo: false,
				});
				const solo = result.offerings.find((o) => o.planId === "individual");
				expect(solo?.selectable).toBe(true);
				expect(solo?.checkoutRail).toBe("org");
			});

			test("solo workspace document quota does not offer solo checkout again", () => {
				const result = buildUpgradeOfferings({
					reason: "documents.sent.monthly",
					userPlanId: "free",
					orgPlanId: "individual",
					hasUserDodo: false,
					hasOrgDodo: true,
				});
				const solo = result.offerings.find((o) => o.planId === "individual");
				expect(solo).toBeUndefined();
				expect(result.offerings.some((o) => o.planId === "teams")).toBe(true);
			});
		});

		describe("resolveMarketingCheckoutPreview", () => {
			const clientUrl = "https://app.example.com";
			const astroUrl = "https://astro.example.com";

			test("existing solo requesting solo is already_subscribed", () => {
				const preview = resolveMarketingCheckoutPreview({
					requestedPlanId: "individual",
					subscriber: {
						hasUser: true,
						walletPlanId: "free",
						orgPlanId: "individual",
						hasActiveSolo: true,
						hasActiveOrgPlan: false,
						matchingOrgPlan: "individual",
					},
					clientUrl,
					astroUrl,
				});
				expect(preview.action).toBe("already_subscribed");
				if (preview.action === "already_subscribed") {
					expect(preview.suggestedPlans).toEqual(["teams", "teams_pro"]);
				}
			});

			test("unknown email can send_link", () => {
				const preview = resolveMarketingCheckoutPreview({
					requestedPlanId: "individual",
					subscriber: {
						hasUser: false,
						walletPlanId: "free",
						orgPlanId: null,
						hasActiveSolo: false,
						hasActiveOrgPlan: false,
						matchingOrgPlan: null,
					},
					clientUrl,
					astroUrl,
				});
				expect(preview.action).toBe("send_link");
			});
		});
	});

	describe("dodo-webhooks-checkout-first", () => {
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
			test("ackDodoWebhook module exports checkout-first seat helpers", async () => {
				const mod = await import("@/lib/domains/billing/utils/webhooks");
				expect(typeof mod.ackDodoWebhook).toBe("function");
				expect(typeof mod.resolveCheckoutFirstSeatCount).toBe("function");
				expect(typeof mod.resolveCheckoutFirstBillingInterval).toBe("function");
			});
		});
	});

	describe("webhook-sync", () => {
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
					mapDodoSubscriptionStatus(
						"cancelled",
						"subscription.cancelled",
						true,
					),
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
	});

	describe("dispatchWebhookSubscriptionSync", () => {
		const checkoutFirstEmail = {
			to: "buyer@example.com",
			setupUrl: "https://app.example.com/setup/token",
			planLabel: "Teams",
		};
		const prepareCheckoutFirstPaidAccessInTx = mock(() =>
			Promise.resolve(checkoutFirstEmail),
		);
		const isCheckoutFirstWithoutOrg = mock(() => Promise.resolve(true));
		let dispatchWebhookSubscriptionSync: typeof import("@/lib/domains/billing/utils/webhooks/dispatch").dispatchWebhookSubscriptionSync;

		function createFakeTx() {
			const queryChain = {
				from: () => queryChain,
				where: () => queryChain,
				limit: async () => [] as unknown[],
			};
			return {
				select: () => queryChain,
			};
		}

		beforeAll(async () => {
			mock.module("@/lib/domains/billing/utils/webhooks/checkout", () => ({
				resolveCheckoutFirstSeatCount,
				resolveCheckoutFirstBillingInterval,
				isCheckoutFirstWithoutOrg,
				prepareCheckoutFirstPaidAccessInTx,
			}));
			({ dispatchWebhookSubscriptionSync } = await import(
				"@/lib/domains/billing/utils/webhooks/dispatch"
			));
		});

		test("propagates checkoutFirstEmail when checkout-first handler stops", async () => {
			const result = await dispatchWebhookSubscriptionSync({
				tx: createFakeTx() as never,
				ctx: {
					eventType: "subscription.active",
					payloadData: {
						subscription_id: "sub_test",
						product_id: "pdt_test",
					},
					metadataOrgId: null,
					metadataWallet: null,
					metadataSetupToken: "setup-token",
					metadataCheckoutIntentId: "intent-1",
					metadataPlanId: "teams",
					customerEmail: "buyer@example.com",
					cancelAtNextBillingDate: false,
				},
				entitlementInvalidation: {
					orgIds: new Set(),
					wallets: new Set(),
				},
			});

			expect(result.checkoutFirstEmail).toEqual(checkoutFirstEmail);
			expect(prepareCheckoutFirstPaidAccessInTx).toHaveBeenCalled();
		});
	});
});
