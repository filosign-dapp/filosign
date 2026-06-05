import type { UserSignatureRole } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useSetDefaultSignature() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: { id: string; role: UserSignatureRole }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.users.signatures.setDefault.call(args);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.users.profile.me.key(),
			});
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.users.signatures.list.key(),
			});
		},
	});
}
