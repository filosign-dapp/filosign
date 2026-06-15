import {
	sha256PlaintextHex,
	type TemplatePrepareUpdateDocumentRow,
} from "@filosign/shared";
import { loadDocumentBytes } from "@/src/lib/domains/drafts";
import type { CreateForm } from "@/src/lib/domains/files/envelope-form-types";

export async function templateDocumentMetaFromCreateForm(args: {
	createForm: CreateForm;
}): Promise<TemplatePrepareUpdateDocumentRow[]> {
	return Promise.all(
		args.createForm.documents.map(async (doc) => {
			if (doc.plaintextSha256) {
				return {
					docId: doc.id,
					name: doc.name,
					size: doc.size,
					mimeType: doc.type,
					plaintextSha256: doc.plaintextSha256,
				};
			}

			const bytes = await loadDocumentBytes(args.createForm.draftId, {
				id: doc.id,
				name: doc.name,
				size: doc.size,
				type: doc.type,
			});
			return {
				docId: doc.id,
				name: doc.name,
				size: doc.size,
				mimeType: doc.type,
				plaintextSha256: await sha256PlaintextHex(bytes),
			};
		}),
	);
}

export function loadTemplateDocumentBytes(args: { createForm: CreateForm }) {
	return async (docId: string): Promise<Uint8Array> => {
		const doc = args.createForm.documents.find((row) => row.id === docId);
		if (!doc) {
			throw new Error(`Missing template document ${docId}`);
		}
		return loadDocumentBytes(args.createForm.draftId, {
			id: doc.id,
			name: doc.name,
			size: doc.size,
			type: doc.type,
		});
	};
}
