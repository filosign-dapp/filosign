import type { PlacementManifest, PlacementManifestV3 } from "@filosign/shared";
import {
	normalizePlacementRecipientEmail,
	sha256PlaintextHex,
} from "@filosign/shared";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";
import { placementManifestRect } from "@/src/lib/domains/files/placement-viewport";

export function buildPlacementManifestForDocument(args: {
	docId: string;
	signerEmailsInOrder: string[];
	signatureFields: SignatureField[];
	docWidth: number;
	docHeight: number;
	fieldBox: { width: number; height: number };
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

	const manifestFields: Array<{
		id: string;
		pageIndex: number;
		rect: PlacementManifestV3["fields"][number]["rect"];
		assignedRecipientEmail: string;
		required: boolean;
		type: PlacementManifestV3["fields"][number]["type"];
	}> = [];

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

export async function buildPlacementManifestV3ForEnvelope(args: {
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
}): Promise<PlacementManifestV3> {
	const {
		documents,
		signerEmailsInOrder,
		signatureFields,
		docLayouts,
		strict = true,
	} = args;

	const placementDocuments: PlacementManifestV3["documents"] =
		await Promise.all(
			documents.map(async (d) => ({
				id: d.id,
				name: d.name,
				sha256Plaintext: await sha256PlaintextHex(d.bytes),
				pageCount: d.pageCount,
			})),
		);

	const allFields: PlacementManifestV3["fields"] = [];

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
		if (partial.version === 2 && partial.fields.length > 0) {
			for (const f of partial.fields) {
				allFields.push({
					...f,
					documentId: doc.id,
				});
			}
		}
	}

	if (strict && (signerEmailsInOrder.length === 0 || allFields.length === 0)) {
		if (signerEmailsInOrder.length === 0) {
			throw new Error("At least one signer email is required for placement");
		}
		throw new Error("Add at least one field across documents before sending");
	}

	return {
		version: 3,
		documents: placementDocuments,
		fields: allFields,
	};
}
