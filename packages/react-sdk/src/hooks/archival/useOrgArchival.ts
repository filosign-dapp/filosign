import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useActiveOrgId } from "../orgs/useOrganizations";

export function useArchivalProducts() {
	const { rpcQuery } = useFilosignRpc();
	return useQuery(rpcQuery.archival.products.queryOptions());
}

export function useOrgArchivalStatus() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const activeOrgId = useActiveOrgId();
	return useQuery({
		...rpcQuery.archival.status.queryOptions(),
		enabled: isAuthed && Boolean(activeOrgId),
	});
}

export function usePurchaseOrgArchival() {
	const queryClient = useQueryClient();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	return useMutation({
		mutationFn: async (input: { productId: string; returnUrl: string }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.archival.purchase.call(input);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.archival.status.queryKey(),
			});
		},
	});
}
