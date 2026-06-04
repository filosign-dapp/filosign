import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useExecuteSignerReplacement(pieceCid: string | undefined) {
	const { wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			if (!pieceCid) throw new Error("pieceCid is required");
			if (!wallet?.account) {
				throw new Error("Connect your wallet to execute the roster change.");
			}
			if (!isAuthed) throw new Error("Not authenticated");

			return rpcQuery.files.executeSignerReplacement.call({
				pieceCid,
				recaller: wallet.account.address,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.key(),
			});
		},
	});
}
