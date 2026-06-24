import { useMutation, useQueryClient } from "@tanstack/react-query";
import { encodeFunctionData } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { waitForTxReceipt } from "../../lib/tx-receipt";

export function useCancelAttachmentRule() {
	const { wallet, contracts, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			onChainRuleId: string;
			releaseContractAddress: `0x${string}`;
		}) => {
			if (!wallet?.account || !contracts) {
				throw new Error("Sign in to cancel an attachment rule.");
			}
			const release = contracts.FSAttachmentRelease;
			if (!release) {
				throw new Error("FSAttachmentRelease is not deployed for this chain");
			}
			const address = args.releaseContractAddress;
			if (address.toLowerCase() !== release.address.toLowerCase()) {
				const data = encodeFunctionData({
					abi: release.abi as readonly unknown[],
					functionName: "cancelAttachmentRule",
					args: [BigInt(args.onChainRuleId)],
				});
				const hash = await wallet.sendTransaction({
					to: address,
					data,
					account: wallet.account,
					chain: wallet.chain,
				});
				await waitForTxReceipt(contracts, hash, {
					label: "Attachment rule removal",
					abi: release.abi,
				});
				return hash;
			}
			const hash = await (
				release.write as {
					cancelAttachmentRule: (
						args: readonly [bigint],
					) => Promise<`0x${string}`>;
				}
			).cancelAttachmentRule([BigInt(args.onChainRuleId)]);
			await waitForTxReceipt(contracts, hash, {
				label: "Attachment rule removal",
				abi: release.abi,
			});
			return hash;
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: rpcQuery.files.key() });
		},
	});
}
