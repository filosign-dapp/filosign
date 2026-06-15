import type { TemplateSnapshot } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hex } from "viem";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export type UpdateOrgTemplateInput = {
	templateId: string;
	name?: string;
	headDekWrappedOmk?: Hex;
	headOmkKemCiphertext?: Hex;
	snapshot: TemplateSnapshot;
	documents: Array<{
		docId: string;
		s3Key: string;
		name: string;
		size: number;
		mimeType: string;
	}>;
};

export function useUpdateOrgTemplate() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: UpdateOrgTemplateInput) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.orgs.templates.update.call(args);
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: rpcQuery.orgs.key() });
		},
	});
}
