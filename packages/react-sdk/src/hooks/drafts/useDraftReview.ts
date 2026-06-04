import type { DraftSnapshot } from "@filosign/shared";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	decryptDraftDekFromColdShare,
	decryptDraftDekFromWarmShare,
	decryptDraftDocument,
	decryptDraftSnapshot,
} from "../../lib/draft-crypto";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { walletAccountAddress } from "../../utils/evm";

export function useDraftReviewByToken(inviteToken: string | undefined) {
	const { rpc } = useFilosignRpc();
	const token = inviteToken?.trim();

	return useQuery({
		queryKey: ["filosign", "drafts", "reviewByToken", token ?? ""],
		queryFn: () => {
			if (!token) throw new Error("token required");
			return rpc.drafts.reviewByToken({ inviteToken: token });
		},
		enabled: Boolean(token),
	});
}

export function useDecryptDraftReviewCold() {
	return useMutation({
		mutationFn: async (args: {
			draftId: string;
			inviteToken: string;
			phrase: string;
			wrappedDek: Hex;
			snapshotDownloadUrl: string;
			documents: {
				docId: string;
				name: string;
				mimeType: string;
				downloadUrl: string;
			}[];
		}) => {
			const dek = await decryptDraftDekFromColdShare({
				wrappedDek: args.wrappedDek,
				phrase: args.phrase,
				draftId: args.draftId,
				inviteToken: args.inviteToken,
			});

			const snapRes = await fetch(args.snapshotDownloadUrl);
			if (!snapRes.ok) throw new Error("Failed to download snapshot");
			const snapshot = await decryptDraftSnapshot({
				dek,
				draftId: args.draftId,
				ciphertext: new Uint8Array(await snapRes.arrayBuffer()),
			});

			const documents: {
				id: string;
				name: string;
				type: string;
				bytes: Uint8Array;
			}[] = [];
			for (const doc of args.documents) {
				const dl = await fetch(doc.downloadUrl);
				if (!dl.ok) throw new Error(`Failed to download ${doc.name}`);
				const bytes = await decryptDraftDocument({
					dek,
					draftId: args.draftId,
					docId: doc.docId,
					ciphertext: new Uint8Array(await dl.arrayBuffer()),
				});
				documents.push({
					id: doc.docId,
					name: doc.name,
					type: doc.mimeType,
					bytes,
				});
			}

			return { snapshot, documents } satisfies {
				snapshot: DraftSnapshot;
				documents: {
					id: string;
					name: string;
					type: string;
					bytes: Uint8Array;
				}[];
			};
		},
	});
}

export function useDecryptDraftReviewWarm() {
	const { wallet } = useFilosignContext();
	const { rpc, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (args: { inviteToken: string }) => {
			if (!wallet?.account || !isAuthed) {
				throw new Error("Connect wallet to open this draft");
			}
			const walletAddress = walletAccountAddress(wallet.account);
			const head = await rpc.drafts.reviewForWallet({
				inviteToken: args.inviteToken,
			});

			const dek = await decryptDraftDekFromWarmShare({
				kemCiphertext: head.kemCiphertext,
				encryptedDek: head.encryptedDek,
				draftId: head.draftId,
				inviteToken: args.inviteToken,
				wallet: walletAddress,
			});

			const snapRes = await fetch(head.snapshotDownloadUrl);
			if (!snapRes.ok) throw new Error("Failed to download snapshot");
			const snapshot = await decryptDraftSnapshot({
				dek,
				draftId: head.draftId,
				ciphertext: new Uint8Array(await snapRes.arrayBuffer()),
			});

			const documents: {
				id: string;
				name: string;
				type: string;
				bytes: Uint8Array;
			}[] = [];
			for (const doc of head.documents) {
				const dl = await fetch(doc.downloadUrl);
				if (!dl.ok) throw new Error(`Failed to download ${doc.name}`);
				const bytes = await decryptDraftDocument({
					dek,
					draftId: head.draftId,
					docId: doc.docId,
					ciphertext: new Uint8Array(await dl.arrayBuffer()),
				});
				documents.push({
					id: doc.docId,
					name: doc.name,
					type: doc.mimeType,
					bytes,
				});
			}

			return { snapshot, documents, title: head.title };
		},
	});
}
