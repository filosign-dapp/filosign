import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useSetOrgMemberRole() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (args: {
			walletAddress: Address;
			role: "owner" | "admin" | "sender" | "viewer";
		}) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.members.setRole.call(args);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: rpcQuery.orgs.key() });
		},
	});
}
