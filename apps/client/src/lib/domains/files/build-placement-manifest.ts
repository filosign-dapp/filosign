import type { PlacementManifest } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { placementManifestRect } from "@/src/lib/domains/files/placement-viewport";

export function buildPlacementManifestForDocument(args: {
	docId: string;
	/** Signer emails in routing order (normalized). */
	signerEmailsInOrder: string[];
	signatureFields: SignatureField[];
	docWidth: number;
	docHeight: number;
	fieldBox: { width: number; height: number };
	/**
	 * When `false`, returns an empty manifest instead of throwing (draft dirty/save
	 * before the user has placed fields). Defaults to strict send-time validation.
	 */
	strict?: boolean;
}): PlacementManifest {
	const {
		docId,
		signerEmailsInOrder,
		signatureFields,
		docWidth,
		docHeight,
		fieldBox,
		strict = true,
	} = args;
	const fw = Math.max(fieldBox.width, 1);
	const fh = Math.max(fieldBox.height, 1);

	const fieldsForDoc = signatureFields.filter((f) => f.documentId === docId);
	if (signerEmailsInOrder.length === 0 || fieldsForDoc.length === 0) {
		if (!strict) {
			return { version: 2, fields: [] };
		}
		if (signerEmailsInOrder.length === 0) {
			throw new Error("At least one signer email is required for placement");
		}
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
