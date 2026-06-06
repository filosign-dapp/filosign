import type { FieldCompletionMap } from "@filosign/shared";
import { fieldCompletionInputMapFromStored } from "@filosign/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useSignDraft(pieceCid: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.files.piece.signDraftGet.queryOptions({
			input: { pieceCid: pieceCid ?? "" },
		}),
		enabled: isAuthed && !!pieceCid,
		select: (data) => ({
			completedFieldIds: data.completedFieldIds,
			fieldCompletions: data.fieldCompletions,
		}),
	});
}

export function useUpdateSignDraft() {
	const queryClient = useQueryClient();
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async (args: {
			pieceCid: string;
			completedFieldIds: string[];
			fieldCompletions?: FieldCompletionMap;
		}) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.files.piece.signDraftPut.call({
				pieceCid: args.pieceCid,
				body: {
					completedFieldIds: args.completedFieldIds,
					...(args.fieldCompletions &&
					Object.keys(args.fieldCompletions).length > 0
						? {
								fieldCompletions: fieldCompletionInputMapFromStored(
									args.fieldCompletions,
								),
							}
						: {}),
				},
			});
		},
		onSuccess: (data, variables) => {
			queryClient.setQueryData(
				rpcQuery.files.piece.signDraftGet.queryKey({
					input: { pieceCid: variables.pieceCid },
				}),
				data,
			);
		},
	});
}
