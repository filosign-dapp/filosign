import {
	type TemplatePlaintextSha256,
	type TemplatePrepareUpdateDocumentRow,
	type TemplateSnapshot,
	templateDocumentStorageKey,
} from "@filosign/shared";
import type { Hex } from "viem";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { walletAccountAddress } from "../../utils/evm";
import {
	decryptTemplateDekFromOrgHead,
	encryptTemplateDocument,
	generateTemplateDek,
	wrapTemplateDekForOrg,
} from "../template-crypto";
import {
	getCachedTemplateDek,
	setCachedTemplateDek,
} from "../template-dek-cache";
import type { FilosignWallet } from "../wallet";

type PreparedTemplateDocument = {
	docId: string;
	s3Key: string;
	needsUpload: boolean;
	uploadUrl?: string;
};

type UploadedTemplateDocumentRow = {
	docId: string;
	s3Key: string;
	name: string;
	size: number;
	mimeType: string;
	plaintextSha256: TemplatePlaintextSha256;
};

export type SaveOrgTemplateInput = {
	templateId: string;
	organizationId: string;
	orgEncryptionPublicKey: Hex;
	name: string;
	snapshot: TemplateSnapshot;
	documents: TemplatePrepareUpdateDocumentRow[];
	loadDocumentBytes: (docId: string) => Promise<Uint8Array>;
};

export type SaveOrgTemplateDeps = {
	wallet: FilosignWallet;
	prepareCreate: AppRouterClient["orgs"]["templates"]["prepareCreate"];
	create: AppRouterClient["orgs"]["templates"]["create"];
	prepareUpdate: AppRouterClient["orgs"]["templates"]["prepareUpdate"];
	update: AppRouterClient["orgs"]["templates"]["update"];
	fetchTemplateHead: (
		templateId: string,
	) => ReturnType<AppRouterClient["orgs"]["templates"]["get"]>;
	wrapForMine: (
		organizationId: string,
	) => ReturnType<AppRouterClient["orgs"]["keys"]["wrapForMine"]>;
};

export function createSaveOrgTemplateDeps(args: {
	wallet: FilosignWallet;
	rpc: AppRouterClient;
}): SaveOrgTemplateDeps {
	const { wallet, rpc } = args;
	return {
		wallet,
		prepareCreate: (body) => rpc.orgs.templates.prepareCreate(body),
		create: (body) => rpc.orgs.templates.create(body),
		prepareUpdate: (body) => rpc.orgs.templates.prepareUpdate(body),
		update: (body) => rpc.orgs.templates.update(body),
		fetchTemplateHead: (templateId) => rpc.orgs.templates.get({ templateId }),
		wrapForMine: (organizationId) =>
			rpc.orgs.keys.wrapForMine({ organizationId }),
	};
}

function withTemplateDocumentStorageKeys(args: {
	organizationId: string;
	templateId: string;
	documents: UploadedTemplateDocumentRow[];
}): UploadedTemplateDocumentRow[] {
	return args.documents.map((doc) => ({
		...doc,
		s3Key:
			doc.s3Key ||
			templateDocumentStorageKey({
				organizationId: args.organizationId,
				templateId: args.templateId,
				docId: doc.docId,
			}),
	}));
}

async function uploadTemplateDocumentRow(args: {
	dek: Uint8Array;
	templateId: string;
	doc: TemplatePrepareUpdateDocumentRow;
	slot: PreparedTemplateDocument | undefined;
	loadDocumentBytes: (docId: string) => Promise<Uint8Array>;
}): Promise<UploadedTemplateDocumentRow> {
	const row = {
		docId: args.doc.docId,
		s3Key: args.slot?.s3Key ?? "",
		name: args.doc.name,
		size: args.doc.size,
		mimeType: args.doc.mimeType,
		plaintextSha256: args.doc.plaintextSha256,
	};

	if (!args.slot?.needsUpload || !args.slot.uploadUrl) {
		if (!row.s3Key) {
			throw new Error(`Missing s3Key for document ${args.doc.docId}`);
		}
		return row;
	}

	const bytes = await args.loadDocumentBytes(args.doc.docId);
	const ciphertext = await encryptTemplateDocument({
		dek: args.dek,
		templateId: args.templateId,
		docId: args.doc.docId,
		bytes,
	});
	const putRes = await fetch(args.slot.uploadUrl, {
		method: "PUT",
		body: new Blob([Uint8Array.from(ciphertext)]),
		headers: {
			"Content-Type": "application/octet-stream",
		},
	});
	if (!putRes.ok) {
		throw new Error(`Failed to upload template document ${args.doc.name}`);
	}

	return {
		...row,
		s3Key: args.slot.s3Key,
	};
}

