import {
	type TemplateSnapshot,
	templateDocumentStorageKey,
} from "@filosign/shared";
import type { Hex } from "viem";
import {
	encryptTemplateDocument,
	generateTemplateDek,
	wrapTemplateDekForOrg,
} from "./template-crypto";

export type SaveTemplateDocumentInput = {
	docId: string;
	name: string;
	size: number;
	mimeType: string;
	bytes: Uint8Array;
};

export async function uploadOrgTemplateDocuments(args: {
	templateId: string;
	organizationId: string;
	orgEncryptionPublicKey: Hex;
	name: string;
	snapshot: TemplateSnapshot;
	documents: SaveTemplateDocumentInput[];
	prepareCreate: (body: { templateId: string; docIds: string[] }) => Promise<{
		documents: Array<{ docId: string; s3Key: string; uploadUrl: string }>;
	}>;
	create: (body: {
		templateId: string;
		name: string;
		headDekWrappedOmk: Hex;
		headOmkKemCiphertext: Hex;
		snapshot: TemplateSnapshot;
		documents: Array<{
			docId: string;
			s3Key: string;
			name: string;
			size: number;
			mimeType: string;
		}>;
	}) => Promise<unknown>;
}): Promise<void> {
	const dek = generateTemplateDek();
	const wrapped = await wrapTemplateDekForOrg({
		dek,
		templateId: args.templateId,
		orgEncryptionPublicKey: args.orgEncryptionPublicKey,
	});

	const prepared = await args.prepareCreate({
		templateId: args.templateId,
		docIds: args.documents.map((doc) => doc.docId),
	});
	const uploadByDocId = new Map(
		prepared.documents.map((row) => [row.docId, row.uploadUrl]),
	);

	for (const doc of args.documents) {
		const uploadUrl = uploadByDocId.get(doc.docId);
		if (!uploadUrl) {
			throw new Error(`Missing upload URL for document ${doc.docId}`);
		}
		const ciphertext = await encryptTemplateDocument({
			dek,
			templateId: args.templateId,
			docId: doc.docId,
			bytes: doc.bytes,
		});
		const putRes = await fetch(uploadUrl, {
			method: "PUT",
			body: new Blob([Uint8Array.from(ciphertext)]),
			headers: {
				"Content-Type": "application/octet-stream",
			},
		});
		if (!putRes.ok) {
			throw new Error(`Failed to upload template document ${doc.name}`);
		}
	}

	await args.create({
		templateId: args.templateId,
		name: args.name,
		headDekWrappedOmk: wrapped.encryptedDek,
		headOmkKemCiphertext: wrapped.kemCiphertext,
		snapshot: args.snapshot,
		documents: args.documents.map((doc) => ({
			docId: doc.docId,
			s3Key: templateDocumentStorageKey({
				organizationId: args.organizationId,
				templateId: args.templateId,
				docId: doc.docId,
			}),
			name: doc.name,
			size: doc.size,
			mimeType: doc.mimeType,
		})),
	});
}
