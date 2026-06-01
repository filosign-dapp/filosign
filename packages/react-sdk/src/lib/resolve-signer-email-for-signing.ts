import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type { Address } from "viem";
import { getAddress } from "viem";

export function resolveSignerEmailForSigning(args: {
	signerWallet: Address;
	senderWallet: Address;
	fileSigners: { wallet: Address; email: string | null }[];
	profileEmail?: string | null;
	manifestAssignedEmails?: string[];
}): string | null {
	const signerNorm = getAddress(args.signerWallet);

	const fromRoster = args.fileSigners.find(
		(s) => getAddress(s.wallet) === signerNorm,
	)?.email;
	if (fromRoster?.trim()) {
		return normalizePlacementRecipientEmail(fromRoster);
	}

	const profileRaw = args.profileEmail?.trim();
	if (!profileRaw) return null;
	const profileEmail = normalizePlacementRecipientEmail(profileRaw);

	const isSender = signerNorm === getAddress(args.senderWallet);
	if (!isSender) return null;

	const assigned = args.manifestAssignedEmails ?? [];
	if (assigned.includes(profileEmail)) {
		return profileEmail;
	}

	return null;
}
