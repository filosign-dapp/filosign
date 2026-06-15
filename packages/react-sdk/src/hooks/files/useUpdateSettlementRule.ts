import type {
	SettlementReleaseType,
	SettlementRuleUpdateInput,
} from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	type SettlementChangeProgressReporter,
	type SettlementRuleDraftLeg,
	updateSettlementRuleOnChain,
} from "../../lib/settlement-rules";
import type { SettlementRuleRow } from "../../lib/settlement-types";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useUpdateSettlementRule(pieceCid: string | undefined) {
	const { wallet, contracts, runtime } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			allRules: SettlementRuleRow[];
			onChainRuleId: string;
			validatorAddress: Address;
			releaseType: SettlementReleaseType;
			releaseParams: SettlementRuleUpdateInput["releaseParams"];
			legs: SettlementRuleDraftLeg[];
			expiresAt?: bigint;
			onProgress?: SettlementChangeProgressReporter;
		}) => {
			if (!wallet?.account || !contracts) {
				throw new Error("Connect your wallet to update a settlement rule.");
			}
			if (!isAuthed) throw new Error("Not authenticated");

			const { updateRuleTxHash } = await updateSettlementRuleOnChain({
				wallet,
				contracts,
				chainKey: runtime.chainKey,
				allRules: args.allRules,
				onChainRuleId: args.onChainRuleId,
				validatorAddress: args.validatorAddress,
				releaseType: args.releaseType,
				releaseParams: args.releaseParams,
				legs: args.legs,
				expiresAt: args.expiresAt,
				onProgress: args.onProgress,
			});

			return rpcQuery.settlements.updateRule.call({
				onChainRuleId: args.onChainRuleId,
				validatorAddress: args.validatorAddress,
				updateRuleTxHash,
				legs: args.legs.map((leg) => ({
					recipientWallet: leg.recipientWallet,
					recipientSource: leg.recipientSource,
					amount: leg.amount.toString(),
				})),
				releaseType: args.releaseType,
				releaseParams: args.releaseParams,
				...(args.expiresAt !== undefined && args.expiresAt > 0n
					? { expiresAt: args.expiresAt.toString() }
					: {}),
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
