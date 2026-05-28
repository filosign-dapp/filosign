import type { DraftSnapshot } from "@filosign/shared";
import { useMutation } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	decryptDraftDocument,
	decryptDraftSnapshot,
} from "../../lib/draft-crypto";
import { debugDraftLoad } from "../../lib/draft-load-debug";
import {
	draftOrganizationId,
	resolveDraftDek,
} from "../../lib/resolve-draft-dek";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type DecryptedDraft = {
	snapshot: DraftSnapshot;
	documents: { id: string; name: string; type: string; bytes: Uint8Array }[];
};

export function useDecryptDraft() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (args: {
			draftId: string;
			organizationId?: string | null;
		}): Promise<DecryptedDraft> => {
			if (!wallet?.account || !isAuthed) {
				throw new Error("Wallet required");
			}
			const walletAddress = wallet.account.address as Address;
			debugDraftLoad("start", { draftId: args.draftId });
			const head = await rpc.drafts.get({ draftId: args.draftId });
			debugDraftLoad("head.ok", {
				draftId: args.draftId,
				revision: head.draft.revision,
				headSnapshotFromDb: !!head.headSnapshot,
				documentCount: head.documents.length,
			});

			const organizationId = draftOrganizationId(head);
			const myWrap = await rpcQuery.orgs.keys.wrapForMine.call({
				organizationId,
			});

			const dek = await resolveDraftDek({
				draftId: args.draftId,
				head,
				wallet: walletAddress,
				myOrgWrap: {
					wrappedOmk: myWrap.wrappedOmk as Hex,
					wrapKemCiphertext: myWrap.wrapKemCiphertext as Hex,
				},
			});

			let snapshot: DraftSnapshot;
			if (head.headSnapshot) {
				debugDraftLoad("snapshot.from_db");
				snapshot = head.headSnapshot;
			} else {
				debugDraftLoad("snapshot.from_s3");
				const snapRes = await fetch(head.snapshot.downloadUrl);
				if (!snapRes.ok) throw new Error("Failed to download draft snapshot");
				snapshot = await decryptDraftSnapshot({
					dek,
					draftId: args.draftId,
					ciphertext: new Uint8Array(await snapRes.arrayBuffer()),
				});
			}

			const documents: DecryptedDraft["documents"] = [];
			for (const doc of head.documents) {
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

			return { snapshot, documents };
		},
	});
}
