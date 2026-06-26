import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRevokeOrgInvite() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { inviteId: string }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.invites.revoke.call({ inviteId: args.inviteId });
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.key(),
			});
		},
	});
}
