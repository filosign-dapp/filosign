import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { effectivePlanIdFromStatus } from "@/lib/domains/entitlements";
import { dbQueryResult } from "../support/db-query-result";
import { createMockRedis, mockSessionCacheRedis } from "../support/mock-redis";

describe("entitlements", () => {
	describe("entitlements", () => {
		describe("effectivePlanIdFromStatus", () => {
			const now = new Date("2026-06-01T12:00:00.000Z");

			test("returns free when subscription is missing", () => {
				expect(effectivePlanIdFromStatus(undefined, now)).toBe("free");
			});

			test("keeps paid plan for active/trialing", () => {
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

			test("keeps plan during cancel-at-period-end until period end", () => {
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

			test("downgrades after cancel-at-period-end window", () => {
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

			test("keeps plan while past_due (payment retry window)", () => {
				expect(
					effectivePlanIdFromStatus(
						{ planId: "teams", status: "past_due" },
						now,
					),
				).toBe("teams");
			});

			test("downgrades incomplete subscriptions", () => {
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

	describe("entitlements-org-scope", () => {
		const orgId = "00000000-0000-7000-8000-000000000002";
		const wallet = "0x0000000000000000000000000000000000000001";

		let selectQueue: unknown[][] = [];

		const { client: mockRedis, store: redisStore } = createMockRedis();

		beforeAll(() => {
			mockSessionCacheRedis(mockRedis);
			mock.module("@/lib/platform/db", () => ({
				default: {
					schema: {
						users: {},
						userSubscriptions: {},
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
		});

		describe("resolveEntitlementContext org scope", () => {
			test("inherits teams_pro from org when user has no subscription", async () => {
				redisStore.clear();
				selectQueue = [
					[],
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
		});
	});
});
