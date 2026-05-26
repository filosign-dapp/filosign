import type { PlacementManifest } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { type Address, getAddress, isAddress } from "viem";
import { placementManifestRect } from "@/src/lib/domains/files/placement-viewport";
import { loadDocumentBytes } from "@/src/routes/dashboard/envelope/create/-lib/utils/envelope-draft";
import type { Recipient, StoredDocument } from "../../../-lib/types";
import type { SignatureField } from "../types";

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

/** Email-only recipient (no resolved wallet) — cold invite + passphrase path. */
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

export function buildPlacementManifestForDocument(args: {
	docId: string;
	/** Signer emails in routing order (normalized). */
	signerEmailsInOrder: string[];
	signatureFields: SignatureField[];
	docWidth: number;
	docHeight: number;
	fieldBox: { width: number; height: number };
}): PlacementManifest {
	const {
		docId,
		signerEmailsInOrder,
		signatureFields,
		docWidth,
		docHeight,
		fieldBox,
	} = args;
	const fw = Math.max(fieldBox.width, 1);
	const fh = Math.max(fieldBox.height, 1);

	if (signerEmailsInOrder.length === 0) {
		throw new Error("At least one signer email is required for placement");
	}

	const fieldsForDoc = signatureFields.filter((f) => f.documentId === docId);
	if (fieldsForDoc.length === 0) {
		throw new Error("Add at least one field to the document before sending");
	}

	const signerSet = new Set(
		signerEmailsInOrder.map((e) => normalizePlacementRecipientEmail(e)),
	);

	const manifestFields: PlacementManifest["fields"] = [];

	for (const field of fieldsForDoc) {
		const assigned = normalizePlacementRecipientEmail(
			field.assignedSignerEmail,
		);
		if (!signerSet.has(assigned)) {
			throw new Error(
				`Field ${field.id}: assigned signer email ${assigned} is not in this envelope's signer list`,
			);
		}

		manifestFields.push({
			id: field.id,
			pageIndex: Math.max(0, field.page - 1),
			rect: placementManifestRect({
				x: field.x,
				y: field.y,
				docWidth,
				docHeight,
				fieldWidth: fw,
				fieldHeight: fh,
			}),
			assignedRecipientEmail: assigned,
			required: field.required,
			type: field.type,
		});
	}

	return { version: 2, fields: manifestFields };
}

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
