import { type DraftSnapshot, draftDocumentKey } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	decryptDraftDekFromOrgHead,
	encryptDraftDocument,
	encryptDraftSnapshot,
	generateDraftDek,
	wrapDraftDekForOrg,
} from "../../lib/draft-crypto";
import {
	debugDraftSave,
	debugDraftSaveError,
} from "../../lib/draft-save-debug";
import { draftOrganizationId } from "../../lib/resolve-draft-dek";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type SaveDraftDocumentInput = {
	id: string;
	name: string;
	size: number;
	type: string;
	bytes?: Uint8Array;
};

export type SaveDraftInput = {
	draftId: string;
	expectedRevision: number;
	title?: string;
	snapshot: DraftSnapshot;
	documents: SaveDraftDocumentInput[];
	organizationId: string;
	orgEncryptionPublicKey: Hex;
};

export function useSaveDraft() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: SaveDraftInput) => {
			debugDraftSave("client.save.start", {
				draftId: input.draftId,
				expectedRevision: input.expectedRevision,
				documentCount: input.documents.length,
				fieldCount: input.snapshot.signatureFields.length,
			});

			try {
				if (!wallet?.account || !isAuthed) {
					throw new Error("Wallet required");
				}

				const walletAddress = wallet.account.address as Address;
				let dek: Uint8Array;

				if (input.expectedRevision > 0) {
					debugDraftSave("client.save.dek_load.start");
					const existing = await rpc.drafts.get({ draftId: input.draftId });
					const organizationId = draftOrganizationId(existing);
					if (!existing.headDekWrappedOmk || !existing.headOmkKemCiphertext) {
						throw new Error("Draft is not saved with encryption keys yet");
					}
					const myWrap = await rpcQuery.orgs.keys.wrapForMine.call({
						organizationId,
					});
					try {
						dek = await decryptDraftDekFromOrgHead({
							draftId: input.draftId,
							headDekWrappedOmk: existing.headDekWrappedOmk as Hex,
							headOmkKemCiphertext: existing.headOmkKemCiphertext as Hex,
							wallet: walletAddress,
							myWrap: {
								wrappedOmk: myWrap.wrappedOmk as Hex,
								wrapKemCiphertext: myWrap.wrapKemCiphertext as Hex,
							},
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
					debugDraftSave("client.save.dek_load.ok", {
						headSnapshotFromDb: !!existing.headSnapshot,
					});
				} else {
					dek = generateDraftDek();
					debugDraftSave("client.save.dek_new");
				}

				debugDraftSave("client.save.prepare_rpc.start");
				const prepared = await rpc.drafts.prepareSave({
					draftId: input.draftId,
					docIds: input.documents.map((d) => d.id),
				});
				debugDraftSave("client.save.prepare_rpc.ok", {
					snapshotKey: prepared.snapshot.s3Key,
					docs: prepared.documents.map((d) => ({
						docId: d.docId,
						needsUpload: d.needsUpload,
					})),
				});

				debugDraftSave("client.save.encrypt_snapshot.start");
				const snapshotCipher = await encryptDraftSnapshot({
					dek,
					draftId: input.draftId,
					snapshot: input.snapshot,
				});
				debugDraftSave("client.save.encrypt_snapshot.ok", {
					cipherBytes: snapshotCipher.byteLength,
				});

				debugDraftSave("client.save.put_snapshot.start", {
					urlHost: safeUrlHost(prepared.snapshot.uploadUrl),
				});
				const snapshotPut = await fetch(prepared.snapshot.uploadUrl, {
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

				const uploadByDocId = new Map(
					prepared.documents
						.filter((slot) => slot.uploadUrl != null)
						.map((slot) => [slot.docId, slot] as const),
				);

				const documentRows: {
					docId: string;
					s3Key: string;
					name: string;
					size: number;
					mimeType: string;
				}[] = [];

				for (const doc of input.documents) {
					const slot = uploadByDocId.get(doc.id);
					if (slot?.uploadUrl) {
						if (doc.bytes === undefined) {
							throw new Error(
								`Missing file bytes for document ${doc.id}; re-add the file and save again`,
							);
						}
						debugDraftSave("client.save.put_document.start", {
							docId: doc.id,
							plainBytes: doc.bytes.byteLength,
						});
						const cipher = await encryptDraftDocument({
							dek,
							draftId: input.draftId,
							docId: doc.id,
							bytes: doc.bytes,
						});
						const put = await fetch(slot.uploadUrl, {
							method: "PUT",
							body: new Blob([Uint8Array.from(cipher)]),
							headers: { "Content-Type": "application/octet-stream" },
						});
						debugDraftSave("client.save.put_document.done", {
							docId: doc.id,
							status: put.status,
							ok: put.ok,
						});
						if (!put.ok) {
							throw new Error(
								`Failed to upload draft document (${put.status})`,
							);
						}
						documentRows.push({
							docId: doc.id,
							s3Key: slot.s3Key,
							name: doc.name,
							size: doc.size,
							mimeType: doc.type,
						});
					} else {
						debugDraftSave("client.save.skip_document", { docId: doc.id });
						const s3Key = draftDocumentKey({
							draftId: input.draftId,
							organizationId: input.organizationId,
							docId: doc.id,
						});
						documentRows.push({
							docId: doc.id,
							s3Key,
							name: doc.name,
							size: doc.size,
							mimeType: doc.type,
						});
					}
				}

				debugDraftSave("client.save.wrap_dek.start");
				const wrapped = await wrapDraftDekForOrg({
					dek,
					draftId: input.draftId,
					orgEncryptionPublicKey: input.orgEncryptionPublicKey,
				});
				debugDraftSave("client.save.save_rpc.start");
				const result = await rpc.drafts.save({
					draftId: input.draftId,
					expectedRevision: input.expectedRevision,
					title: input.title,
					headSnapshotS3Key: prepared.snapshot.s3Key,
					snapshot: input.snapshot,
					headDekWrappedOmk: wrapped.encryptedDek,
					headOmkKemCiphertext: wrapped.kemCiphertext,
					documents: documentRows,
				});
				debugDraftSave("client.save.complete", {
					revision: result.revision,
				});
				return result;
			} catch (error) {
				debugDraftSaveError("client.save.failed", error, {
					draftId: input.draftId,
					expectedRevision: input.expectedRevision,
				});
				throw error;
			}
		},
		onSuccess: async (_data, variables) => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.drafts.list.key(),
			});
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.drafts.get.key({
					input: { draftId: variables.draftId },
				}),
			});
		},
	});
}

function safeUrlHost(url: string): string {
	try {
		return new URL(url).host;
	} catch {
		return "invalid-url";
	}
}
