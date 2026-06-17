import { useContext } from "react";
import { EntitlementUpgradeContext } from "@/src/lib/domains/entitlements/upgrade-context";

export function useEntitlementUpgrade() {
	const ctx = useContext(EntitlementUpgradeContext);
	if (!ctx) {
		throw new Error(
			"useEntitlementUpgrade must be used within EntitlementUpgradeProvider",
		);
	}
	return ctx;
}
