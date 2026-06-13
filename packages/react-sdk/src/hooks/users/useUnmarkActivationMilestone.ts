import type { UserRevocableActivationMilestoneId } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useUnmarkActivationMilestone() {
	const { rpc, rpcQuery } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (milestone: UserRevocableActivationMilestoneId) => {
			await rpc.users.activation.unmark({ milestone });
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.users.activation.get.key(),
			});
		},
	});
}
