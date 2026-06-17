import { useEntitlementUpgrade } from "@/src/lib/domains/entitlements/use-entitlement-upgrade";

export function usePromptPlanUpgrade() {
	return useEntitlementUpgrade().promptPlanUpgrade;
}
