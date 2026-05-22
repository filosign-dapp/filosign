import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import type { PaymentAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/payment-attachment";

export function getDraftForRecipient(
	drafts: PaymentAttachmentDraft[],
	clientRowId: string,
): PaymentAttachmentDraft | undefined {
	return drafts.find((d) => d.recipientClientRowId === clientRowId);
}

export function upsertRecipientDraft(
	drafts: PaymentAttachmentDraft[],
	draft: PaymentAttachmentDraft,
): PaymentAttachmentDraft[] {
	const without = drafts.filter(
		(d) => d.recipientClientRowId !== draft.recipientClientRowId,
	);
	return [...without, draft];
}

export function removeDraftForRecipient(
	drafts: PaymentAttachmentDraft[],
	clientRowId: string,
): PaymentAttachmentDraft[] {
	return drafts.filter((d) => d.recipientClientRowId !== clientRowId);
}

export function removeDraftsForRemovedRecipients(
	drafts: PaymentAttachmentDraft[],
	recipients: Recipient[],
): PaymentAttachmentDraft[] {
	const ids = new Set(
		recipients.map((r) => r.clientRowId).filter((id): id is string => !!id),
	);
	return drafts.filter((d) => ids.has(d.recipientClientRowId));
}

export function recipientPaymentLabel(recipient: Recipient): string {
	const email = recipient.email?.trim();
	const name = recipient.name?.trim();
	if (name && email) return `${name} (${email})`;
	return name || email || "Recipient";
}

export function buildDraftFromRecipient(
	recipient: Recipient,
	patch: Omit<
		PaymentAttachmentDraft,
		| "id"
		| "recipientClientRowId"
		| "recipientEmail"
		| "recipientSource"
		| "recipientLabel"
	> & { id?: string },
): PaymentAttachmentDraft | null {
	const clientRowId = recipient.clientRowId;
	const rawEmail = recipient.email?.trim();
	if (!clientRowId || !rawEmail) return null;

	return {
		id: patch.id ?? crypto.randomUUID(),
		recipientClientRowId: clientRowId,
		recipientEmail: normalizePlacementRecipientEmail(rawEmail),
		recipientSource: recipient.role === "viewer" ? "viewer" : "signer",
		recipientLabel: recipientPaymentLabel(recipient),
		amountUsdc: patch.amountUsdc,
		releaseType: patch.releaseType,
		specificSignerEmail: patch.specificSignerEmail,
		thresholdN: patch.thresholdN,
		recipientWallet: patch.recipientWallet,
	};
}
