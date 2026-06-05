import { describe, expect, it } from "bun:test";
import type { EntitlementsSnapshot } from "../src/hooks/billing/useEntitlements";
import type { SettlementFeatureAccessGetOutput } from "../src/hooks/orgs/useSettlementFeatureAccessGet";
import {
	canAttachBasicPayout,
	resolveBasicPayoutGate,
} from "../src/lib/entitlements";

function entitlements(
	planId: EntitlementsSnapshot["planId"],
): EntitlementsSnapshot {
	return {
		planId,
		features: {
			"features.settlement.basic": {
				enabled: planId !== "free",
			},
		},
	} as unknown as EntitlementsSnapshot;
}

function access(
	status: SettlementFeatureAccessGetOutput["status"],
	termsCurrent = true,
): SettlementFeatureAccessGetOutput {
	return {
		status,
		termsCurrent,
		currentTermsVersion: "1",
	} as SettlementFeatureAccessGetOutput;
}

describe("resolveBasicPayoutGate", () => {
	it("blocks free plan", () => {
		expect(
			resolveBasicPayoutGate(entitlements("free"), access("approved")),
		).toEqual({ allowed: false, reason: "free_plan" });
	});

	it("allows paid plan with approved access", () => {
		expect(
			canAttachBasicPayout(entitlements("individual"), access("approved")),
		).toBe(true);
	});

	it("blocks pending access", () => {
		expect(
			resolveBasicPayoutGate(entitlements("teams"), access("pending")),
		).toEqual({ allowed: false, reason: "access_pending" });
	});

	it("blocks missing access", () => {
		expect(
			resolveBasicPayoutGate(entitlements("teams"), access("none")),
		).toEqual({ allowed: false, reason: "access_none" });
	});

	it("blocks outdated terms", () => {
		expect(
			resolveBasicPayoutGate(
				entitlements("teams_pro"),
				access("approved", false),
			),
		).toEqual({ allowed: false, reason: "terms_outdated" });
	});
});
