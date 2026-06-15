import type { TemplatePlaintextSha256 } from "@filosign/shared";
import { sha256PlaintextHex } from "@filosign/shared";
import type { Address, Hex } from "viem";
import { decryptTemplateDocument, resolveTemplateDek } from "./template-crypto";
import { setCachedTemplateDek } from "./template-dek-cache";

export type CloneTemplateDocument = {
	docId: string;
	name: string;
	mimeType: string;
	downloadUrl: string;
	plaintextSha256: TemplatePlaintextSha256;
};

export async function cloneTemplateDocumentsToPlaintext(args: {
	templateId: string;
	headDekWrappedOmk: Hex;
	headOmkKemCiphertext: Hex;
	wallet: Address;
	myOrgWrap: { wrappedOmk: Hex; wrapKemCiphertext: Hex };
	documents: CloneTemplateDocument[];
	loadLocalBytes?: (docId: string) => Promise<Uint8Array | null>;
}): Promise<
	Array<{
		id: string;
		name: string;
		type: string;
		bytes: Uint8Array;
		plaintextSha256: TemplatePlaintextSha256;
	}>
> {
	const dek = await resolveTemplateDek({
		templateId: args.templateId,
		headDekWrappedOmk: args.headDekWrappedOmk,
		headOmkKemCiphertext: args.headOmkKemCiphertext,
		wallet: args.wallet,
		myOrgWrap: args.myOrgWrap,
	});
	setCachedTemplateDek(args.templateId, args.wallet, dek);

	const out: Array<{
		id: string;
		name: string;
		type: string;
		bytes: Uint8Array;
		plaintextSha256: TemplatePlaintextSha256;
	}> = [];

	for (const doc of args.documents) {
		if (args.loadLocalBytes) {
			const localBytes = await args.loadLocalBytes(doc.docId);
			if (localBytes) {
				const digest = await sha256PlaintextHex(localBytes);
				if (digest === doc.plaintextSha256) {
					out.push({
						id: doc.docId,
						name: doc.name,
						type: doc.mimeType,
						bytes: localBytes,
						plaintextSha256: digest,
					});
					continue;
				}
			}
		}

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
		const digest = await sha256PlaintextHex(bytes);
		if (digest !== doc.plaintextSha256) {
			throw new Error(`Template document digest mismatch for ${doc.name}`);
		}
		out.push({
			id: doc.docId,
			name: doc.name,
			type: doc.mimeType,
			bytes,
			plaintextSha256: digest,
		});
	}

	return out;
}

export type CloneTemplateToEnvelopeResult = {
	snapshotJson: import("@filosign/shared").TemplateSnapshot;
	documents: Array<{
		id: string;
		name: string;
		type: string;
		bytes: Uint8Array;
		plaintextSha256: TemplatePlaintextSha256;
	}>;
};

export async function fetchCloneTemplatePayload(args: {
	templateId: string;
	headDekWrappedOmk: Hex;
	headOmkKemCiphertext: Hex;
	snapshotJson: import("@filosign/shared").TemplateSnapshot;
	wallet: Address;
	myOrgWrap: { wrappedOmk: Hex; wrapKemCiphertext: Hex };
	documents: CloneTemplateDocument[];
	loadLocalBytes?: (docId: string) => Promise<Uint8Array | null>;
}): Promise<CloneTemplateToEnvelopeResult> {
	const documents = await cloneTemplateDocumentsToPlaintext(args);
	return {
		snapshotJson: args.snapshotJson,
		documents,
	};
}
