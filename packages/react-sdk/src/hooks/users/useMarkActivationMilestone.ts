import type { ActivationMilestoneId } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useMarkActivationMilestone() {
	const { rpc, rpcQuery } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (milestone: ActivationMilestoneId) => {
			await rpc.users.activation.mark({ milestone });
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.users.activation.get.key(),
			});
		},
	});
}
