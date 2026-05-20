import { useEnvelopeRecipientLimit } from "@filosign/react/billing";
import { useEffect, useMemo, useState } from "react";
import { useProfilesByEmails } from "@/src/lib/domains/users/hooks/use-profiles-by-emails";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import { useRecipients } from "@/src/routes/dashboard/envelope/create/-lib/context/envelope-draft-context";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";

function isValidEmail(email: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function useRecipientsController() {
	const { value: recipients, onChange, error, showError } = useRecipients();
	const { canAddRecipient } = useEnvelopeRecipientLimit();
	const promptPlanUpgrade = usePromptPlanUpgrade();

	const [lookupEmails, setLookupEmails] = useState<string[]>([]);

	useEffect(() => {
		const t = window.setTimeout(() => {
			const emails = (recipients ?? [])
				.map((r) => r.email.trim().toLowerCase())
				.filter((e) => isValidEmail(e));
			setLookupEmails(emails);
		}, 450);
		return () => window.clearTimeout(t);
	}, [recipients]);

	const profileBatch = useProfilesByEmails(lookupEmails);

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

	// Apply batched profile lookups to recipient rows
	useEffect(() => {
		if (!recipients?.length || profileBatch.isLoading) return;

		let changed = false;
		const next = recipients.map((recipient) => {
			const email = recipient.email.trim().toLowerCase();
			if (!email || !isValidEmail(email)) return recipient;

			const profile = profileBatch.byEmail.get(email);
			if (!profile) return recipient;

			const w = profile.walletAddress;
			const displayName = [profile.firstName, profile.lastName]
				.filter(Boolean)
				.join(" ")
				.trim();

			const patch: Partial<Recipient> = {};
			if (recipient.walletAddress !== w) patch.walletAddress = w;
			if (displayName && recipient.name !== displayName)
				patch.name = displayName;

			if (Object.keys(patch).length === 0) return recipient;
			changed = true;
			return { ...recipient, ...patch };
		});

		if (changed) onChange(next);
	}, [profileBatch.byEmail, profileBatch.isLoading, recipients, onChange]);

	const profileByEmail = useMemo(
		() => profileBatch.byEmail,
		[profileBatch.byEmail],
	);

	return {
		recipients,
		error,
		showError,
		addRecipient,
		removeRecipient,
		updateRecipient,
		profileByEmail,
	};
}

export type RecipientsController = ReturnType<typeof useRecipientsController>;
