import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { signAmendSigner } from "../../lib/signatures";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useAmendSigner(pieceCid: string | undefined) {
	const { wallet, contracts } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { oldCommitment: Hex; newCommitment: Hex }) => {
			if (!pieceCid) throw new Error("pieceCid is required");
			if (!wallet?.account || !contracts) {
				throw new Error("Connect your wallet to amend a signer.");
			}
			if (!isAuthed) throw new Error("Not authenticated");

			const timestamp = await latestChainTimestamp(contracts);
			const signature = await signAmendSigner({
				wallet,
				contracts,
				pieceCid,
				oldCommitment: args.oldCommitment,
				newCommitment: args.newCommitment,
				timestamp,
			});

			return rpcQuery.files.amendSigner.call({
				pieceCid,
				oldCommitment: args.oldCommitment,
				newCommitment: args.newCommitment,
				timestamp,
				signature,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.key(),
			});
		},
	});
}