async function uploadPreparedTemplateDocuments(args: {
	dek: Uint8Array;
	input: SaveOrgTemplateInput;
	preparedDocuments: PreparedTemplateDocument[];
}): Promise<UploadedTemplateDocumentRow[]> {
	const slotByDocId = new Map(
		args.preparedDocuments.map((slot) => [slot.docId, slot]),
	);

	const uploadedRows = await Promise.all(
		args.input.documents.map((doc) =>
			uploadTemplateDocumentRow({
				dek: args.dek,
				templateId: args.input.templateId,
				doc,
				slot: slotByDocId.get(doc.docId),
				loadDocumentBytes: args.input.loadDocumentBytes,
			}),
		),
	);

	return withTemplateDocumentStorageKeys({
		organizationId: args.input.organizationId,
		templateId: args.input.templateId,
		documents: uploadedRows,
	});
}

export async function saveOrgTemplateCreate(
	deps: SaveOrgTemplateDeps,
	input: SaveOrgTemplateInput,
): Promise<
	Awaited<ReturnType<AppRouterClient["orgs"]["templates"]["create"]>>
> {
	const dek = generateTemplateDek();
	const wrapped = await wrapTemplateDekForOrg({
		dek,
		templateId: input.templateId,
		orgEncryptionPublicKey: input.orgEncryptionPublicKey,
	});

	const prepared = await deps.prepareCreate({
		templateId: input.templateId,
		docIds: input.documents.map((doc) => doc.docId),
	});

	const walletAddress = walletAccountAddress(deps.wallet.account);
	setCachedTemplateDek(input.templateId, walletAddress, dek);

	return deps.create({
		templateId: input.templateId,
		name: input.name,
		headDekWrappedOmk: wrapped.encryptedDek,
		headOmkKemCiphertext: wrapped.kemCiphertext,
		snapshot: input.snapshot,
		documents: await uploadPreparedTemplateDocuments({
			dek,
			input,
			preparedDocuments: prepared.documents,
		}),
	});
}

async function resolveTemplateDekForUpdate(args: {
	deps: SaveOrgTemplateDeps;
	input: SaveOrgTemplateInput;
}): Promise<Uint8Array> {
	const walletAddress = walletAccountAddress(args.deps.wallet.account);
	const cachedDek = getCachedTemplateDek(args.input.templateId, walletAddress);
	if (cachedDek) {
		return cachedDek;
	}

	const existing = await args.deps.fetchTemplateHead(args.input.templateId);
	const myWrap = await args.deps.wrapForMine(args.input.organizationId);
	let dek: Uint8Array;
	try {
		dek = await decryptTemplateDekFromOrgHead({
			templateId: args.input.templateId,
			headDekWrappedOmk: existing.template.headDekWrappedOmk,
			headOmkKemCiphertext: existing.template.headOmkKemCiphertext,
			wallet: walletAddress,
			myWrap,
		});
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === "No unlocked key seed found"
		) {
			throw new Error(
				"Unlock encryption keys with your wallet or recovery phrase, then try saving again.",
			);
		}
		throw error;
	}

	setCachedTemplateDek(args.input.templateId, walletAddress, dek);
	return dek;
}

export async function saveOrgTemplateUpdate(
	deps: SaveOrgTemplateDeps,
	input: SaveOrgTemplateInput,
): Promise<
	Awaited<ReturnType<AppRouterClient["orgs"]["templates"]["update"]>>
> {
	const dek = await resolveTemplateDekForUpdate({ deps, input });

	const prepared = await deps.prepareUpdate({
		templateId: input.templateId,
		documents: input.documents.map((doc) => ({
			docId: doc.docId,
			plaintextSha256: doc.plaintextSha256,
			name: doc.name,
			size: doc.size,
			mimeType: doc.mimeType,
		})),
	});

	return deps.update({
		templateId: input.templateId,
		name: input.name,
		snapshot: input.snapshot,
		documents: await uploadPreparedTemplateDocuments({
			dek,
			input,
			preparedDocuments: prepared.documents,
		}),
	});
}
