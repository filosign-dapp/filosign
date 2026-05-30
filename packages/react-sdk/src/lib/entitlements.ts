import type { EntitlementsSnapshot } from "../hooks/billing/useEntitlements";

function featureEnabled(
	entitlements: EntitlementsSnapshot | undefined,
	key: string,
): boolean {
	return entitlements?.features[key]?.enabled === true;
}

export function canUseAdvancedRouting(
	entitlements: EntitlementsSnapshot | undefined,
): boolean {
	return featureEnabled(entitlements, "features.routing.advanced");
}

export function canUseAdvancedSettlements(
	entitlements: EntitlementsSnapshot | undefined,
): boolean {
	return featureEnabled(entitlements, "features.settlement.advanced");
}

export function canUseBasicSettlements(
	entitlements: EntitlementsSnapshot | undefined,
): boolean {
	return featureEnabled(entitlements, "features.settlement.basic");
}
