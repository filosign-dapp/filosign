import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRenameDraft() {
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { draftId: string; title: string }) => {
			if (!isAuthed) throw new Error("Auth required");
			return rpc.drafts.rename({
				draftId: args.draftId,
				title: args.title.trim(),
			});
		},
		onSuccess: async (data, variables) => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.documents.list.key(),
			});
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.drafts.get.key({
					input: { draftId: variables.draftId },
				}),
			});
			queryClient.setQueryData(
				rpcQuery.drafts.get.key({ input: { draftId: variables.draftId } }),
				(prev) => {
					if (!prev || typeof prev !== "object" || !("draft" in prev)) {
						return prev;
					}
					const head = prev as {
						draft: { revision: number; title: string; updatedAt?: Date };
					};
					return {
						...head,
						draft: {
							...head.draft,
							title: data.title,
							revision: data.revision,
							updatedAt: new Date(),
						},
					};
				},
			);
		},
	});
}
