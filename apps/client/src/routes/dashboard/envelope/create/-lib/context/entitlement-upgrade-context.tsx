import {
	createContext,
	type ReactNode,
	useCallback,
	useMemo,
	useState,
} from "react";
import {
	UpgradePlanDialog,
	type UpgradePlanLimitReason,
} from "@/src/lib/domains/entitlements/upgrade-plan-dialog";

type EntitlementUpgradeContextValue = {
	promptPlanUpgrade: (reason: UpgradePlanLimitReason) => void;
};

export const EntitlementUpgradeContext =
	createContext<EntitlementUpgradeContextValue | null>(null);

export function EntitlementUpgradeProvider({
	children,
}: {
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState<UpgradePlanLimitReason>(
		"documents.sent.monthly",
	);

	const promptPlanUpgrade = useCallback((next: UpgradePlanLimitReason) => {
		setReason(next);
		setOpen(true);
	}, []);

	const value = useMemo(() => ({ promptPlanUpgrade }), [promptPlanUpgrade]);

	return (
		<EntitlementUpgradeContext.Provider value={value}>
			{children}
			<UpgradePlanDialog open={open} onOpenChange={setOpen} reason={reason} />
		</EntitlementUpgradeContext.Provider>
	);
}
