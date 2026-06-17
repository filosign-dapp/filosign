import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { getAddress, isAddress } from "viem";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements";

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
		(d) =>
			d.recipientClientRowId && d.amountUsdc.trim() && Number(d.amountUsdc) > 0,
	);
	if (active.length === 0) return [];

	return Promise.all(
		active.map(async (draft) => {
			const recipient = draft.recipientClientRowId
				? recipients.find((r) => r.clientRowId === draft.recipientClientRowId)
				: undefined;

			const email = recipient?.email?.trim()
				? normalizePlacementRecipientEmail(recipient.email.trim())
				: draft.recipientEmail?.trim()
					? normalizePlacementRecipientEmail(draft.recipientEmail.trim())
					: undefined;

			let wallet = draft.recipientWallet;
			if (wallet && isAddress(wallet)) {
				wallet = getAddress(wallet);
			} else {
				const onRecipient = recipient?.walletAddress?.trim();
				if (onRecipient && isAddress(onRecipient)) {
					wallet = getAddress(onRecipient);
				} else if (email) {
					const profile = await lookupProfile(email);
					if (!profile?.walletAddress || !isAddress(profile.walletAddress)) {
						throw new Error(
							`Cannot attach USDC settlement to ${draft.recipientLabel}: they need a Filosign account with a linked wallet, or send as an invite-only recipient without settlement.`,
						);
					}
					wallet = getAddress(profile.walletAddress);
				} else {
					throw new Error(
						`Cannot attach USDC settlement to ${draft.recipientLabel}: wallet address is missing or invalid.`,
					);
				}
			}

			let recipientSource = draft.recipientSource;
			if (!draft.recipientClientRowId) {
				const participant = recipients.find((r) => {
					const addr = r.walletAddress?.trim();
					return addr && isAddress(addr) && getAddress(addr) === wallet;
				});
				if (participant) {
					recipientSource = participant.role === "viewer" ? "viewer" : "signer";
				}
			}

			return {
				...draft,
				...(email ? { recipientEmail: email } : {}),
				recipientWallet: wallet,
				recipientLabel: draft.recipientLabel,
				recipientSource,
			};
		}),
	);
}
