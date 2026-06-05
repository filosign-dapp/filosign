import type { EntitlementContext } from "@filosign/entitlements";
import { throwAppError } from "@filosign/errors/server";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { isAdvancedSettlementReleaseType } from "@filosign/shared";
import type { Address } from "viem";
import { MAX_SETTLEMENT_LEGS_PRODUCT } from "@/constants";
import { assertEntitlement } from "@/lib/domains/entitlements";
import { assertOrganizationSettlementFeatureApproved } from "@/lib/domains/settlement-access";

function requireSettlementOrganizationId(
	organizationId: string | null,
): string {
	if (!organizationId) {
		throw throwAppError("SETTLEMENTS.FORBIDDEN");
	}
	return organizationId;
}

export async function assertSettlementRuleEntitlements(
	ctx: EntitlementContext,
	rule: SettlementRuleRegistrationInput,
	organizationId: string | null,
	callerWallet?: Address,
) {
	const orgId = requireSettlementOrganizationId(organizationId);
	await assertOrganizationSettlementFeatureApproved(orgId, { callerWallet });
	assertEntitlement(ctx, "features.settlement.basic");

	if (rule.legs.length > 1) {
		assertEntitlement(ctx, "features.settlement.advanced");
	}
	if (rule.legs.length > MAX_SETTLEMENT_LEGS_PRODUCT) {
		throw throwAppError("ENTITLEMENT.LIMIT_EXCEEDED");
	}
	if (isAdvancedSettlementReleaseType(rule.releaseType)) {
		assertEntitlement(ctx, "features.settlement.advanced");
	}
}

export async function assertSettlementUpdateEntitlements(
	ctx: EntitlementContext,
	organizationId: string | null,
	callerWallet?: Address,
) {
	const orgId = requireSettlementOrganizationId(organizationId);
	await assertOrganizationSettlementFeatureApproved(orgId, { callerWallet });
	assertEntitlement(ctx, "features.settlement.advanced");
}
