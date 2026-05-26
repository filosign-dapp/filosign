import type { DraftSnapshot } from "@filosign/shared";
import type { InferClientOutputs } from "@orpc/client";
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
import { draftOrganizationId } from "../../lib/resolve-draft-dek";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type SaveDraftDocumentInput = {
	id: string;
	name: string;
	size: number;
	type: string;
	bytes: Uint8Array;
};

export type SaveDraftInput = {
	draftId: string;
	expectedRevision: number;
	title?: string;
	snapshot: DraftSnapshot;
	documents: SaveDraftDocumentInput[];
	organizationId: string;
	orgEncryptionPublicKey: Hex;
	/** PUT target for encrypted snapshot (from create or get snapshot.s3Key presign). */
	snapshotUploadUrl: string;
	headSnapshotS3Key: string;
};

export function useSaveDraft() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: SaveDraftInput) => {
			if (!wallet?.account || !isAuthed) {
				throw new Error("Wallet required");
			}

			const walletAddress = wallet.account.address as Address;
			let dek = generateDraftDek();

			if (input.expectedRevision > 0) {
				const existing = await rpc.drafts.get({ draftId: input.draftId });
				const organizationId = draftOrganizationId(existing);
				if (!existing.headDekWrappedOmk || !existing.headOmkKemCiphertext) {
					throw new Error("Draft is not saved with encryption keys yet");
				}
				const myWrap = await rpcQuery.orgs.keys.wrapForMine.call({
					organizationId,
				});
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
			}

			const snapshotCipher = await encryptDraftSnapshot({
				dek,
				draftId: input.draftId,
				snapshot: input.snapshot,
			});

			const snapshotPut = await fetch(input.snapshotUploadUrl, {
				method: "PUT",
				body: new Blob([Uint8Array.from(snapshotCipher)]),
				headers: { "Content-Type": "application/octet-stream" },
			});
			if (!snapshotPut.ok) {
				throw new Error(
					`Failed to upload draft snapshot (${snapshotPut.status})`,
				);
			}

			const emptyPresign: InferClientOutputs<AppRouterClient>["drafts"]["presignDocuments"] =
				{ uploads: [] };

			const presign =
				input.documents.length > 0
					? await rpc.drafts.presignDocuments({
							draftId: input.draftId,
							docIds: input.documents.map((d) => d.id),
						})
					: emptyPresign;

			const uploadByDocId = new Map(
				presign.uploads.map((u) => [u.docId, u] as const),
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
				if (!slot) throw new Error(`Missing presign for document ${doc.id}`);
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
				if (!put.ok) {
					throw new Error(`Failed to upload draft document (${put.status})`);
				}
				documentRows.push({
					docId: doc.id,
					s3Key: slot.s3Key,
					name: doc.name,
					size: doc.size,
					mimeType: doc.type,
				});
			}

			const wrapped = await wrapDraftDekForOrg({
				dek,
				draftId: input.draftId,
				orgEncryptionPublicKey: input.orgEncryptionPublicKey,
			});

			return rpc.drafts.save({
				draftId: input.draftId,
				expectedRevision: input.expectedRevision,
				title: input.title,
				headSnapshotS3Key: input.headSnapshotS3Key,
				headDekWrappedOmk: wrapped.encryptedDek,
				headOmkKemCiphertext: wrapped.kemCiphertext,
				documents: documentRows,
			});
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
