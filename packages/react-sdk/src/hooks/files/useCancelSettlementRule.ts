import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { cancelSettlementRuleOnChain } from "../../lib/settlement-rules";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type CancelSettlementRuleInput = {
	onChainRuleId: string;
	validatorAddress?: Address;
};

export function useCancelSettlementRule(pieceCid: string | undefined) {
	const { wallet, contracts } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CancelSettlementRuleInput) => {
			if (!wallet?.account || !contracts) {
				throw new Error("Connect your wallet to cancel a settlement rule.");
			}
			if (!isAuthed) throw new Error("Not authenticated");

			const { cancelRuleTxHash } = await cancelSettlementRuleOnChain({
				wallet,
				contracts,
				onChainRuleId: input.onChainRuleId,
				validatorAddress: input.validatorAddress,
			});

			return rpcQuery.settlements.cancelRule.call({
				onChainRuleId: input.onChainRuleId,
				cancelRuleTxHash,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.settlements.key(),
			});
			if (pieceCid) {
				void queryClient.invalidateQueries({
					queryKey: rpcQuery.files.key(),
				});
			}
		},
	});
}
