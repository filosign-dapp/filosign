import { hashOrgIdCommitment, ZERO_ORG_ID_COMMITMENT } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { invalidateDocumentsAndNotifications } from "../../lib/invalidate-queries";
import { signRecallEnvelope } from "../../lib/signatures";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRecallEnvelope(pieceCid: string | undefined) {
	const { wallet, contracts } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			organizationId?: string | null;
			registryAddress?: `0x${string}` | null;
			recaller?: `0x${string}`;
		}) => {
			if (!pieceCid) throw new Error("pieceCid is required");
			if (!wallet?.account || !contracts) {
				throw new Error("Sign in to recall this envelope.");
			}
			if (!isAuthed) throw new Error("Not authenticated");

			const fileResponse = await rpcQuery.files.piece.detail.call({
				pieceCid,
			});
			const organizationId =
				args.organizationId ?? fileResponse.organizationId ?? null;
			const registryAddress =
				args.registryAddress ?? fileResponse.registryAddress;

			const recaller = (args.recaller ??
				wallet.account.address) as `0x${string}`;
			const orgIdCommitment = organizationId
				? hashOrgIdCommitment(organizationId)
				: ZERO_ORG_ID_COMMITMENT;

			const timestamp = await latestChainTimestamp(contracts);
			const signature = await signRecallEnvelope({
				wallet,
				contracts,
				pieceCid,
				orgIdCommitment,
				timestamp,
				registryAddress,
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
			void invalidateDocumentsAndNotifications(queryClient, rpcQuery);
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.key(),
			});
		},
	});
}
