import { useContext } from "react";
import { EntitlementUpgradeContext } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";

export function usePromptPlanUpgrade() {
	const ctx = useContext(EntitlementUpgradeContext);
	if (!ctx) {
		throw new Error(
			"usePromptPlanUpgrade must be used within EntitlementUpgradeProvider",
		);
	}
	return ctx.promptPlanUpgrade;
}
