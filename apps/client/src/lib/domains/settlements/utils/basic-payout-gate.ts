import type { BasicPayoutGate } from "@filosign/react/files";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import type { UpgradePlanLimitReason } from "@/src/lib/domains/entitlements/upgrade-plan-dialog";

/** Returns true when the action should abort (gate blocked). */
export function handleBasicPayoutGateBlock(
	gate: BasicPayoutGate,
	promptPlanUpgrade: (reason: UpgradePlanLimitReason) => void,
	options?: { onRequestAccess?: () => void },
): boolean {
	if (gate.allowed) return false;
	if (gate.reason === "free_plan") {
		promptPlanUpgrade("features.settlement.basic");
		return true;
	}
	if (
		options?.onRequestAccess &&
		(gate.reason === "access_none" ||
			gate.reason === "terms_outdated" ||
			gate.reason === "access_rejected")
	) {
		options.onRequestAccess();
		return true;
	}
	notifyBasicPayoutGateBlocked(gate);
	return true;
}

type PayoutGateToast = { title: string; hint: string };

function basicPayoutGateToast(gate: BasicPayoutGate): PayoutGateToast | null {
	if (gate.allowed) return null;
	switch (gate.reason) {
		case "free_plan":
			return null;
		case "access_pending":
			return TOASTS.payouts.accessPending;
		case "access_rejected":
			return TOASTS.payouts.accessRejected;
		case "terms_outdated":
			return TOASTS.payouts.termsOutdated;
		case "access_none":
			return TOASTS.payouts.accessNone;
		default:
			return TOASTS.payouts.accessRequired;
	}
}

function notifyBasicPayoutGateBlocked(gate: BasicPayoutGate): boolean {
	const copy = basicPayoutGateToast(gate);
	if (!copy) return false;
	toastUser.error(copy.title, { hint: copy.hint });
	return true;
}
