import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { isValidRecipientEmail } from "@/src/lib/domains/invites/recipient-email";
import { recipientResolvedSignerAddress } from "@/src/lib/domains/placement/utils/recipient-address";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";

export type SelfProfileForRoster = {
	email?: string | null;
	walletAddress?: string | null;
	firstName?: string | null;
	lastName?: string | null;
};

/** Recipient row matches the signed-in user (email or wallet). */
export function recipientMatchesSelfProfile(
	recipient: Recipient,
	selfProfile: SelfProfileForRoster | null | undefined,
): boolean {
	if (!selfProfile) return false;

	const selfEmail = selfProfile.email?.trim()
		? normalizePlacementRecipientEmail(selfProfile.email)
		: null;
	const selfWallet = selfProfile.walletAddress?.trim()?.toLowerCase() ?? null;

	const raw = recipient.email?.trim();
	if (raw && isValidRecipientEmail(raw)) {
		const email = normalizePlacementRecipientEmail(raw);
		if (selfEmail && email === selfEmail) return true;
	}

	const wallet =
		recipientResolvedSignerAddress(recipient)?.toLowerCase() ?? null;
	if (selfWallet && wallet === selfWallet) return true;

	return false;
}

/** Self as a signer on the envelope roster (email or wallet match). */
export function resolveSelfSignerOnRoster(
	recipients: Recipient[],
	selfProfile:
		| { email?: string | null; walletAddress?: string | null }
		| null
		| undefined,
): { email: string; recipient: Recipient } | null {
	if (!selfProfile) return null;

	const selfEmail = selfProfile.email?.trim()
		? normalizePlacementRecipientEmail(selfProfile.email)
		: null;
	const selfWallet = selfProfile.walletAddress?.trim()?.toLowerCase() ?? null;

	for (const recipient of recipients) {
		if (recipient.role !== "signer") continue;
		const raw = recipient.email?.trim();
		if (!raw || !isValidRecipientEmail(raw)) continue;
		const email = normalizePlacementRecipientEmail(raw);
		const wallet =
			recipientResolvedSignerAddress(recipient)?.toLowerCase() ?? null;

		if (selfEmail && email === selfEmail) {
			return { email, recipient };
		}
		if (selfWallet && wallet === selfWallet) {
			return { email, recipient };
		}
	}

	return null;
}
