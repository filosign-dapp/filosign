import { useEnvelopeRecipientLimit } from "@filosign/react/billing";
import { useEffect } from "react";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import { useRecipients } from "@/src/routes/dashboard/envelope/create/-lib/context/envelope-draft-context";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";

export function useRecipientsController() {
	const { value: recipients, onChange, error, showError } = useRecipients();
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
		updated.splice(index, 1);
		onChange(updated);
	};

	const updateRecipient = (index: number, updates: Partial<Recipient>) => {
		const updated = [...(recipients || [])];
		updated[index] = { ...updated[index], ...updates };
		onChange(updated);
	};

	useEffect(() => {
		if (!recipients?.length) return;
		if (!recipients.some((r) => !r.clientRowId)) return;
		onChange(
			recipients.map((r) => ({
				...r,
				clientRowId: r.clientRowId ?? crypto.randomUUID(),
			})),
		);
	}, [recipients, onChange]);

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
