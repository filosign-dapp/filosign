import type { InferClientInputs } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

type OrgInviteCreateInput =
	InferClientInputs<AppRouterClient>["orgs"]["invites"]["create"];

export function useInviteOrgMember() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			email: string;
			role?: OrgInviteCreateInput["role"];
		}) => {
			if (!isAuthed) throw new Error("Not authenticated");
			const payload: OrgInviteCreateInput = {
				email: args.email.trim(),
				...(args.role !== undefined ? { role: args.role } : {}),
			};
			return rpcQuery.orgs.invites.create.call(payload);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.key(),
			});
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.orgs.listMine.key(),
			});
		},
	});
}
