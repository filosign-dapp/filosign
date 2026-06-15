import type { InferClientInputs } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

type PrepareOrgTemplateCreateInput =
	InferClientInputs<AppRouterClient>["orgs"]["templates"]["prepareCreate"];

export function usePrepareOrgTemplateCreate() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	return useMutation({
		mutationFn: async (args: PrepareOrgTemplateCreateInput) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.templates.prepareCreate.call(args);
		},
	});
}
