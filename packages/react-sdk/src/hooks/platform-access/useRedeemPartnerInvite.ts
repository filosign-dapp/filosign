import type { AppRouterClient } from "@filosign/react/orpc";
import type { InferClientOutputs } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { invalidateEntitlements } from "../../lib/invalidate-queries";

export type RedeemPartnerInviteResult =
	InferClientOutputs<AppRouterClient>["platformAccess"]["redeemPartnerInvite"];

export function useRedeemPartnerInvite() {
	const { rpc, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["fsM-redeem-partner-invite"],
		mutationFn: async (input: {
			platformInviteToken: string;
			organizationId?: string;
		}) => rpc.platformAccess.redeemPartnerInvite(input),
		onSuccess: async () => {
			await invalidateEntitlements(queryClient, rpcQuery);
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.billing.getWorkspaceBillingContext.key(),
			});
		},
	});
}
