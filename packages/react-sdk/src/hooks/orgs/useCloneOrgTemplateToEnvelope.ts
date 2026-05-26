import type { InferClientOutputs } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type OrgsTemplatesCloneOutput =
	InferClientOutputs<AppRouterClient>["orgs"]["templates"]["cloneToEnvelope"];

export function useCloneOrgTemplateToEnvelope() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	return useMutation({
		mutationFn: async (args: { templateId: string }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.templates.cloneToEnvelope.call(args);
		},
	});
}
