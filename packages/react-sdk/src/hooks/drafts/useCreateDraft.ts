import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useCreateDraft() {
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { title?: string }) => {
			if (!isAuthed) throw new Error("Auth required");
			return rpc.drafts.create({ title: args.title });
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.documents.list.key(),
			});
		},
	});
}
