import { describe, expect, test } from "bun:test";
import { catalogV1 } from "../src/catalog";
import { check, getLimit, getQuotaScope } from "../src/evaluate";
import type { FeatureKey } from "../src/features";
import { FEATURE_KEYS } from "../src/features";
import type { EntitlementContext, PlanId } from "../src/types";
import { PLAN_IDS } from "../src/types";

function ctx(
	planId: PlanId,
	usage: Partial<Record<FeatureKey, number>> = {},
	overrides?: EntitlementContext["overrides"],
): EntitlementContext {
	return {
		subject: {
			type: "user",
			wallet: "0x0000000000000000000000000000000000000001",
		},
		planId,
		periodStart: new Date("2026-05-01T00:00:00Z"),
		usage,
		overrides,
	};
}

function orgCtx(
	planId: PlanId,
	usage: Partial<Record<FeatureKey, number>> = {},
): EntitlementContext {
	return {
		subject: {
			type: "org_member",
			orgId: "org_1",
			wallet: "0x0000000000000000000000000000000000000002",
		},
		planId,
		periodStart: new Date("2026-05-01T00:00:00Z"),
		usage,
	};
}

describe("catalog v1", () => {
	test("every plan defines every feature key", () => {
		for (const planId of PLAN_IDS) {
			for (const key of FEATURE_KEYS) {
				expect(catalogV1[planId][key]).toBeDefined();
			}
		}
	});
});

describe("quota documents.sent.monthly", () => {
	const cases: {
		planId: PlanId;
		limit: number | null;
		scope?: "account" | "per_seat";
	}[] = [
		{ planId: "free", limit: 3, scope: "account" },
		{ planId: "individual", limit: 10, scope: "account" },
		{ planId: "teams", limit: 30, scope: "per_seat" },
		{ planId: "teams_pro", limit: 60, scope: "per_seat" },
		{ planId: "enterprise", limit: null },
	];

	for (const { planId, limit, scope } of cases) {
		test(`${planId}: limit ${limit ?? "contract"}`, () => {
			const context = ctx(planId);
			expect(getLimit(context, "documents.sent.monthly")).toBe(limit);
			if (scope) {
				expect(getQuotaScope(context, "documents.sent.monthly")).toBe(scope);
			}

			if (limit === null) {
				expect(
					check(
						{ ...context, usage: { "documents.sent.monthly": 999 } },
						"documents.sent.monthly",
					).allowed,
				).toBe(true);
				return;
			}

			expect(
				check(
					{ ...context, usage: { "documents.sent.monthly": limit - 1 } },
					"documents.sent.monthly",
				).allowed,
			).toBe(true);
			expect(
				check(
					{ ...context, usage: { "documents.sent.monthly": limit } },
					"documents.sent.monthly",
				).allowed,
			).toBe(false);
			expect(
				check(
					{ ...context, usage: { "documents.sent.monthly": limit } },
					"documents.sent.monthly",
				).reason,
			).toBe("QUOTA_EXCEEDED");
		});
	}

	test("enterprise override applies numeric cap", () => {
		const context = ctx(
			"enterprise",
			{ "documents.sent.monthly": 50 },
			{
				"documents.sent.monthly": 100,
			},
		);
		expect(getLimit(context, "documents.sent.monthly")).toBe(100);
		expect(check(context, "documents.sent.monthly").allowed).toBe(true);
		expect(
			check(
				{ ...context, usage: { "documents.sent.monthly": 100 } },
				"documents.sent.monthly",
			).allowed,
		).toBe(false);
	});
});

describe("max envelope.recipients.max", () => {
	const limits: Record<PlanId, number | null> = {
		free: 1,
		individual: 3,
		teams: 10,
		teams_pro: 20,
		enterprise: null,
	};

	for (const planId of PLAN_IDS) {
		const limit = limits[planId];
		test(`${planId}: max ${limit ?? "unlimited"}`, () => {
			const context = ctx(planId);
			expect(getLimit(context, "envelope.recipients.max")).toBe(limit);

			if (limit === null) {
				expect(
					check(context, "envelope.recipients.max", { requested: 500 }).allowed,
				).toBe(true);
				return;
			}

			expect(
				check(context, "envelope.recipients.max", { requested: limit }).allowed,
			).toBe(true);
			expect(
				check(context, "envelope.recipients.max", { requested: limit + 1 })
					.allowed,
			).toBe(false);
			expect(
				check(context, "envelope.recipients.max", { requested: limit + 1 })
					.reason,
			).toBe("LIMIT_EXCEEDED");
		});
	}
});

describe("boolean features", () => {
	const teamOnly: FeatureKey[] = [
		"features.shared_templates",
		"features.comments",
		"features.envelope.team_visibility",
		"features.routing.advanced",
	];

	for (const key of teamOnly) {
		test(`${key} enabled on teams, teams_pro, and enterprise`, () => {
			expect(check(ctx("free"), key).allowed).toBe(false);
			expect(check(ctx("individual"), key).allowed).toBe(false);
			expect(check(ctx("teams"), key).allowed).toBe(true);
			expect(check(ctx("teams_pro"), key).allowed).toBe(true);
			expect(check(ctx("enterprise"), key).allowed).toBe(true);
		});
	}

	test("features.integrations.custom enterprise & teams_pro only", () => {
		expect(check(ctx("teams"), "features.integrations.custom").allowed).toBe(
			false,
		);
		expect(
			check(ctx("teams_pro"), "features.integrations.custom").allowed,
		).toBe(true);
		expect(
			check(ctx("enterprise"), "features.integrations.custom").allowed,
		).toBe(true);
	});
});

describe("org_member context", () => {
	test("teams per-seat scope is exposed for server metering", () => {
		const context = orgCtx("teams");
		expect(getQuotaScope(context, "documents.sent.monthly")).toBe("per_seat");
		expect(check(context, "features.comments").allowed).toBe(true);
	});
});
