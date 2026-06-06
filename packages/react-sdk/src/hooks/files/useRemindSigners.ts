import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRemindSigners(pieceCid: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			if (!pieceCid) throw new Error("pieceCid is required");
			if (!isAuthed) throw new Error("Not authenticated");

			return rpcQuery.files.remindSigners.call({ pieceCid });
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.files.key(),
			});
		},
	});
}
