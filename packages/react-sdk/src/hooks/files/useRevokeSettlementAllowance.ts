import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { revokeSettlementValidatorAllowance } from "../../lib/settlement-rules";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRevokeSettlementAllowance(_pieceCid: string | undefined) {
	const { wallet, contracts, runtime } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (tokenAddress: Address) => {
			if (!wallet?.account || !contracts) {
				throw new Error("Connect your wallet to revoke payout approval.");
			}
			if (!isAuthed) throw new Error("Not authenticated");
			return revokeSettlementValidatorAllowance({
				wallet,
				contracts,
				chainKey: runtime.chainKey,
				tokenAddress,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.settlements.key(),
			});
		},
	});
}
