import { useEnvelopeRecipientLimit } from "@filosign/react/billing";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { useEffect } from "react";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import {
	useRecipients,
	useSettlements,
} from "@/src/routes/dashboard/envelope/create/-lib/context/envelope-draft-context";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import {
	removeDraftForRecipient,
	removeDraftsForRemovedRecipients,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/settlement-drafts";

export function useRecipientsController() {
	const { value: recipients, onChange, error, showError } = useRecipients();
	const { value: settlementDrafts, onChange: onSettlementDraftsChange } =
		useSettlements();
	const { canAddRecipient } = useEnvelopeRecipientLimit();
	const promptPlanUpgrade = usePromptPlanUpgrade();

	const recipientCount = recipients?.length ?? 0;

	const addRecipient = () => {
		if (!canAddRecipient(recipientCount)) {
			promptPlanUpgrade("envelope.recipients.max");
			return;
		}
		const next: Recipient = {
			clientRowId: crypto.randomUUID(),
			name: "",
			email: "",
			role: "signer",
		};
		onChange([...(recipients || []), next]);
	};

	const removeRecipient = (index: number) => {
		const updated = [...(recipients || [])];
		const removed = updated[index];
		updated.splice(index, 1);
		onChange(updated);
		if (removed?.clientRowId) {
			onSettlementDraftsChange(
				removeDraftForRecipient(settlementDrafts, removed.clientRowId),
			);
		}
	};

	const updateRecipient = (index: number, updates: Partial<Recipient>) => {
		const updated = [...(recipients || [])];
		updated[index] = { ...updated[index], ...updates };
		onChange(updated);

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
						next.role === "viewer" ? ("viewer" as const) : ("signer" as const),
				};
			}),
		);
	};

	useEffect(() => {
		if (!recipients?.length) return;
		if (!recipients.some((r) => !r.clientRowId)) return;
		const withIds = recipients.map((r) => ({
			...r,
			clientRowId: r.clientRowId ?? crypto.randomUUID(),
		}));
		onChange(withIds);
		onSettlementDraftsChange(
			removeDraftsForRemovedRecipients(settlementDrafts, withIds),
		);
	}, [recipients, onChange, onSettlementDraftsChange, settlementDrafts]);

	return {
		recipients,
		error,
		showError,
		addRecipient,
		removeRecipient,
		updateRecipient,
	};
}

export type RecipientsController = ReturnType<typeof useRecipientsController>;
