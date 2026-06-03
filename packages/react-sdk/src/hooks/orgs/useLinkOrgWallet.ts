import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { signLinkOrgWallet } from "../../lib/signatures";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useLinkOrgWallet() {
	const { wallet, contracts } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (organizationId: string) => {
			if (!wallet?.account || !contracts) {
				throw new Error(
					"Connect your wallet to link the workspace controller.",
				);
			}
			if (!isAuthed) throw new Error("Not authenticated");

			const timestamp = await latestChainTimestamp(contracts);
			const signature = await signLinkOrgWallet({
				wallet,
				contracts,
				organizationId,
				timestamp,
			});

			return rpcQuery.orgs.linkWallet.call({
				organizationId,
				orgWalletAddress: wallet.account.address,
				timestamp,
				signature,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.key(),
			});
		},
	});
}
