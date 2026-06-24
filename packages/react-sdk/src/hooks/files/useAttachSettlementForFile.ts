import { computeCidIdentifier } from "@filosign/evm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Address, isAddress } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { invalidateEntitlements } from "../../lib/invalidate-entitlements";
import type { SendFileArgs } from "../../lib/send-file/types";
import {
	registerSettlementRulesOnChain,
	type SettlementRuleDraft,
} from "../../lib/settlement-rules";

export function useAttachSettlementForFile(pieceCid: string | undefined) {
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
			payoutPayerSource?: "sender" | "org_wallet";
			settlementPayerAddress?: Address;
			registerSettlementRules?: SendFileArgs["registerSettlementRules"];
		}) => {
			if (!pieceCid) throw new Error("pieceCid is required");
			if (!wallet?.account || !contracts || !session.hasThirdwebSession()) {
				throw new Error("Sign in to attach a payout.");
			}

			const payoutPayerSource = args.payoutPayerSource ?? "sender";
			if (
				args.settlementPayerAddress &&
				!isAddress(args.settlementPayerAddress)
			) {
				throw new Error("Settlement payer address is invalid.");
			}
			const cidIdentifier = computeCidIdentifier(pieceCid);
			const payer = args.settlementPayerAddress ?? wallet.account.address;
			const payerIsConnectedWallet =
				payer.toLowerCase() === wallet.account.address.toLowerCase();
			const records =
				payoutPayerSource === "org_wallet" && !payerIsConnectedWallet
					? await (() => {
							if (!args.registerSettlementRules) {
								throw new Error(
									"Treasury payout registration requires treasury wallet execution flow.",
								);
							}
							return args.registerSettlementRules({
								payer,
								cidIdentifier,
								rules: args.rules,
							});
						})()
					: await registerSettlementRulesOnChain({
							wallet,
							contracts,
							chainKey,
							payer,
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
