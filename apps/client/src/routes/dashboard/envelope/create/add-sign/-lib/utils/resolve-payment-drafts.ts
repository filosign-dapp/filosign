import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { getAddress, isAddress } from "viem";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import type { PaymentAttachmentDraft } from "@/src/routes/dashboard/envelope/create/-lib/types/payment-attachment";

export type ProfileLookupResult = {
	walletAddress: string;
} | null;

export async function resolvePaymentDraftsForSend(args: {
	drafts: PaymentAttachmentDraft[];
	recipients: Recipient[];
	lookupProfile: (query: string) => Promise<ProfileLookupResult>;
}): Promise<PaymentAttachmentDraft[]> {
	const { drafts, recipients, lookupProfile } = args;

	const active = drafts.filter(
		(d) => d.amountUsdc.trim() && Number(d.amountUsdc) > 0,
	);
	if (active.length === 0) return [];

	const resolved: PaymentAttachmentDraft[] = [];

	for (const draft of active) {
		const recipient = recipients.find(
			(r) => r.clientRowId === draft.recipientClientRowId,
		);
		const email = (
			recipient?.email?.trim()
				? normalizePlacementRecipientEmail(recipient.email.trim())
				: draft.recipientEmail
		).toLowerCase();

		let wallet = draft.recipientWallet;
		const onRecipient = recipient?.walletAddress?.trim();
		if (onRecipient && isAddress(onRecipient)) {
			wallet = getAddress(onRecipient);
		} else if (!wallet) {
			const profile = await lookupProfile(email);
			if (!profile?.walletAddress || !isAddress(profile.walletAddress)) {
				throw new Error(
					`Cannot attach USDC payout to ${draft.recipientLabel}: they need a Filosign account with a linked wallet, or send as an invite-only recipient without payment.`,
				);
			}
			wallet = getAddress(profile.walletAddress);
		}

		resolved.push({
			...draft,
			recipientEmail: email,
			recipientWallet: wallet,
			recipientLabel: recipient ? draft.recipientLabel : draft.recipientLabel,
		});
	}

	return resolved;
}
