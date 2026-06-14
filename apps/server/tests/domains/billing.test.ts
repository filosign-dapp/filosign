import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";
import { resolveDodoLiveMode } from "@/lib/domains/billing/utils/mode";
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
} from "@/lib/domains/billing/utils/webhooks/sync";
import { dbQueryResult } from "../support/db-query-result";

describe("billing", () => {
	describe("plan-transitions", () => {
		describe("buildUpgradeOfferings", () => {
			test("solo workspace blocked from team feature sees teams and teams_pro only", () => {
				const result = buildUpgradeOfferings({
					reason: "features.shared_templates",
					orgPlanId: "individual",
					hasOrgDodo: true,
				});
				const visible = result.offerings.map((o) => o.planId);
				expect(visible).toEqual(["teams", "teams_pro"]);
				expect(visible).not.toContain("individual");
			});

			test("free workspace document quota can select solo", () => {
				const result = buildUpgradeOfferings({
					reason: "documents.sent.monthly",
					orgPlanId: "free",
					hasOrgDodo: false,
				});
				const solo = result.offerings.find((o) => o.planId === "individual");
				expect(solo?.selectable).toBe(true);
				expect(solo?.checkoutRail).toBe("org");
			});

			test("solo workspace document quota does not offer solo checkout again", () => {
				const result = buildUpgradeOfferings({
					reason: "documents.sent.monthly",
					orgPlanId: "individual",
					hasOrgDodo: true,
				});
				const solo = result.offerings.find((o) => o.planId === "individual");
				expect(solo).toBeUndefined();
				expect(result.offerings.some((o) => o.planId === "teams")).toBe(true);
			});

			test("solo workspace team collaboration offers teams and teams_pro only", () => {
				const result = buildUpgradeOfferings({
					reason: "features.team_collaboration",
					orgPlanId: "individual",
					hasOrgDodo: true,
				});
				expect(result.offerings.map((o) => o.planId)).toEqual([
					"teams",
					"teams_pro",
				]);
			});

			test("teams workspace signer replacement offers teams_pro only", () => {
				const result = buildUpgradeOfferings({
					reason: "features.signer_replacement",
					orgPlanId: "teams",
					hasOrgDodo: true,
				});
				expect(result.offerings.map((o) => o.planId)).toEqual(["teams_pro"]);
			});

			test("free workspace gated files can upgrade to solo", () => {
				const result = buildUpgradeOfferings({
					reason: "features.supplementary_attachments",
					orgPlanId: "free",
					hasOrgDodo: false,
				});
				const solo = result.offerings.find((o) => o.planId === "individual");
				expect(solo?.selectable).toBe(true);
			});

			test("solo workspace recipient select offers teams and teams_pro only", () => {
				const result = buildUpgradeOfferings({
					reason: "features.supplementary_attachments.recipient_select",
					orgPlanId: "individual",
					hasOrgDodo: true,
				});
				expect(result.offerings.map((o) => o.planId)).toEqual([
					"teams",
					"teams_pro",
				]);
			});

			test("solo workspace on gated files has handoff-specific no-upgrade message", () => {
				const result = buildUpgradeOfferings({
					reason: "features.supplementary_attachments",
					orgPlanId: "individual",
					hasOrgDodo: true,
				});
				expect(result.offerings).toHaveLength(0);
				expect(result.noUpgradeMessage).toContain(
					"Solo, which includes this feature",
				);
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
		});
	});

	describe("resolveDodoLiveMode", () => {
		test("production defaults to live when DODO_LIVE unset", () => {
			expect(resolveDodoLiveMode({ deployment: "production" })).toBe(true);
		});

		test("DODO_LIVE=false forces test on production", () => {
			expect(
				resolveDodoLiveMode({
					deployment: "production",
					dodoLiveEnv: "false",
				}),
			).toBe(false);
		});

		test("staging stays test when DODO_LIVE unset", () => {
			expect(resolveDodoLiveMode({ deployment: "staging" })).toBe(false);
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
	});

	describe("org-billing-seats", () => {
		const orgId = "00000000-0000-7000-8000-000000000001";
		const subscriptionId = "sub_test_123";

		const orgSubRow = {
			organizationId: orgId,
			planId: "teams_pro" as const,
			seatCount: 3,
			status: "active" as const,
			billingInterval: "yearly" as const,
			dodoSubscriptionId: subscriptionId,
			dodoCustomerId: "cus_test",
			cancelAtPeriodEnd: false,
			periodEnd: null,
			featureOverrides: {},
		};

		const changePlanMock = mock(async () => {});
		const retrieveMock = mock(async () => ({ quantity: 2 }));
		const previewChangePlanMock = mock(async () => ({
			immediate_charge: {
				effective_at: "2026-06-01T12:00:00.000Z",
				summary: { total_amount: 100, currency: "USD" },
			},
			new_plan: { quantity: 3 },
		}));

		const dbUpdates: unknown[] = [];
		let selectQueue: unknown[][] = [];

		beforeAll(() => {
			mock.module("@/lib/domains/billing/utils/policy", () => {
				return {
					requireDodoApiKey: () => "test-key",
					createDodoClient: () => ({
						subscriptions: {
							retrieve: retrieveMock,
							changePlan: changePlanMock,
							previewChangePlan: previewChangePlanMock,
						},
					}),
					isWorkspaceBillingPlanId: (planId: string) => {
						return (
							planId === "individual" ||
							planId === "teams" ||
							planId === "teams_pro"
						);
					},
					isOrgBillingPlanId: (planId: string) => {
						return planId === "teams" || planId === "teams_pro";
					},
					isDodoLiveMode: () => false,
					isAllowedReturnUrlOrigin: () => true,
				};
			});

			mock.module("@/lib/platform/db", () => ({
				default: {
					schema: {
						fileColdInvites: {},
						organizationInvites: {},
						userInvites: {},
						organizationMembers: {},
						organizationSubscriptions: {},
					},
					select: () => ({
						from: () => ({
							where: () => {
								const rows = selectQueue.shift() ?? [];
								return dbQueryResult(rows);
							},
						}),
					}),
					update: () => ({
						set: (values: unknown) => ({
							where: async () => {
								dbUpdates.push(values);
							},
						}),
					}),
				},
			}));
		});

		afterAll(() => {
			mock.restore();
		});

		function queueOrgBillingSelects() {
			selectQueue = [[orgSubRow], [{ count: 1 }], [{ count: 1 }]];
		}

		describe("org seat changes", () => {
			beforeEach(() => {
				changePlanMock.mockClear();
				retrieveMock.mockClear();
				previewChangePlanMock.mockClear();
				dbUpdates.length = 0;
				selectQueue = [];
				orgSubRow.seatCount = 3;
				retrieveMock.mockImplementation(async () => ({ quantity: 2 }));
			});

			test("preview rejects target equal to live Dodo quantity", async () => {
				queueOrgBillingSelects();
				const { previewOrgSeatChange } = await import(
					"@/lib/domains/billing/utils/org"
				);

				await expect(
					previewOrgSeatChange({ organizationId: orgId, seatCount: 2 }),
				).rejects.toMatchObject({
					code: "BAD_REQUEST",
					message: "Seat count already on target",
				});
				expect(previewChangePlanMock).not.toHaveBeenCalled();
			});

			test("updateOrgSeats calls changePlan when DB lags behind Dodo", async () => {
				queueOrgBillingSelects();
				let retrieveCall = 0;
				retrieveMock.mockImplementation(async () => {
					retrieveCall++;
					return { quantity: retrieveCall === 1 ? 2 : 3 };
				});
				const { updateOrgSeats } = await import(
					"@/lib/domains/billing/utils/org"
				);

				const result = await updateOrgSeats({
					organizationId: orgId,
					seatCount: 3,
				});

				expect(result).toEqual({
					seatCount: 3,
					changed: true,
					pendingPayment: false,
				});
				expect(changePlanMock).toHaveBeenCalledTimes(1);
				expect(dbUpdates).toContainEqual({
					seatCount: 3,
					updatedAt: expect.any(Date),
				});
			});

			test("updateOrgSeats no-ops when target matches Dodo and syncs stale DB", async () => {
				queueOrgBillingSelects();
				const { updateOrgSeats } = await import(
					"@/lib/domains/billing/utils/org"
				);

				const result = await updateOrgSeats({
					organizationId: orgId,
					seatCount: 2,
				});

				expect(result).toEqual({
					seatCount: 2,
					changed: false,
					pendingPayment: false,
				});
				expect(changePlanMock).not.toHaveBeenCalled();
				expect(dbUpdates).toContainEqual({
					seatCount: 2,
					updatedAt: expect.any(Date),
				});
			});

			test("updateOrgSeats reports pending payment when Dodo quantity unchanged after increase", async () => {
				queueOrgBillingSelects();
				retrieveMock.mockImplementation(async () => ({ quantity: 2 }));
				const { updateOrgSeats } = await import(
					"@/lib/domains/billing/utils/org"
				);

				const result = await updateOrgSeats({
					organizationId: orgId,
					seatCount: 3,
				});

				expect(result).toEqual({
					seatCount: 2,
					changed: false,
					pendingPayment: true,
				});
				expect(changePlanMock).toHaveBeenCalledTimes(1);
			});
		});

		describe("preview seat change response", () => {
			beforeEach(() => {
				previewChangePlanMock.mockClear();
				retrieveMock.mockImplementation(async () => ({ quantity: 3 }));
				selectQueue = [[orgSubRow], [{ count: 1 }], [{ count: 1 }]];
			});

			test("returns Dodo quantity as currentSeatCount with credit metadata", async () => {
				previewChangePlanMock.mockImplementation(async () => ({
					immediate_charge: {
						effective_at: "2026-06-01T12:00:00.000Z",
						summary: { total_amount: -100, currency: "USD" },
					},
					new_plan: { quantity: 2 },
				}));

				const { previewOrgSeatChange } = await import(
					"@/lib/domains/billing/utils/org"
				);

				const preview = await previewOrgSeatChange({
					organizationId: orgId,
					seatCount: 2,
				});

				expect(preview.currentSeatCount).toBe(3);
				expect(preview.seatCount).toBe(2);
				expect(preview.deltaSeatCount).toBe(-1);
				expect(preview.isCredit).toBe(true);
				expect(preview.immediateChargeCents).toBe(-100);
			});
		});
	});

	describe("dispatchWebhookSubscriptionSync", () => {
		const checkoutFirstEmail = {
			to: "buyer@example.com",
			setupUrl: "https://app.example.com/setup/token",
			planLabel: "Teams",
			planId: "teams" as const,
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
					metadataPendingId: null,
					metadataCheckoutKind: null,
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
