import type { SettlementRuleKey } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	cancelSettlementRuleOnChain,
	type SettlementChangeProgressReporter,
	type SettlementPayerWalletResolver,
} from "../../lib/settlement-rules";
import type { SettlementRuleRow } from "../../lib/settlement-types";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type CancelSettlementRuleInput = SettlementRuleKey & {
	allRules: SettlementRuleRow[];
	onProgress?: SettlementChangeProgressReporter;
	resolvePayerWallet?: SettlementPayerWalletResolver;
};

export function useCancelSettlementRule(pieceCid: string | undefined) {
	const { wallet, contracts, runtime } = useFilosignContext();
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
				chainKey: runtime.chainKey,
				allRules: input.allRules,
				onChainRuleId: input.onChainRuleId,
				validatorAddress: input.validatorAddress,
				onProgress: input.onProgress,
				resolvePayerWallet: input.resolvePayerWallet,
			});

			return rpcQuery.settlements.cancelRule.call({
				onChainRuleId: input.onChainRuleId,
				validatorAddress: input.validatorAddress,
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
