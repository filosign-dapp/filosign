import type {
	DraftPlacementManifest,
	PlacementField,
	PlacementManifest,
} from "@filosign/shared";
import {
	normalizePlacementRecipientEmail,
	sha256PlaintextHex,
} from "@filosign/shared";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { placementManifestRectFromField } from "@/src/lib/domains/files/placement-viewport";

export function buildPlacementManifestForDocument(args: {
	docId: string;
	signerEmailsInOrder: string[];
	signatureFields: SignatureField[];
	docWidth: number;
	docHeight: number;
	fieldBox: { width: number; height: number };
	strict?: boolean;
}): DraftPlacementManifest {
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
			return { version: 1, documents: [], fields: [] };
		}
		if (signerEmailsInOrder.length === 0) {
			throw new Error("At least one signer email is required for placement");
		}
		throw new Error("Add at least one field to the document before sending");
	}

	const signerSet = new Set(
		signerEmailsInOrder.map((e) => normalizePlacementRecipientEmail(e)),
	);

	const manifestFields: PlacementField[] = [];

	for (const field of fieldsForDoc) {
		const assigned = normalizePlacementRecipientEmail(
			field.assignedSignerEmail,
		);
		if (!signerSet.has(assigned)) {
			throw new Error(
				`Field ${field.id}: assigned signer email ${assigned} is not in this envelope's signer list`,
			);
		}

		const fieldW = Math.max(field.width ?? fw, 1);
		const fieldH = Math.max(field.height ?? fh, 1);

		manifestFields.push({
			id: field.id,
			documentId: docId,
			pageIndex: Math.max(0, field.page - 1),
			rect: placementManifestRectFromField({
				x: field.x,
				y: field.y,
				width: fieldW,
				height: fieldH,
				docWidth,
				docHeight,
			}),
			assignedRecipientEmail: assigned,
			required: field.required,
			type: field.type,
		});
	}

	return { version: 1, documents: [], fields: manifestFields };
}

export async function buildPlacementManifestForEnvelope(args: {
	documents: {
		id: string;
		name: string;
		bytes: Uint8Array;
		pageCount: number;
	}[];
	signerEmailsInOrder: string[];
	signatureFields: SignatureField[];
	docLayouts: Map<
		string,
		{
			docWidth: number;
			docHeight: number;
			fieldBox: { width: number; height: number };
		}
	>;
	strict?: boolean;
}): Promise<PlacementManifest> {
	const {
		documents,
		signerEmailsInOrder,
		signatureFields,
		docLayouts,
		strict = true,
	} = args;

	const placementDocuments: PlacementManifest["documents"] = await Promise.all(
		documents.map(async (d) => ({
			id: d.id,
			name: d.name,
			sha256Plaintext: await sha256PlaintextHex(d.bytes),
			pageCount: d.pageCount,
		})),
	);

	const allFields: PlacementField[] = [];

	for (const doc of documents) {
		const layout = docLayouts.get(doc.id);
		if (!layout) {
			throw new Error(`Missing layout for document ${doc.id}`);
		}
		const partial = buildPlacementManifestForDocument({
			docId: doc.id,
			signerEmailsInOrder,
			signatureFields,
			docWidth: layout.docWidth,
			docHeight: layout.docHeight,
			fieldBox: layout.fieldBox,
			strict,
		});
		if (partial.fields.length > 0) {
			allFields.push(...partial.fields);
		}
	}

	if (strict && (signerEmailsInOrder.length === 0 || allFields.length === 0)) {
		if (signerEmailsInOrder.length === 0) {
			throw new Error("At least one signer email is required for placement");
		}
		throw new Error("Add at least one field across documents before sending");
	}

	return {
		version: 1,
		documents: placementDocuments,
		fields: allFields,
	};
}
