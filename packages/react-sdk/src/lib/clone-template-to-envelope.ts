import type { TemplateSnapshot } from "@filosign/shared";
import type { Address, Hex } from "viem";
import { decryptTemplateDocument, resolveTemplateDek } from "./template-crypto";

export type CloneTemplateDocument = {
	docId: string;
	name: string;
	mimeType: string;
	downloadUrl: string;
};

export async function cloneTemplateDocumentsToPlaintext(args: {
	templateId: string;
	headDekWrappedOmk: Hex;
	headOmkKemCiphertext: Hex;
	wallet: Address;
	myOrgWrap: { wrappedOmk: Hex; wrapKemCiphertext: Hex };
	documents: CloneTemplateDocument[];
}): Promise<
	Array<{
		id: string;
		name: string;
		type: string;
		bytes: Uint8Array;
	}>
> {
	const dek = await resolveTemplateDek({
		templateId: args.templateId,
		headDekWrappedOmk: args.headDekWrappedOmk,
		headOmkKemCiphertext: args.headOmkKemCiphertext,
		wallet: args.wallet,
		myOrgWrap: args.myOrgWrap,
	});

	const out: Array<{
		id: string;
		name: string;
		type: string;
		bytes: Uint8Array;
	}> = [];

	for (const doc of args.documents) {
		const dl = await fetch(doc.downloadUrl);
		if (!dl.ok) {
			throw new Error(`Failed to download template document ${doc.name}`);
		}
		const bytes = await decryptTemplateDocument({
			dek,
			templateId: args.templateId,
			docId: doc.docId,
			ciphertext: new Uint8Array(await dl.arrayBuffer()),
		});
		out.push({
			id: doc.docId,
			name: doc.name,
			type: doc.mimeType,
			bytes,
		});
	}

	return out;
}

export type CloneTemplateToEnvelopeResult = {
	snapshotJson: TemplateSnapshot;
	documents: Array<{
		id: string;
		name: string;
		type: string;
		bytes: Uint8Array;
	}>;
};

export async function fetchCloneTemplatePayload(args: {
	templateId: string;
	headDekWrappedOmk: Hex;
	headOmkKemCiphertext: Hex;
	snapshotJson: TemplateSnapshot;
	wallet: Address;
	myOrgWrap: { wrappedOmk: Hex; wrapKemCiphertext: Hex };
	documents: CloneTemplateDocument[];
}): Promise<CloneTemplateToEnvelopeResult> {
	const documents = await cloneTemplateDocumentsToPlaintext(args);
	return {
		snapshotJson: args.snapshotJson,
		documents,
	};
}
