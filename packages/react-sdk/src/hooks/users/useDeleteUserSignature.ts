import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useDeleteUserSignature() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { id: string }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.users.signatures.delete.call(args);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.users.signatures.list.key(),
			});
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.users.profile.me.key(),
			});
		},
	});
}
