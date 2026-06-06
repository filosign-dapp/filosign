import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { getAddress, isAddress } from "viem";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements/attachment-draft";

export type ProfileLookupResult = {
	walletAddress: string;
} | null;

export async function resolveSettlementDraftsForSend(args: {
	drafts: SettlementAttachmentDraft[];
	recipients: Recipient[];
	lookupProfile: (query: string) => Promise<ProfileLookupResult>;
}): Promise<SettlementAttachmentDraft[]> {
	const { drafts, recipients, lookupProfile } = args;

	const active = drafts.filter(
		(d) => d.amountUsdc.trim() && Number(d.amountUsdc) > 0,
	);
	if (active.length === 0) return [];

	return Promise.all(
		active.map(async (draft) => {
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
						`Cannot attach USDC settlement to ${draft.recipientLabel}: they need a Filosign account with a linked wallet, or send as an invite-only recipient without settlement.`,
					);
				}
				wallet = getAddress(profile.walletAddress);
			}

			return {
				...draft,
				recipientEmail: email,
				recipientWallet: wallet,
				recipientLabel: draft.recipientLabel,
			};
		}),
	);
}
