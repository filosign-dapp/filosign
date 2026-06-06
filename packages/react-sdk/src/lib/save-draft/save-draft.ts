import { type DraftSnapshot, draftDocumentKey } from "@filosign/shared";
import type { Hex } from "viem";
import type { AppRouterClient } from "../../orpc/app-router-types";
import { walletAccountAddress } from "../../utils/evm";
import {
	decryptDraftDekFromOrgHead,
	encryptDraftDocument,
	encryptDraftSnapshot,
	generateDraftDek,
	wrapDraftDekForOrg,
} from "../draft-crypto";
import {
	clearCachedDraftDek,
	getCachedDraftDek,
	setCachedDraftDek,
} from "../draft-dek-cache";
import { debugDraftSave, debugDraftSaveError } from "../draft-save-debug";
import { draftOrganizationId } from "../resolve-draft-dek";
import type { FilosignWallet } from "../wallet";

export type SaveDraftDocumentInput = {
	id: string;
	name: string;
	size: number;
	type: string;
};

export type SaveDraftInput = {
	draftId: string;
	expectedRevision: number;
	title?: string;
	snapshot: DraftSnapshot;
	snapshotDigest: Hex;
	documents: SaveDraftDocumentInput[];
	organizationId: string;
	orgEncryptionPublicKey: Hex;
	loadDocumentBytes?: (docId: string) => Promise<Uint8Array>;
};

export type SaveDraftDeps = {
	wallet: FilosignWallet;
	rpc: AppRouterClient;
	wrapForMine: (organizationId: string) => Promise<{
		wrappedOmk: Hex;
		wrapKemCiphertext: Hex;
	}>;
	fetchDraftHead: (
		draftId: string,
	) => Promise<Awaited<ReturnType<AppRouterClient["drafts"]["get"]>>>;
	prepareSave: (
		input: Parameters<AppRouterClient["drafts"]["prepareSave"]>[0],
	) => ReturnType<AppRouterClient["drafts"]["prepareSave"]>;
	saveDraft: (
		input: Parameters<AppRouterClient["drafts"]["save"]>[0],
	) => ReturnType<AppRouterClient["drafts"]["save"]>;
};

function isConflictError(error: unknown): boolean {
	if (error == null || typeof error !== "object") return false;
	if ("code" in error && error.code === "CONFLICT") return true;
	return (
		error instanceof Error &&
		error.message.includes("Draft was updated elsewhere")
	);
}

function safeUrlHost(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return "invalid-url";
	}
}

