import {
	type DraftSnapshot,
	digestDraftSnapshot,
	draftDocumentKey,
} from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
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
	clearAllDraftDekCache,
	clearCachedDraftDek,
	getCachedDraftDek,
	setCachedDraftDek,
} from "../../lib/draft-dek-cache";
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

function isConflictError(error: unknown): boolean {
	if (error == null || typeof error !== "object") return false;
	if ("code" in error && error.code === "CONFLICT") return true;
	return (
		error instanceof Error &&
		error.message.includes("Draft was updated elsewhere")
	);
}

export function useSaveDraft() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();
	const prevWalletRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		const addr = wallet?.account?.address;
		if (
			prevWalletRef.current &&
			addr &&
			prevWalletRef.current.toLowerCase() !== addr.toLowerCase()
		) {
			clearAllDraftDekCache();
		}
		prevWalletRef.current = addr;
	}, [wallet?.account?.address]);

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
				let reuseHeadDek = false;

				const cachedDek = getCachedDraftDek(input.draftId, walletAddress);
				if (cachedDek) {
					dek = cachedDek;
					reuseHeadDek = input.expectedRevision > 0;
					debugDraftSave("client.save.dek_cache.hit");
				} else if (input.expectedRevision > 0) {
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
					setCachedDraftDek(input.draftId, walletAddress, dek);
					reuseHeadDek = true;
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

				if (prepared.snapshot.needsUpload && prepared.snapshot.uploadUrl) {
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
				} else {
					debugDraftSave("client.save.skip_snapshot");
				}

				const uploadByDocId = new Map(
					prepared.documents
						.filter((slot) => slot.uploadUrl != null)
						.map((slot) => [slot.docId, slot] as const),
				);

				const uploadedRows = await Promise.all(
					input.documents.map(async (doc) => {
						const slot = uploadByDocId.get(doc.id);
						if (!slot?.uploadUrl) {
							debugDraftSave("client.save.skip_document", { docId: doc.id });
							const s3Key = draftDocumentKey({
								draftId: input.draftId,
								organizationId: input.organizationId,
								docId: doc.id,
							});
							return {
								docId: doc.id,
								s3Key,
								name: doc.name,
								size: doc.size,
								mimeType: doc.type,
							};
						}

						if (!input.loadDocumentBytes) {
							throw new Error(
								`Missing file bytes loader for document ${doc.id}; re-add the file and save again`,
							);
						}
						const bytes = await input.loadDocumentBytes(doc.id);
						debugDraftSave("client.save.put_document.start", {
							docId: doc.id,
							plainBytes: bytes.byteLength,
						});
						const cipher = await encryptDraftDocument({
							dek,
							draftId: input.draftId,
							docId: doc.id,
							bytes,
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
						return {
							docId: doc.id,
							s3Key: slot.s3Key,
							name: doc.name,
							size: doc.size,
							mimeType: doc.type,
						};
					}),
				);

				const savePayload: Parameters<typeof rpc.drafts.save>[0] = {
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
				const result = await rpc.drafts.save(savePayload);
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
		},
		onSuccess: async (data, variables) => {
			const getKey = rpcQuery.drafts.get.key({
				input: { draftId: variables.draftId },
			});
			queryClient.setQueryData(getKey, (prev) => {
				if (!prev || typeof prev !== "object" || !("draft" in prev)) {
					return prev;
				}
				const head = prev as {
					draft: { revision: number; title?: string; updatedAt?: Date };
					headSnapshot?: DraftSnapshot;
				};
				return {
					...head,
					draft: {
						...head.draft,
						revision: data.revision,
						title: variables.title?.trim() ?? head.draft.title,
						updatedAt: new Date(),
					},
					headSnapshot: variables.snapshot,
				};
			});

			queryClient.setQueryData(
				rpcQuery.drafts.list.key(),
				(
					prev:
						| { drafts: { id: string; revision: number; title: string }[] }
						| undefined,
				) => {
					if (!prev?.drafts) return prev;
					return {
						drafts: prev.drafts.map((d) =>
							d.id === variables.draftId
								? {
										...d,
										revision: data.revision,
										title: variables.title?.trim() ?? d.title,
									}
								: d,
						),
					};
				},
			);
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
