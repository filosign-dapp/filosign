import type { SettlementRuleKey } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { paymentValidatorAt } from "../../lib/settlement-preflight";
import { executeSettlementPayoutOnChain } from "../../lib/settlement-rules";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type ManualSettlementPayoutInput = SettlementRuleKey;

/** Fallback: wallet `executePayoutLeg` per unpaid leg, then server confirm (sync from chain). */
export function useManualSettlementPayout(pieceCid: string | undefined) {
	const { wallet, contracts } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: ManualSettlementPayoutInput) => {
			if (!wallet?.account || !contracts) {
				throw new Error("Sign in to send this payout.");
			}
			if (!isAuthed) throw new Error("Not authenticated");

			const validator = paymentValidatorAt(contracts, input.validatorAddress);
			const canExecute = await validator.read.canExecute([
				BigInt(input.onChainRuleId),
			]);
			if (!canExecute) {
				throw new Error(
					"Payout is not ready yet. Wait for signing conditions or check USDC balance and approval.",
				);
			}

			const payoutTxHash = await executeSettlementPayoutOnChain({
				wallet,
				contracts,
				onChainRuleId: input.onChainRuleId,
				validatorAddress: input.validatorAddress,
			});

			return rpcQuery.settlements.confirmSettlement.call({
				onChainRuleId: input.onChainRuleId,
				validatorAddress: input.validatorAddress,
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
