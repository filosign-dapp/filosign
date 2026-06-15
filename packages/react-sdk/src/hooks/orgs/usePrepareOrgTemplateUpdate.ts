import { useMutation } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function usePrepareOrgTemplateUpdate() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	return useMutation({
		mutationFn: async (args: { templateId: string; docIds: string[] }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.templates.prepareUpdate.call(args);
		},
	});
}
