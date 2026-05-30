import type { EntitlementContext } from "@filosign/entitlements";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { isAdvancedSettlementReleaseType } from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { MAX_SETTLEMENT_LEGS_PRODUCT } from "@/constants";
import { assertEntitlement } from "@/lib/domains/entitlements";

export function assertSettlementRuleEntitlements(
	ctx: EntitlementContext,
	rule: SettlementRuleRegistrationInput,
) {
	assertEntitlement(ctx, "features.settlement.basic");

	if (rule.legs.length > 1) {
		assertEntitlement(ctx, "features.settlement.advanced");
	}
	if (rule.legs.length > MAX_SETTLEMENT_LEGS_PRODUCT) {
		throw new ORPCError("FORBIDDEN", {
			message: `Settlement supports at most ${MAX_SETTLEMENT_LEGS_PRODUCT} payout legs on your plan`,
		});
	}
	if (isAdvancedSettlementReleaseType(rule.releaseType)) {
		assertEntitlement(ctx, "features.settlement.advanced");
	}
}

export function assertSettlementUpdateEntitlements(ctx: EntitlementContext) {
	assertEntitlement(ctx, "features.settlement.advanced");
}
