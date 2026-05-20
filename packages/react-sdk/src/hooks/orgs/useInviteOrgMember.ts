import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useInviteOrgMember() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { email: string; role?: string }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			const payload: Record<string, unknown> = {
				email: args.email.trim(),
			};
			if (args.role) payload.role = args.role;
			return rpcQuery.orgs.invites.create.call(payload);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.key(),
			});
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.listMine.key(),
			});
		},
	});
}
