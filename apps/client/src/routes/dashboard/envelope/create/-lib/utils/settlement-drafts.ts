import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements/attachment-draft";

export function getDraftForRecipient(
	drafts: SettlementAttachmentDraft[],
	clientRowId: string,
): SettlementAttachmentDraft | undefined {
	return drafts.find((d) => d.recipientClientRowId === clientRowId);
}

export function upsertRecipientDraft(
	drafts: SettlementAttachmentDraft[],
	draft: SettlementAttachmentDraft,
): SettlementAttachmentDraft[] {
	const without = drafts.filter(
		(d) => d.recipientClientRowId !== draft.recipientClientRowId,
	);
	return [...without, draft];
}

export function removeDraftForRecipient(
	drafts: SettlementAttachmentDraft[],
	clientRowId: string,
): SettlementAttachmentDraft[] {
	return drafts.filter((d) => d.recipientClientRowId !== clientRowId);
}

export function removeDraftsForRemovedRecipients(
	drafts: SettlementAttachmentDraft[],
	recipients: Recipient[],
): SettlementAttachmentDraft[] {
	const ids = new Set(
		recipients.map((r) => r.clientRowId).filter((id): id is string => !!id),
	);
	return drafts.filter((d) => ids.has(d.recipientClientRowId));
}

export function recipientSettlementLabel(recipient: Recipient): string {
	const email = recipient.email?.trim();
	const name = recipient.name?.trim();
	if (name && email) return `${name} (${email})`;
	return name || email || "Recipient";
}

export function buildDraftFromRecipient(
	recipient: Recipient,
	patch: Omit<
		SettlementAttachmentDraft,
		| "id"
		| "recipientClientRowId"
		| "recipientEmail"
		| "recipientSource"
		| "recipientLabel"
	> & { id?: string },
): SettlementAttachmentDraft | null {
	const clientRowId = recipient.clientRowId;
	const rawEmail = recipient.email?.trim();
	if (!clientRowId || !rawEmail) return null;

	return {
		id: patch.id ?? crypto.randomUUID(),
		recipientClientRowId: clientRowId,
		recipientEmail: normalizePlacementRecipientEmail(rawEmail),
		recipientSource: recipient.role === "viewer" ? "viewer" : "signer",
		recipientLabel: recipientSettlementLabel(recipient),
		amountUsdc: patch.amountUsdc,
		releaseType: patch.releaseType,
		specificSignerEmail: patch.specificSignerEmail,
		thresholdN: patch.thresholdN,
		recipientWallet: patch.recipientWallet,
		expiresAtUnix: patch.expiresAtUnix,
	};
}
