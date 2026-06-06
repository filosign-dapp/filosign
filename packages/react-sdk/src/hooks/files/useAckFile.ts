import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { type AckFileArgs, ackFile } from "../../lib/ack-file/ack-file";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useUserProfile } from "../users/useUserProfile";

export function useAckFile() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const { contracts, wallet } = useFilosignContext();
	const queryClient = useQueryClient();
	const { data: userProfile } = useUserProfile();

	return useMutation({
		mutationFn: async (args: AckFileArgs) => {
			if (!isAuthed || !contracts || !wallet) {
				throw new Error("not connected");
			}

			const authSubjectCommitment = userProfile?.authSubjectCommitment;
			if (!authSubjectCommitment) {
				throw new Error(
					"Profile missing Auth subject commitment; try re-login.",
				);
			}

			const result = await ackFile(
				{
					contracts,
					wallet,
					rpcQuery,
					authSubjectCommitment,
				},
				args,
			);

			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.piece.detail.key({
					input: { pieceCid: args.pieceCid },
				}),
			});

			return result;
		},
	});
}
