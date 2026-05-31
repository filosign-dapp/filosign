import { afterAll, describe, expect, mock, test } from "bun:test";
import { dbQueryResult } from "../support/db-query-result";

const orgId = "00000000-0000-7000-8000-000000000002";
const wallet = "0x0000000000000000000000000000000000000001";

let selectQueue: unknown[][] = [];

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

afterAll(() => {
	mock.restore();
});

describe("resolveEntitlementContext org scope", () => {
	test("does not inherit legacy wallet solo when org is free", async () => {
		selectQueue = [
			[
				{
					planId: "individual",
					status: "active",
					cancelAtPeriodEnd: false,
					periodEnd: null,
					featureOverrides: {},
				},
			],
			[
				{
					planId: "free",
					status: "active",
					seatCount: 1,
					cancelAtPeriodEnd: false,
					periodEnd: null,
					featureOverrides: {},
				},
			],
			[{ count: 0 }],
		];

		const { resolveEntitlementContext } = await import(
			"@/lib/domains/entitlements/resolve-context"
		);

		const ctx = await resolveEntitlementContext(wallet, orgId);
		expect(ctx.planId).toBe("free");
	});

	test("inherits teams_pro from org when user has no subscription", async () => {
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
			"@/lib/domains/entitlements/resolve-context"
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
