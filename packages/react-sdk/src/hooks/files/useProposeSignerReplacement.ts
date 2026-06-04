import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hex } from "viem";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { signProposeSignerReplacement } from "../../lib/signatures";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import {
	buildNewSignerE2eeForAmend,
	type NewSignerE2eePayload,
	previewSignersCommitmentAfter,
} from "../../utils/amend-signer-e2ee";

export type ProposeSignerReplacementArgs = {
	oldCommitment: Hex;
	newCommitment: Hex;
	newEmail: string;
	requiredCommitments: Hex[];
	newSignerE2ee?: NewSignerE2eePayload;
};

export function useProposeSignerReplacement(pieceCid: string | undefined) {
	const { wallet, contracts } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: ProposeSignerReplacementArgs) => {
			if (!pieceCid) throw new Error("pieceCid is required");
			if (!wallet?.account || !contracts) {
				throw new Error("Connect your wallet to change a signer.");
			}
			if (!isAuthed) throw new Error("Not authenticated");

			const timestamp = await latestChainTimestamp(contracts);
			const recaller = wallet.account.address;
			const signersCommitmentAfter = await previewSignersCommitmentAfter({
				contracts,
				requiredCommitments: args.requiredCommitments,
				oldCommitment: args.oldCommitment,
				newCommitment: args.newCommitment,
			});
			const signature = await signProposeSignerReplacement({
				wallet,
				contracts,
				pieceCid,
				oldCommitment: args.oldCommitment,
				newCommitment: args.newCommitment,
				signersCommitmentAfter,
				timestamp,
				recaller,
			});

			if (!args.newSignerE2ee) {
				throw new Error("newSignerE2ee is required");
			}

			return rpcQuery.files.proposeSignerReplacement.call({
				pieceCid,
				recaller,
				oldCommitment: args.oldCommitment,
				newCommitment: args.newCommitment,
				timestamp,
				signature,
				newSignerE2ee: args.newSignerE2ee,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.key(),
			});
		},
	});
}

export { buildNewSignerE2eeForAmend };
