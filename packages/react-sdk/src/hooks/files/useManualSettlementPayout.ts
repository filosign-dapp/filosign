import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { executeSettlementPayoutOnChain } from "../../lib/settlement-rules";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

/** Fallback: wallet `executePayout` then slim server confirm (sync from chain). */
export function useManualSettlementPayout(pieceCid: string | undefined) {
	const { wallet, contracts } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (onChainRuleId: string) => {
			if (!wallet?.account || !contracts) {
				throw new Error("Connect your wallet to settle from your wallet.");
			}
			if (!isAuthed) throw new Error("Not authenticated");

			const canExecute = await contracts.FSPaymentValidator?.read.canExecute([
				BigInt(onChainRuleId),
			]);
			if (!canExecute) {
				throw new Error(
					"Payout is not ready yet. Wait for signing conditions or check USDC balance and approval.",
				);
			}

			const payoutTxHash = await executeSettlementPayoutOnChain({
				wallet,
				contracts,
				onChainRuleId,
			});

			return rpcQuery.settlements.confirmSettlement.call({
				onChainRuleId,
				payoutTxHash,
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
