import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useAcceptOrgInvite() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { token: string }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.invites.accept.call({
				token: args.token.trim(),
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["filosign", "orgs"],
			});
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.listMine.key(),
			});
		},
	});
}
