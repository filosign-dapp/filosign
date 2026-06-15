import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { type Address, getAddress, isAddress } from "viem";
import { recipientResolvedSignerAddress } from "@/src/lib/domains/placement/utils/recipient-address";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";

export type RecipientProfileLookup = (
	email: string,
) => Promise<{ walletAddress?: string | null } | null>;

export async function resolveRecipientWallets(args: {
	recipients: Recipient[];
	lookupProfile: RecipientProfileLookup;
	selfEmail?: string | null;
	selfWallet?: Address | null;
}): Promise<Recipient[]> {
	const selfEmail = args.selfEmail?.trim()
		? normalizePlacementRecipientEmail(args.selfEmail)
		: null;
	const selfWallet =
		args.selfWallet && isAddress(args.selfWallet)
			? getAddress(args.selfWallet)
			: null;

	return Promise.all(
		args.recipients.map(async (recipient) => {
			if (recipientResolvedSignerAddress(recipient)) {
				return recipient;
			}

			const rawEmail = recipient.email?.trim();
			if (!rawEmail) return recipient;

			const email = normalizePlacementRecipientEmail(rawEmail);

			if (selfEmail && email === selfEmail && selfWallet) {
				return { ...recipient, walletAddress: selfWallet };
			}

			try {
				const profile = await args.lookupProfile(email);
				const wallet = profile?.walletAddress?.trim();
				if (wallet && isAddress(wallet)) {
					return { ...recipient, walletAddress: getAddress(wallet) };
				}
			} catch {
				/* unknown recipient stays cold */
			}

			return recipient;
		}),
	);
}
