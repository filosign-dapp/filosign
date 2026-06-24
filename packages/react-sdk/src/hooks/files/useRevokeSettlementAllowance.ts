import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import {
	revokeSettlementValidatorAllowance,
	type SettlementPayerWalletResolver,
} from "../../lib/settlement-rules";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRevokeSettlementAllowance(_pieceCid: string | undefined) {
	const { wallet, contracts, runtime } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			tokenAddress: Address;
			payer: Address;
			validatorAddress?: Address;
			resolvePayerWallet?: SettlementPayerWalletResolver;
		}) => {
			if (!wallet?.account || !contracts) {
				throw new Error("Sign in to revoke payout approval.");
			}
			if (!isAuthed) throw new Error("Not authenticated");
			return revokeSettlementValidatorAllowance({
				wallet,
				contracts,
				chainKey: runtime.chainKey,
				tokenAddress: input.tokenAddress,
				payer: input.payer,
				validatorAddress: input.validatorAddress,
				resolvePayerWallet: input.resolvePayerWallet,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.settlements.key(),
			});
		},
	});
}
