import type { InferClientInputs } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type CreateOrgTemplateInput =
	InferClientInputs<AppRouterClient>["orgs"]["templates"]["create"];

export function useCreateOrgTemplate() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: CreateOrgTemplateInput) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.templates.create.call(args);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: rpcQuery.orgs.key() });
		},
	});
}
