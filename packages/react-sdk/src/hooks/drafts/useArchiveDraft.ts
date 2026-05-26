import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useArchiveDraft() {
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { draftId: string }) => {
			if (!isAuthed) throw new Error("Auth required");
			return rpc.drafts.archive({ draftId: args.draftId });
		},
		onSuccess: async (_data, variables) => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.drafts.list.key(),
			});
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.drafts.get.key({
					input: { draftId: variables.draftId },
				}),
			});
		},
	});
}
