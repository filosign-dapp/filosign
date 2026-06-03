import { hashOrgIdCommitment, ZERO_ORG_ID_COMMITMENT } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { signRecallEnvelope } from "../../lib/signatures";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRecallEnvelope(pieceCid: string | undefined) {
	const { wallet, contracts } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			organizationId?: string | null;
			recaller?: `0x${string}`;
		}) => {
			if (!pieceCid) throw new Error("pieceCid is required");
			if (!wallet?.account || !contracts) {
				throw new Error("Connect your wallet to recall this envelope.");
			}
			if (!isAuthed) throw new Error("Not authenticated");

			const recaller = args.recaller ?? wallet.account.address;
			const orgIdCommitment = args.organizationId
				? hashOrgIdCommitment(args.organizationId)
				: ZERO_ORG_ID_COMMITMENT;

			const timestamp = await latestChainTimestamp(contracts);
			const signature = await signRecallEnvelope({
				wallet,
				contracts,
				pieceCid,
				orgIdCommitment,
				timestamp,
				recaller,
			});

			return rpcQuery.files.recallEnvelope.call({
				pieceCid,
				recaller,
				timestamp,
				signature,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.key(),
			});
		},
	});
}
