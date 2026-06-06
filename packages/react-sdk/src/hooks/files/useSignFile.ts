import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { latestChainTimestamp } from "../../lib/chain-time";
import { invalidateInboxQueries } from "../../lib/invalidate-queries";
import {
	type SignFileArgs,
	signFileWithSeed,
} from "../../lib/sign-file/sign-file";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useCryptoSeed } from "../auth";
import { useUserProfile } from "../users/useUserProfile";

export function useSignFile() {
	const { contracts, wallet, wasm } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();
	const { action: cryptoAction } = useCryptoSeed();
	const { data: userProfile } = useUserProfile();

	return useMutation({
		mutationFn: async (args: SignFileArgs) => {
			let success = false;

			const dilithium = wasm.dilithium;
			if (!contracts || !wallet || !dilithium || !isAuthed) {
				throw new Error("not connected");
			}

			const timestamp = await latestChainTimestamp(contracts);

			await cryptoAction(async (seed: Uint8Array) => {
				await signFileWithSeed(
					{
						contracts,
						wallet,
						rpcQuery,
						dilithium,
						profileEmail: userProfile?.email,
						authSubjectCommitment: userProfile?.authSubjectCommitment,
					},
					args,
					seed,
					timestamp,
				);
				success = true;
			});

			return success;
		},
		onSuccess: (_data, variables) => {
			void invalidateInboxQueries(queryClient, rpcQuery);
			if (variables.pieceCid) {
				void queryClient.invalidateQueries({
					queryKey: rpcQuery.files.piece.detail.key({
						input: { pieceCid: variables.pieceCid },
					}),
				});
			}
		},
	});
}
