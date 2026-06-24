import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { signClearEnvelopeSignatures } from "../../lib/signatures";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useClearEnvelopeSignatures(pieceCid: string | undefined) {
	const { wallet, contracts } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			registryAddress?: `0x${string}` | null;
			recaller?: `0x${string}`;
		}) => {
			if (!pieceCid) throw new Error("pieceCid is required");
			if (!wallet?.account || !contracts) {
				throw new Error("Sign in to clear envelope signatures.");
			}
			if (!isAuthed) throw new Error("Not authenticated");

			const recaller = (args.recaller ??
				wallet.account.address) as `0x${string}`;
			const timestamp = await latestChainTimestamp(contracts);
			const signature = await signClearEnvelopeSignatures({
				wallet,
				contracts,
				pieceCid,
				timestamp,
				registryAddress: args.registryAddress,
				recaller,
			});

			return rpcQuery.files.clearEnvelopeSignatures.call({
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