async function resolveDraftDek(args: {
	input: SaveDraftInput;
	walletAddress: ReturnType<typeof walletAccountAddress>;
	deps: SaveDraftDeps;
}): Promise<{ dek: Uint8Array; reuseHeadDek: boolean }> {
	const cachedDek = getCachedDraftDek(args.input.draftId, args.walletAddress);
	if (cachedDek) {
		debugDraftSave("client.save.dek_cache.hit");
		return {
			dek: cachedDek,
			reuseHeadDek: args.input.expectedRevision > 0,
		};
	}

	if (args.input.expectedRevision > 0) {
		debugDraftSave("client.save.dek_load.start");
		const existing = await args.deps.fetchDraftHead(args.input.draftId);
		const organizationId = draftOrganizationId(existing);
		if (!existing.headDekWrappedOmk || !existing.headOmkKemCiphertext) {
			throw new Error("Draft is not saved with encryption keys yet");
		}
		const myWrap = await args.deps.wrapForMine(organizationId);
		let dek: Uint8Array;
		try {
			dek = await decryptDraftDekFromOrgHead({
				draftId: args.input.draftId,
				headDekWrappedOmk: existing.headDekWrappedOmk,
				headOmkKemCiphertext: existing.headOmkKemCiphertext,
				wallet: args.walletAddress,
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
		setCachedDraftDek(args.input.draftId, args.walletAddress, dek);
		debugDraftSave("client.save.dek_load.ok");
		return { dek, reuseHeadDek: true };
	}

	debugDraftSave("client.save.dek_new");
	return { dek: generateDraftDek(), reuseHeadDek: false };
}

async function uploadSnapshotIfNeeded(args: {
	input: SaveDraftInput;
	dek: Uint8Array;
	prepared: Awaited<ReturnType<SaveDraftDeps["prepareSave"]>>;
}): Promise<void> {
	if (
		!args.prepared.snapshot.needsUpload ||
		!args.prepared.snapshot.uploadUrl
	) {
		debugDraftSave("client.save.skip_snapshot");
		return;
	}

	debugDraftSave("client.save.encrypt_snapshot.start");
	const snapshotCipher = await encryptDraftSnapshot({
		dek: args.dek,
		draftId: args.input.draftId,
		snapshot: args.input.snapshot,
	});
	debugDraftSave("client.save.encrypt_snapshot.ok", {
		cipherBytes: snapshotCipher.byteLength,
	});

	debugDraftSave("client.save.put_snapshot.start", {
		urlHost: safeUrlHost(args.prepared.snapshot.uploadUrl),
	});
	const snapshotPut = await fetch(args.prepared.snapshot.uploadUrl, {
		method: "PUT",
		body: new Blob([Uint8Array.from(snapshotCipher)]),
		headers: { "Content-Type": "application/octet-stream" },
	});
	debugDraftSave("client.save.put_snapshot.done", {
		status: snapshotPut.status,
		ok: snapshotPut.ok,
	});
	if (!snapshotPut.ok) {
		const body = await snapshotPut.text().catch(() => "");
		throw new Error(
			`Failed to upload draft snapshot (${snapshotPut.status})${body ? `: ${body.slice(0, 200)}` : ""}`,
		);
	}
}

async function uploadDocumentRow(args: {
	doc: SaveDraftDocumentInput;
	input: SaveDraftInput;
	dek: Uint8Array;
	slot:
		| Awaited<ReturnType<SaveDraftDeps["prepareSave"]>>["documents"][number]
		| undefined;
}): Promise<{
	docId: string;
	s3Key: string;
	name: string;
	size: number;
	mimeType: string;
}> {
	if (!args.slot?.uploadUrl) {
		debugDraftSave("client.save.skip_document", { docId: args.doc.id });
		const s3Key = draftDocumentKey({
			draftId: args.input.draftId,
			organizationId: args.input.organizationId,
			docId: args.doc.id,
		});
		return {
			docId: args.doc.id,
			s3Key,
			name: args.doc.name,
			size: args.doc.size,
			mimeType: args.doc.type,
		};
	}

	if (!args.input.loadDocumentBytes) {
		throw new Error(
			`Missing file bytes loader for document ${args.doc.id}; re-add the file and save again`,
		);
	}
	const bytes = await args.input.loadDocumentBytes(args.doc.id);
	debugDraftSave("client.save.put_document.start", {
		docId: args.doc.id,
		plainBytes: bytes.byteLength,
	});
	const cipher = await encryptDraftDocument({
		dek: args.dek,
		draftId: args.input.draftId,
		docId: args.doc.id,
		bytes,
	});
	const put = await fetch(args.slot.uploadUrl, {
		method: "PUT",
		body: new Blob([Uint8Array.from(cipher)]),
		headers: { "Content-Type": "application/octet-stream" },
	});
	debugDraftSave("client.save.put_document.done", {
		docId: args.doc.id,
		status: put.status,
		ok: put.ok,
	});
	if (!put.ok) {
		throw new Error(`Failed to upload draft document (${put.status})`);
	}
	return {
		docId: args.doc.id,
		s3Key: args.slot.s3Key,
		name: args.doc.name,
		size: args.doc.size,
		mimeType: args.doc.type,
	};
}

export async function saveDraft(
	deps: SaveDraftDeps,
	input: SaveDraftInput,
): Promise<Awaited<ReturnType<AppRouterClient["drafts"]["save"]>>> {
	debugDraftSave("client.save.start", {
		draftId: input.draftId,
		expectedRevision: input.expectedRevision,
		documentCount: input.documents.length,
		fieldCount: input.snapshot.signatureFields.length,
	});

	try {
		const walletAddress = walletAccountAddress(deps.wallet.account);
		const { dek, reuseHeadDek } = await resolveDraftDek({
			input,
			walletAddress,
			deps,
		});

		debugDraftSave("client.save.prepare_rpc.start");
		const prepared = await deps.prepareSave({
			draftId: input.draftId,
			docIds: input.documents.map((d) => d.id),
			snapshotDigest: input.snapshotDigest,
		});
		debugDraftSave("client.save.prepare_rpc.ok", {
			snapshotKey: prepared.snapshot.s3Key,
			snapshotNeedsUpload: prepared.snapshot.needsUpload,
			docs: prepared.documents.map((d) => ({
				docId: d.docId,
				needsUpload: d.needsUpload,
			})),
		});

		await uploadSnapshotIfNeeded({ input, dek, prepared });

		const uploadByDocId = new Map(
			prepared.documents
				.filter((slot) => slot.uploadUrl != null)
				.map((slot) => [slot.docId, slot] as const),
		);

		const uploadedRows = await Promise.all(
			input.documents.map((doc) =>
				uploadDocumentRow({
					doc,
					input,
					dek,
					slot: uploadByDocId.get(doc.id),
				}),
			),
		);

		const savePayload: Parameters<typeof deps.saveDraft>[0] = {
			draftId: input.draftId,
			expectedRevision: input.expectedRevision,
			title: input.title,
			headSnapshotS3Key: prepared.snapshot.s3Key,
			snapshot: input.snapshot,
			documents: uploadedRows,
		};

		if (!reuseHeadDek) {
			debugDraftSave("client.save.wrap_dek.start");
			const wrapped = await wrapDraftDekForOrg({
				dek,
				draftId: input.draftId,
				orgEncryptionPublicKey: input.orgEncryptionPublicKey,
			});
			savePayload.headDekWrappedOmk = wrapped.encryptedDek;
			savePayload.headOmkKemCiphertext = wrapped.kemCiphertext;
		} else {
			debugDraftSave("client.save.reuse_head_dek");
		}

		debugDraftSave("client.save.save_rpc.start");
		const result = await deps.saveDraft(savePayload);
		debugDraftSave("client.save.complete", {
			revision: result.revision,
		});
		return result;
	} catch (error) {
		if (isConflictError(error)) {
			clearCachedDraftDek(input.draftId);
		}
		debugDraftSaveError("client.save.failed", error, {
			draftId: input.draftId,
			expectedRevision: input.expectedRevision,
		});
		throw error;
	}
}
