import type { InferClientInputs } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

type PrepareOrgTemplateUpdateInput =
	InferClientInputs<AppRouterClient>["orgs"]["templates"]["prepareUpdate"];

export function usePrepareOrgTemplateUpdate() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	return useMutation({
		mutationFn: async (args: PrepareOrgTemplateUpdateInput) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.templates.prepareUpdate.call(args);
		},
	});
}
