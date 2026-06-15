import type { SettlementReleaseType } from "@filosign/shared";
import {
	hashNormalizedSignerEmail,
	SETTLEMENT_RELEASE_TYPE_UINT,
} from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address, Hex } from "viem";
import { encodeFunctionData } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { releaseParamsToContractArgs } from "../../lib/settlement-rules";
import { waitForTxReceipt } from "../../lib/tx-receipt";

export function useUpdateAttachmentRule() {
	const { wallet, contracts, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			onChainRuleId: string;
			releaseContractAddress: Address;
			packetContentHash: Hex;
			releaseType: SettlementReleaseType;
			releaseParams: Parameters<typeof releaseParamsToContractArgs>[1];
			recipientEmails: string[];
			expiresAt?: bigint;
		}) => {
			if (!wallet?.account || !contracts) {
				throw new Error("Connect your wallet to update an attachment rule.");
			}
			const release = contracts.FSAttachmentRelease;
			if (!release) {
				throw new Error("FSAttachmentRelease is not deployed for this chain");
			}

			const { specificSignerCommitment, thresholdN, signerCommitments } =
				releaseParamsToContractArgs(args.releaseType, args.releaseParams);
			const recipientEmailCommitments = args.recipientEmails.map((email) =>
				hashNormalizedSignerEmail(email),
			);
			const expiresAt = args.expiresAt ?? 0n;
			const address = args.releaseContractAddress;
			const ruleId = BigInt(args.onChainRuleId);
			const data = encodeFunctionData({
				abi: release.abi as readonly unknown[],
				functionName: "updateAttachmentRule",
				args: [
					ruleId,
					args.packetContentHash,
					SETTLEMENT_RELEASE_TYPE_UINT[args.releaseType],
					specificSignerCommitment,
					thresholdN,
					expiresAt,
					signerCommitments,
					recipientEmailCommitments,
				],
			});
			const hash = await wallet.sendTransaction({
				to: address,
				data,
				account: wallet.account,
				chain: wallet.chain,
			});
			await waitForTxReceipt(contracts, hash, {
				label: "Attachment rule update",
				abi: release.abi,
			});
			return hash;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: rpcQuery.files.key() });
		},
	});
}
