import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRenameOrgTemplate() {
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { templateId: string; name: string }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpc.orgs.templates.rename({
				templateId: args.templateId,
				name: args.name.trim(),
			});
		},
		onSuccess: async (data, variables) => {
			await queryClient.invalidateQueries({ queryKey: rpcQuery.orgs.key() });
			queryClient.setQueryData(
				rpcQuery.orgs.templates.get.key({
					input: { templateId: variables.templateId },
				}),
				(prev) => {
					if (!prev || typeof prev !== "object" || !("template" in prev)) {
						return prev;
					}
					const head = prev as {
						template: { name: string; updatedAt?: Date };
					};
					return {
						...head,
						template: {
							...head.template,
							name: data.template.name,
							updatedAt: data.template.updatedAt,
						},
					};
				},
			);
		},
	});
}
