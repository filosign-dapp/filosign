import type { DraftPlacementManifest } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type CreateOrgTemplateInput = {
	name: string;
	s3Key: string;
	dekWrappedOmk: string;
	placementManifest: DraftPlacementManifest;
};

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
