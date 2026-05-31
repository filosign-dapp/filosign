import type { InferClientInputs } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type SubmitSettlementFeatureAccessRequestInput =
	InferClientInputs<AppRouterClient>["orgs"]["settlementFeatureAccess"]["submitRequest"];

export function useSubmitSettlementFeatureAccessRequest() {
	const { rpcQuery } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: SubmitSettlementFeatureAccessRequestInput) =>
			rpcQuery.orgs.settlementFeatureAccess.submitRequest.call(input),
		onSuccess: (_data, variables) => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.settlementFeatureAccess.get.queryKey({
					input: { organizationId: variables.organizationId },
				}),
			});
		},
	});
}
