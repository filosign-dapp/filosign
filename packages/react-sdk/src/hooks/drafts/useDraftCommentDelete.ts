import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { invalidateDraftCommentQueries } from "./invalidate-draft-comments";

export function useDraftCommentDelete() {
	const { wallet } = useFilosignContext();
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { draftId: string; commentId: string }) => {
			if (!wallet?.account || !isAuthed) {
				throw new Error("Wallet required");
			}
			return rpc.drafts.comments.delete({
				draftId: args.draftId,
				commentId: args.commentId,
			});
		},
		onSuccess: async (_data, variables) => {
			await invalidateDraftCommentQueries(
				queryClient,
				rpcQuery,
				variables.draftId,
			);
		},
	});
}
