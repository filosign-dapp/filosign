import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useUnlinkOrgWallet() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (organizationId: string) => {
			if (!isAuthed) throw new Error("Not authenticated");

			return rpcQuery.orgs.unlinkWallet.call({ organizationId });
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.key(),
			});
		},
	});
}
