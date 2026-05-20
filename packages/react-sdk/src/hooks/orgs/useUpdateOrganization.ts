import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useUpdateOrganization() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (args: { name?: string; slug?: string }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.update.call(args);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: rpcQuery.orgs.key() });
		},
	});
}
