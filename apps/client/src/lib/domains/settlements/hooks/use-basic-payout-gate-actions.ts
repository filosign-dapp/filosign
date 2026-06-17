import { useBasicPayoutAttachGate } from "@filosign/react/files";
import { useCallback, useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";
import { payoutAccessRequestIntent } from "../payout-access/intent";
import { handleBasicPayoutGateBlock } from "../utils/basic-payout-gate";
import { usePayoutFeatureAccess } from "./use-payout-feature-access";

export function useBasicPayoutGateActions(args: {
	activeOrgId: string | undefined;
	canManage: boolean;
}) {
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const { gate, canAttach } = useBasicPayoutAttachGate();
	const [requestDialogOpen, setRequestDialogOpen] = useState(false);

	const payoutAccess = usePayoutFeatureAccess({
		activeOrgId: args.activeOrgId,
		canManage: args.canManage,
		onSubmitted: () => setRequestDialogOpen(false),
	});

	const guardPayoutAttach = useCallback(() => {
		return handleBasicPayoutGateBlock(gate, promptPlanUpgrade, {
			onRequestAccess: () => {
				if (payoutAccessRequestIntent(args.canManage) === "admin_required") {
					toastUser.error(TOASTS.payouts.accessRequired.title, {
						hint: TOASTS.payouts.accessRequired.hint,
					});
					return;
				}
				setRequestDialogOpen(true);
			},
		});
	}, [args.canManage, gate, promptPlanUpgrade]);

	return {
		canAttach,
		requestDialogOpen,
		setRequestDialogOpen,
		payoutAccess,
		guardPayoutAttach,
	};
}
