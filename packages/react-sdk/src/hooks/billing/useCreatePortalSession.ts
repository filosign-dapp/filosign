import { useMutation } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useCreatePortalSession() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation({
		mutationFn: async () => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.billing.createPortalSession.call();
		},
	});
}
