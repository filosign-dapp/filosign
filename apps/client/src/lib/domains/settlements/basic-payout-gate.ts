import type { BasicPayoutGate } from "@filosign/react/files";
import { toast } from "sonner";
import type { UpgradePlanLimitReason } from "@/src/lib/domains/entitlements/upgrade-plan-dialog";

export const PAYOUT_ACCESS_SETTINGS_PATH = "/dashboard/settings/workspace";

/** Returns true when the action should abort (gate blocked). */
export function handleBasicPayoutGateBlock(
	gate: BasicPayoutGate,
	promptPlanUpgrade: (reason: UpgradePlanLimitReason) => void,
): boolean {
	if (gate.allowed) return false;
	if (gate.reason === "free_plan") {
		promptPlanUpgrade("features.settlement.basic");
		return true;
	}
	notifyBasicPayoutGateBlocked(gate);
	return true;
}

export function basicPayoutGateMessage(gate: BasicPayoutGate): string | null {
	if (gate.allowed) return null;
	switch (gate.reason) {
		case "free_plan":
			return null;
		case "access_pending":
			return "Payout attachment is pending Filosign review. Check Workspace settings for status.";
		case "access_rejected":
			return "Payout attachment was not approved. Submit a new request in Workspace settings.";
		case "terms_outdated":
			return "Settlement terms were updated. Submit a new access request in Workspace settings.";
		case "access_none":
			return "Request payout attachment access in Workspace settings before attaching payouts.";
		default:
			return "Payout attachment access is required in Workspace settings.";
	}
}

export function notifyBasicPayoutGateBlocked(gate: BasicPayoutGate): boolean {
	const message = basicPayoutGateMessage(gate);
	if (!message) return false;
	toast.error(message, {
		description: "Settings → Workspace → Payout attachment access",
	});
	return true;
}
