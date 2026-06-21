import {
	type SystemTemplateMeta,
	type TemplatePlaintextSha256,
	type TemplatePrepareUpdateDocumentRow,
	type TemplateSnapshot,
	zSystemTemplateMeta,
} from "@filosign/shared";
import type { AppRouterClient } from "../../orpc/app-router-types";

type PreparedSystemDocument = {
	docId: string;
	s3Key: string;
	needsUpload: boolean;
	uploadUrl?: string;
};

export type SaveSystemTemplateInput = {
	systemTemplateId: string;
	name: string;
	meta: SystemTemplateMeta;
	snapshot: TemplateSnapshot;
	documents: TemplatePrepareUpdateDocumentRow[];
	loadDocumentBytes: (docId: string) => Promise<Uint8Array>;
};

export type SaveSystemTemplateDeps = {
	prepareCreate: AppRouterClient["platformAdmin"]["systemTemplates"]["prepareCreate"];
	create: AppRouterClient["platformAdmin"]["systemTemplates"]["create"];
	prepareUpdate: AppRouterClient["platformAdmin"]["systemTemplates"]["prepareUpdate"];
	update: AppRouterClient["platformAdmin"]["systemTemplates"]["update"];
};

export function createSaveSystemTemplateDeps(args: {
	rpc: AppRouterClient;
}): SaveSystemTemplateDeps {
	const { rpc } = args;
	return {
		prepareCreate: (body) =>
			rpc.platformAdmin.systemTemplates.prepareCreate(body),
		create: (body) => rpc.platformAdmin.systemTemplates.create(body),
		prepareUpdate: (body) =>
			rpc.platformAdmin.systemTemplates.prepareUpdate(body),
		update: (body) => rpc.platformAdmin.systemTemplates.update(body),
	};
}

async function uploadSystemTemplateDocuments(args: {
	input: SaveSystemTemplateInput;
	preparedDocuments: PreparedSystemDocument[];
}): Promise<
	Array<{
		docId: string;
		s3Key: string;
		name: string;
		size: number;
		mimeType: string;
		plaintextSha256: TemplatePlaintextSha256;
	}>
> {
	const slotByDocId = new Map(
		args.preparedDocuments.map((slot) => [slot.docId, slot]),
	);

	return Promise.all(
		args.input.documents.map(async (doc) => {
			const slot = slotByDocId.get(doc.docId);
			const row = {
				docId: doc.docId,
				s3Key: slot?.s3Key ?? "",
				name: doc.name,
				size: doc.size,
				mimeType: doc.mimeType,
				plaintextSha256: doc.plaintextSha256,
			};

			if (!slot?.needsUpload || !slot.uploadUrl) {
				if (!row.s3Key) {
					throw new Error(`Missing s3Key for document ${doc.docId}`);
				}
				return row;
			}

			const bytes = await args.input.loadDocumentBytes(doc.docId);
			const putRes = await fetch(slot.uploadUrl, {
				method: "PUT",
				body: new Blob([Uint8Array.from(bytes)]),
				headers: {
					"Content-Type": "application/pdf",
				},
			});
			if (!putRes.ok) {
				throw new Error(
					`Failed to upload system template document ${doc.name}`,
				);
			}

			return {
				...row,
				s3Key: slot.s3Key,
			};
		}),
	);
}

export async function saveSystemTemplateCreate(
	deps: SaveSystemTemplateDeps,
	input: SaveSystemTemplateInput,
) {
	const prepared = await deps.prepareCreate({
		systemTemplateId: input.systemTemplateId,
		docIds: input.documents.map((doc) => doc.docId),
	});

	return deps.create({
		systemTemplateId: input.systemTemplateId,
		name: input.name,
		meta: zSystemTemplateMeta.parse(input.meta),
		snapshot: input.snapshot,
		documents: await uploadSystemTemplateDocuments({
			input,
			preparedDocuments: prepared.documents,
		}),
	});
}

export async function saveSystemTemplateUpdate(
	deps: SaveSystemTemplateDeps,
	input: SaveSystemTemplateInput,
) {
	const prepared = await deps.prepareUpdate({
		systemTemplateId: input.systemTemplateId,
		documents: input.documents.map((doc) => ({
			docId: doc.docId,
			plaintextSha256: doc.plaintextSha256,
			name: doc.name,
			size: doc.size,
			mimeType: doc.mimeType,
		})),
	});

	return deps.update({
		systemTemplateId: input.systemTemplateId,
		name: input.name,
		meta: zSystemTemplateMeta.parse(input.meta),
		snapshot: input.snapshot,
		documents: await uploadSystemTemplateDocuments({
			input,
			preparedDocuments: prepared.documents,
		}),
	});
}
