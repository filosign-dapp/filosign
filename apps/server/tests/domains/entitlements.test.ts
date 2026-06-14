import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { dbQueryResult } from "../support/db-query-result";
import { restoreTestEnvMock } from "../support/env-stub";
import { createMockRedis, mockSessionCacheRedis } from "../support/mock-redis";

describe("entitlements", () => {
	describe("entitlements", () => {
		describe("effectivePlanIdFromStatus", () => {
			const now = new Date("2026-06-01T12:00:00.000Z");

			test("returns free when subscription is missing", async () => {
				const { effectivePlanIdFromStatus } = await import(
					"@/lib/domains/entitlements"
				);
				expect(effectivePlanIdFromStatus(undefined, now)).toBe("free");
			});

			test("keeps paid plan for active/trialing", async () => {
				const { effectivePlanIdFromStatus } = await import(
					"@/lib/domains/entitlements"
				);
				expect(
					effectivePlanIdFromStatus({ planId: "teams", status: "active" }, now),
				).toBe("teams");
				expect(
					effectivePlanIdFromStatus(
						{ planId: "teams_pro", status: "trialing" },
						now,
					),
				).toBe("teams_pro");
			});

			test("keeps plan during cancel-at-period-end until period end", async () => {
				const { effectivePlanIdFromStatus } = await import(
					"@/lib/domains/entitlements"
				);
				expect(
					effectivePlanIdFromStatus(
						{
							planId: "teams",
							status: "canceled",
							cancelAtPeriodEnd: true,
							periodEnd: new Date("2026-06-15T00:00:00.000Z"),
						},
						now,
					),
				).toBe("teams");
			});

			test("downgrades after cancel-at-period-end window", async () => {
				const { effectivePlanIdFromStatus } = await import(
					"@/lib/domains/entitlements"
				);
				expect(
					effectivePlanIdFromStatus(
						{
							planId: "teams",
							status: "canceled",
							cancelAtPeriodEnd: true,
							periodEnd: new Date("2026-05-15T00:00:00.000Z"),
						},
						now,
					),
				).toBe("free");
			});

			test("keeps plan while past_due (payment retry window)", async () => {
				const { effectivePlanIdFromStatus } = await import(
					"@/lib/domains/entitlements"
				);
				expect(
					effectivePlanIdFromStatus(
						{ planId: "teams", status: "past_due" },
						now,
					),
				).toBe("teams");
			});

			test("downgrades incomplete subscriptions", async () => {
				const { effectivePlanIdFromStatus } = await import(
					"@/lib/domains/entitlements"
				);
				expect(
					effectivePlanIdFromStatus(
						{ planId: "teams", status: "incomplete" },
						now,
					),
				).toBe("free");
			});
		});

		describe("recipientSlotCounts", () => {
			test("sums warm participants and cold invites", async () => {
				const { recipientSlotCounts } = await import(
					"@/lib/domains/entitlements"
				);
				const counts = recipientSlotCounts({
					participants: [{ isSigner: true }, { isSigner: false }],
					coldInvites: [{ isSigner: true }],
				});
				expect(counts.warmParticipantCount).toBe(2);
				expect(counts.coldInviteCount).toBe(1);
				expect(counts.recipientSlotCount).toBe(3);
			});
		});
	});

	describe("resolveEntitlementContext org scope", () => {
		const orgId = "00000000-0000-7000-8000-000000000002";
		const personalOrgId = "00000000-0000-7000-8000-000000000001";
		const wallet = "0x0000000000000000000000000000000000000001";

		let selectQueue: unknown[][] = [];
		const { client: mockRedis, store: redisStore } = createMockRedis();

		beforeAll(() => {
			mockSessionCacheRedis(mockRedis);
			mock.module("@/lib/domains/orgs/workspace", () => ({
				getPersonalOrganizationId: async () => personalOrgId,
			}));
			mock.module("@/lib/platform/db", () => ({
				default: {
					schema: {
						users: {},
						organizationSubscriptions: {},
						files: {},
					},
					select: () => ({
						from: () => ({
							where: () => {
								const rows = selectQueue.shift() ?? [];
								return dbQueryResult(rows);
							},
						}),
					}),
				},
			}));
		});

		afterAll(() => {
			mock.restore();
			restoreTestEnvMock();
		});

		test("inherits teams_pro from org subscription", async () => {
			redisStore.clear();
			selectQueue = [
				[
					{
						planId: "teams_pro",
						status: "active",
						seatCount: 3,
						cancelAtPeriodEnd: false,
						periodEnd: null,
						featureOverrides: {},
					},
				],
				[{ count: 0 }],
			];

			const { resolveEntitlementContext } = await import(
				"@/lib/domains/entitlements"
			);

			const ctx = await resolveEntitlementContext(wallet, orgId);

			expect(ctx.planId).toBe("teams_pro");
			expect(ctx.subject).toEqual({
				type: "org_member",
				orgId,
				wallet,
			});
			expect(ctx.seatCount).toBe(3);
		});

		test("resolves individual from personal org when no org is passed", async () => {
			redisStore.clear();
			selectQueue = [
				[
					{
						planId: "individual",
						status: "active",
						seatCount: 1,
						cancelAtPeriodEnd: false,
						periodEnd: null,
						featureOverrides: {},
					},
				],
				[{ count: 2 }],
			];

			const { resolveEntitlementContext } = await import(
				"@/lib/domains/entitlements"
			);

			const ctx = await resolveEntitlementContext(wallet);

			expect(ctx.planId).toBe("individual");
			expect(ctx.subject).toEqual({
				type: "org_member",
				orgId: personalOrgId,
				wallet,
			});
			expect(ctx.usage?.["documents.sent.monthly"]).toBe(2);
		});

		test("explicit team org uses org subscription only", async () => {
			redisStore.clear();
			selectQueue = [
				[
					{
						planId: "free",
						status: "active",
						seatCount: 3,
						cancelAtPeriodEnd: false,
						periodEnd: null,
						featureOverrides: {},
					},
				],
				[{ count: 1 }],
			];

			const { resolveEntitlementContext } = await import(
				"@/lib/domains/entitlements"
			);

			const ctx = await resolveEntitlementContext(wallet, orgId);

			expect(ctx.planId).toBe("free");
			expect(ctx.subject.type).toBe("org_member");
			if (ctx.subject.type === "org_member") {
				expect(ctx.subject.orgId).toBe(orgId);
			}
		});
	});

	describe("activation quota", () => {
		test("practice envelopes skip quota enforcement", async () => {
			const { shouldEnforceSendQuota } = await import(
				"@/lib/domains/users/activation-quota"
			);
			expect(shouldEnforceSendQuota(true)).toBe(false);
		});

		test("real envelopes enforce quota", async () => {
			const { shouldEnforceSendQuota } = await import(
				"@/lib/domains/users/activation-quota"
			);
			expect(shouldEnforceSendQuota(false)).toBe(true);
			expect(shouldEnforceSendQuota(undefined)).toBe(true);
		});
	});
});
