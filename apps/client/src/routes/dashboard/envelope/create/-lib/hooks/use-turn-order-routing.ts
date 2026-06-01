import { useEntitlements } from "@filosign/react/billing";
import { canUseAdvancedRouting } from "@filosign/react/files";
import type { RegisterRoutingInput } from "@filosign/shared";
import { useCallback } from "react";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import {
	defaultRoutingOrderFromRecipients,
	isTurnOrderEnabled,
	reorderSignersInRecipients,
	syncRoutingOrderOnRecipientChange,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/routing-turn-order";

export function useTurnOrderRouting(recipients: Recipient[] | undefined) {
	const createForm = useStorePersist((s) => s.createForm);
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { data: entitlements } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const advancedRouting = canUseAdvancedRouting(entitlements);

	const routing = createForm?.registerRouting ?? {};
	const turnOrderEnabled = isTurnOrderEnabled(routing);
	const routingOrderEmails = routing.routingOrderEmails ?? [];

	const patchRouting = useCallback(
		(patch: Partial<RegisterRoutingInput>) => {
			if (!createForm) return;
			const current = createForm.registerRouting ?? {};
			setCreateForm({
				...createForm,
				registerRouting: { ...current, ...patch },
			});
		},
		[createForm, setCreateForm],
	);

	const requireAdvanced = useCallback(() => {
		if (advancedRouting) return true;
		promptPlanUpgrade("features.routing.advanced");
		return false;
	}, [advancedRouting, promptPlanUpgrade]);

	const setTurnOrderEnabled = useCallback(
		(enabled: boolean) => {
			if (enabled && !requireAdvanced()) return;

			if (!enabled) {
				patchRouting({ routingMode: 0, routingOrderEmails: [] });
				return;
			}

			const existing = routing.routingOrderEmails ?? [];
			patchRouting({
				routingMode: 1,
				routingOrderEmails:
					existing.length > 0
						? existing
						: defaultRoutingOrderFromRecipients(recipients ?? []),
			});
		},
		[patchRouting, requireAdvanced, recipients, routing.routingOrderEmails],
	);

	const applySignerReorder = useCallback(
		(signerFromIndex: number, signerToIndex: number) => {
			if (!recipients?.length) return null;
			return reorderSignersInRecipients(
				recipients,
				signerFromIndex,
				signerToIndex,
				routingOrderEmails,
			);
		},
		[recipients, routingOrderEmails],
	);

	const syncRoutingAfterRecipientsChange = useCallback(
		(prev: Recipient[], next: Recipient[]) => {
			if (!isTurnOrderEnabled(createForm?.registerRouting)) return;
			const currentOrder =
				createForm?.registerRouting?.routingOrderEmails ?? [];
			const nextOrder = syncRoutingOrderOnRecipientChange(
				prev,
				next,
				currentOrder,
			);
			patchRouting({ routingOrderEmails: nextOrder });
		},
		[createForm?.registerRouting, patchRouting],
	);

	const patchRoutingOrderEmails = useCallback(
		(routingOrderEmails: string[]) => {
			patchRouting({ routingOrderEmails });
		},
		[patchRouting],
	);

	return {
		turnOrderEnabled,
		routingOrderEmails,
		setTurnOrderEnabled,
		applySignerReorder,
		syncRoutingAfterRecipientsChange,
		patchRoutingOrderEmails,
	};
}
