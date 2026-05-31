import { type Address, getAddress, isAddress } from "viem";
import { loadDocumentBytes } from "@/src/lib/domains/drafts";
import { buildPlacementManifestForDocument } from "@/src/lib/domains/files/build-placement-manifest";
import type { Recipient, StoredDocument } from "../../../-lib/types";

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

export const SendEnvelopeError = {
	MISSING_DRAFT_DOCUMENT: "MISSING_DRAFT_DOCUMENT",
} as const;

export type RecipientWithEncryptionProfile = {
	recipient: Recipient;
	profile: { encryptionPublicKey: string; [key: string]: unknown };
};

export type EnvelopeSigner = {
	address: Address;
	encryptionPublicKey: `0x${string}`;
};

export type EnvelopeViewer = {
	address: Address;
	encryptionPublicKey: string;
};

export { buildPlacementManifestForDocument };

export async function loadDocumentFileBytes(
	draftId: string,
	doc: StoredDocument,
): Promise<Uint8Array> {
	return loadDocumentBytes(draftId, doc);
}

export function buildSignersAndViewersForDocument(args: {
	recipients: RecipientWithEncryptionProfile["recipient"][];
	recipientMap: Map<Address, RecipientWithEncryptionProfile>;
}): { signers: EnvelopeSigner[]; viewers: EnvelopeViewer[] } {
	const { recipients, recipientMap } = args;

	const signers: EnvelopeSigner[] = [];
	const viewers: EnvelopeViewer[] = [];

	for (const recipient of recipients) {
		const address = recipientResolvedSignerAddress(recipient);
		if (!address) continue;

		const recipientData = recipientMap.get(address);
		if (!recipientData) continue;

		const { profile } = recipientData;
		const encryptionPublicKey = profile.encryptionPublicKey as `0x${string}`;

		if (recipient.role === "signer") {
			signers.push({
				address,
				encryptionPublicKey,
			});
		} else {
			viewers.push({
				address,
				encryptionPublicKey,
			});
		}
	}

	return { signers, viewers };
}
