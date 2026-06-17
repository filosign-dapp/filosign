import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { signCancelSignerReplacement } from "../../lib/signatures";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useCancelSignerReplacement(pieceCid: string | undefined) {
	const { wallet, contracts } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			if (!pieceCid) throw new Error("pieceCid is required");
			if (!wallet?.account || !contracts) {
				throw new Error("Connect your wallet to cancel the roster change.");
			}
			if (!isAuthed) throw new Error("Not authenticated");

			const timestamp = await latestChainTimestamp(contracts);
			const recaller = wallet.account.address as `0x${string}`;
			const signature = await signCancelSignerReplacement({
				wallet,
				contracts,
				pieceCid,
				timestamp,
				recaller,
			});

			return rpcQuery.files.cancelSignerReplacement.call({
				pieceCid,
				recaller,
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
