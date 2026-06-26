import {
	type UpgradePlanLimitReason,
	useEntitlements,
	useOrgBillingSummary,
} from "@filosign/react/billing";
import { canUseTeamCollaboration } from "@filosign/react/files";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { BILLING_SETTINGS_PATH } from "@/src/lib/domains/billing/settings-path";

export function isOrgAtSeatCapacity(
	usedSeats: number | undefined,
	seatCount: number | undefined,
): boolean {
	if (typeof usedSeats !== "number" || typeof seatCount !== "number") {
		return false;
	}
	return usedSeats >= seatCount;
}

export function useInviteTeammateGate() {
	const { data: entitlements } = useEntitlements();
	const billing = useOrgBillingSummary();

	const hasCollaboration = canUseTeamCollaboration(entitlements);
	const atSeatCapacity = useMemo(
		() => isOrgAtSeatCapacity(billing.data?.usedSeats, billing.data?.seatCount),
		[billing.data?.seatCount, billing.data?.usedSeats],
	);

	return {
		hasCollaboration,
		atSeatCapacity,
		billingLoading: billing.isLoading,
	};
}

export function useOpenInviteTeammateDialog(args: {
	openInvite: () => void;
	openUpgrade: (reason: UpgradePlanLimitReason) => void;
}) {
	const navigate = useNavigate();
	const gate = useInviteTeammateGate();

	return useCallback(() => {
		if (!gate.hasCollaboration) {
			args.openUpgrade("features.team_collaboration");
			return;
		}
		if (gate.atSeatCapacity) {
			toastUser.error("No available seats", {
				hint: "Add seats in Billing or revoke a pending invite.",
			});
			void navigate({ to: BILLING_SETTINGS_PATH });
			return;
		}
		args.openInvite();
	}, [args, gate.atSeatCapacity, gate.hasCollaboration, navigate]);
}
