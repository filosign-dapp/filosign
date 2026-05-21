import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function usePaymentRequestRetry(_pieceCid: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (onChainRuleId: string) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.payments.requestRetry.call({ onChainRuleId });
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.payments.key(),
			});
		},
	});
}
