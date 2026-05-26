import { useEnvelopeRecipientLimit } from "@filosign/react/billing";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { useStore } from "@tanstack/react-form";
import { useEffect } from "react";
import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import {
	removeDraftForRecipient,
	removeDraftsForRemovedRecipients,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/settlement-drafts";
import { fieldErrorMessage } from "@/src/routes/dashboard/envelope/create/-lib/validation/field-validator";

export function useRecipientsController() {
	const { form, showValidationErrors } = useCreateEnvelope();
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
		form.setFieldValue("recipients", withIds);
		form.setFieldValue(
			"settlementDrafts",
			removeDraftsForRemovedRecipients(settlementDrafts, withIds),
		);
	}, [recipients, settlementDrafts, form]);

	return {
		recipients,
		error: fieldErrorMessage(recipientErrors),
		showError: showValidationErrors,
		settlementDrafts,
		onSettlementDraftsChange,
		addRecipient,
		removeRecipient,
		updateRecipient,
	};
}

export type RecipientsController = ReturnType<typeof useRecipientsController>;
