import { computeCidIdentifier } from "@filosign/contracts";
import { useFilosignContext } from "@filosign/react";
import { invalidateEntitlements } from "@filosign/react/billing";
import {
	registerSettlementRulesOnChain,
	type SettlementRuleDraft,
} from "@filosign/react/files";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useAttachSettlementRules(pieceCid: string | undefined) {
	const {
		wallet,
		contracts,
		runtime: { chainKey },
		rpcQuery,
		session,
	} = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			rules: SettlementRuleDraft[];
			organizationId?: string;
		}) => {
			if (!pieceCid) throw new Error("pieceCid is required");
			if (!wallet?.account || !contracts || !session.hasThirdwebSession()) {
				throw new Error("Connect your wallet to attach a settlement.");
			}

			const cidIdentifier = computeCidIdentifier(pieceCid);
			const records = await registerSettlementRulesOnChain({
				wallet,
				contracts,
				chainKey,
				payer: wallet.account.address,
				cidIdentifier,
				rules: args.rules,
			});

			await rpcQuery.settlements.registerForFile.call({
				pieceCid,
				...(args.organizationId ? { organizationId: args.organizationId } : {}),
				rules: records,
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
			void invalidateEntitlements(queryClient, rpcQuery);
		},
	});
}
