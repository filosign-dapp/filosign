import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRemoveOrgMember() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (args: { walletAddress: Address }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.members.remove.call(args);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["filosign", "orgs"] });
		},
	});
}
