import type { ProfileByAddress } from "@filosign/react/users";
import { parseHexString } from "@filosign/shared";
import type { Address, Hex } from "viem";
import { loadDocumentBytes } from "@/src/lib/domains/drafts";
import { buildPlacementManifestForDocument } from "@/src/lib/domains/files/build-placement-manifest";
import {
	isColdRecipient,
	recipientResolvedSignerAddress,
} from "@/src/lib/domains/placement/utils/recipient-address";
import type { Recipient, StoredDocument } from "../../../-lib/types";

export { isColdRecipient, recipientResolvedSignerAddress };

export const SendEnvelopeError = {
	MISSING_DRAFT_DOCUMENT: "MISSING_DRAFT_DOCUMENT",
} as const;

export type RecipientWithEncryptionProfile = {
	recipient: Recipient;
	profile: ProfileByAddress;
};

export type EnvelopeSigner = {
	address: Address;
	encryptionPublicKey: Hex;
};

export type EnvelopeViewer = {
	address: Address;
	encryptionPublicKey: Hex;
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
		const encryptionPublicKey = parseHexString(profile.encryptionPublicKey);

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
