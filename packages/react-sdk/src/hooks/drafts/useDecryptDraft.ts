import { useMutation } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	type DecryptDraftHead,
	type DecryptedDraft,
	decryptDraftWithHead,
} from "../../lib/decrypt-draft-core";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type { DecryptDraftHead, DecryptedDraft };

export function useDecryptDraft() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (args: {
			draftId: string;
			organizationId?: string | null;
			head?: DecryptDraftHead;
		}): Promise<DecryptedDraft> => {
			if (!wallet?.account || !isAuthed) {
				throw new Error("Wallet required");
			}
			const walletAddress = wallet.account.address as Address;
			return decryptDraftWithHead(
				{
					wallet: walletAddress,
					fetchHead: (draftId) => rpc.drafts.get({ draftId }),
					wrapForMine: (organizationId) =>
						rpcQuery.orgs.keys.wrapForMine
							.call({ organizationId })
							.then((row) => ({
								wrappedOmk: row.wrappedOmk as Hex,
								wrapKemCiphertext: row.wrapKemCiphertext as Hex,
							})),
				},
				{ draftId: args.draftId, head: args.head },
			);
		},
	});
}
