import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useDeleteOrgTemplate() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { templateId: string }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.templates.delete.call(args);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: rpcQuery.orgs.key() });
		},
	});
}
