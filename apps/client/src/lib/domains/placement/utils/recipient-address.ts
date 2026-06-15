import { type Address, getAddress, isAddress } from "viem";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";

export function recipientResolvedSignerAddress(
	recipient: Pick<Recipient, "walletAddress">,
): Address | null {
	const w = recipient.walletAddress?.trim();
	if (!w || !isAddress(w)) return null;
	try {
		return getAddress(w);
	} catch {
		return null;
	}
}

/** Email-only recipient (no resolved wallet) - cold invite + passphrase path. */
export function isColdRecipient(recipient: Recipient): boolean {
	const email = recipient.email?.trim();
	if (!email) return false;
	return recipientResolvedSignerAddress(recipient) === null;
}
