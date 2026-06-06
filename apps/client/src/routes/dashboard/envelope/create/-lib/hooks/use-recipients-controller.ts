import { useFilosignContext } from "@filosign/react";
import { useEnvelopeRecipientLimit } from "@filosign/react/billing";
import { useUserProfile } from "@filosign/react/users";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { useStore } from "@tanstack/react-form";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { createClientId } from "@/src/lib/utils/id";
import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";
import { useTurnOrderRouting } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-turn-order-routing";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { removeDraftForRecipient } from "@/src/routes/dashboard/envelope/create/-lib/utils/settlement-drafts";
import { fieldErrorMessage } from "@/src/routes/dashboard/envelope/create/-lib/validation/field-validator";
import {
	isSelfSignEnabled,
	removeAutoAddedSelfRecipients,
	upsertAutoAddedSelfRecipient,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-assignees";

export function useRecipientsController() {
	const { form, showValidationErrors } = useCreateEnvelope();
	const { data: selfProfile } = useUserProfile();
	const { wallet } = useFilosignContext();
	const recipients = useStore(form.store, (state) => state.values.recipients);
	const settlementDrafts = useStore(
		form.store,
		(state) => state.values.settlementDrafts ?? [],
	);
	const recipientErrors = useStore(
		form.store,
		(state) => state.fieldMeta.recipients?.errors,
	);
	const { canAddRecipient } = useEnvelopeRecipientLimit();
	const promptPlanUpgrade = usePromptPlanUpgrade();

	const onChange = (next: Recipient[]) =>
		form.setFieldValue("recipients", next);
	const onSettlementDraftsChange = (next: typeof settlementDrafts) =>
		form.setFieldValue("settlementDrafts", next);

	const {
		turnOrderEnabled,
		routingOrderEmails,
		setTurnOrderEnabled,
		applySignerReorder,
		syncRoutingAfterRecipientsChange,
		patchRoutingOrderEmails,
	} = useTurnOrderRouting(recipients);

	const applyRecipientsChange = useCallback(
		(next: Recipient[]) => {
			const prev = recipients || [];
			onChange(next);
			syncRoutingAfterRecipientsChange(prev, next);
		},
		[recipients, onChange, syncRoutingAfterRecipientsChange],
	);

	const recipientCount = recipients?.length ?? 0;

	const addRecipient = useCallback(() => {
		if (!canAddRecipient(recipientCount)) {
			promptPlanUpgrade("envelope.recipients.max");
			return;
		}
		const next: Recipient = {
			clientRowId: createClientId(),
			name: "",
			email: "",
			role: "signer",
		};
		applyRecipientsChange([...(recipients || []), next]);
	}, [
		canAddRecipient,
		recipientCount,
		promptPlanUpgrade,
		recipients,
		applyRecipientsChange,
	]);

	const removeRecipient = useCallback(
		(index: number) => {
			const updated = [...(recipients || [])];
			const removed = updated[index];
			updated.splice(index, 1);
			applyRecipientsChange(updated);
			if (removed?.clientRowId) {
				onSettlementDraftsChange(
					removeDraftForRecipient(settlementDrafts, removed.clientRowId),
				);
			}
		},
		[
			recipients,
			settlementDrafts,
			applyRecipientsChange,
			onSettlementDraftsChange,
		],
	);

	const reorderSigners = useCallback(
		(signerFromIndex: number, signerToIndex: number) => {
			const result = applySignerReorder(signerFromIndex, signerToIndex);
			if (!result) return;
			onChange(result.recipients);
			patchRoutingOrderEmails(result.routingOrderEmails);
		},
		[applySignerReorder, onChange, patchRoutingOrderEmails],
	);

	const selfSignProfile = useMemo(
		() => ({
			email: selfProfile?.email,
			walletAddress:
				wallet?.account.address ?? selfProfile?.walletAddress ?? null,
			firstName: selfProfile?.firstName,
			lastName: selfProfile?.lastName,
		}),
		[
			selfProfile?.email,
			selfProfile?.walletAddress,
			selfProfile?.firstName,
			selfProfile?.lastName,
			wallet?.account.address,
		],
	);

	const selfSignEnabled = useMemo(
		() => isSelfSignEnabled(recipients ?? [], selfSignProfile),
		[recipients, selfSignProfile],
	);

	const setSelfSignEnabled = useCallback(
		(enabled: boolean) => {
			if (enabled) {
				if (!canAddRecipient(recipientCount)) {
					promptPlanUpgrade("envelope.recipients.max");
					return;
				}
				const next = upsertAutoAddedSelfRecipient(
					recipients ?? [],
					selfSignProfile,
				);
				if (!next) {
					toast.error(
						"Add a primary email to your Filosign profile before signing yourself",
					);
					return;
				}
				applyRecipientsChange(next);
				return;
			}
			applyRecipientsChange(removeAutoAddedSelfRecipients(recipients ?? []));
		},
		[
			canAddRecipient,
			recipientCount,
			promptPlanUpgrade,
			recipients,
			selfSignProfile,
			applyRecipientsChange,
		],
	);

	const updateRecipient = useCallback(
		(index: number, updates: Partial<Recipient>) => {
			const updated = [...(recipients || [])];
			updated[index] = { ...updated[index], ...updates };
			applyRecipientsChange(updated);

			const rowId = updated[index]?.clientRowId;
			if (!rowId) return;

			const draft = settlementDrafts.find(
				(d) => d.recipientClientRowId === rowId,
			);
			if (!draft) return;

			const next = { ...updated[index] };
			const emailRaw = next.email?.trim();
			onSettlementDraftsChange(
				settlementDrafts.map((d) => {
					if (d.recipientClientRowId !== rowId) return d;
					return {
						...d,
						recipientLabel: next.name?.trim() || emailRaw || d.recipientLabel,
						recipientEmail: emailRaw
							? normalizePlacementRecipientEmail(emailRaw)
							: d.recipientEmail,
						recipientSource:
							next.role === "viewer"
								? ("viewer" as const)
								: ("signer" as const),
					};
				}),
			);
		},
		[
			recipients,
			settlementDrafts,
			applyRecipientsChange,
			onSettlementDraftsChange,
		],
	);

	return useMemo(
		() => ({
			recipients,
			error: fieldErrorMessage(recipientErrors),
			showError: showValidationErrors,
			settlementDrafts,
			onSettlementDraftsChange,
			addRecipient,
			removeRecipient,
			updateRecipient,
			turnOrderEnabled,
			routingOrderEmails,
			setTurnOrderEnabled,
			reorderSigners,
			selfSignEnabled,
			setSelfSignEnabled,
			selfSignProfileEmail: selfSignProfile.email?.trim() ?? null,
		}),
		[
			recipients,
			recipientErrors,
			showValidationErrors,
			settlementDrafts,
			addRecipient,
			removeRecipient,
			updateRecipient,
			turnOrderEnabled,
			routingOrderEmails,
			setTurnOrderEnabled,
			reorderSigners,
			selfSignEnabled,
			setSelfSignEnabled,
			selfSignProfile.email,
		],
	);
}

export type RecipientsController = ReturnType<typeof useRecipientsController>;
