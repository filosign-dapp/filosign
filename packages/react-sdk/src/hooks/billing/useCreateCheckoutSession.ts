import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { invalidateEntitlements } from "../../lib/invalidate-queries";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type CreateCheckoutSessionInput = {
	planId: "individual" | "teams" | "teams_pro";
	interval?: "monthly" | "yearly";
	returnUrl: string;
};

export function useCreateCheckoutSession() {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const { isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (input: CreateCheckoutSessionInput) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.billing.createCheckoutSession.call({
				planId: input.planId,
				interval: input.interval ?? "monthly",
				returnUrl: input.returnUrl,
			});
		},
		onSuccess: async () => {
			await invalidateEntitlements(queryClient, rpcQuery);
		},
	});
}
