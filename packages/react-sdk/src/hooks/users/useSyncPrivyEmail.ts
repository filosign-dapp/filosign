import { useMutation } from "@tanstack/react-query";
import { useInvalidateUserProfile } from "../../lib/invalidate-user-profile";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useSyncPrivyEmail() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const invalidateUser = useInvalidateUserProfile();

	return useMutation({
		mutationFn: async (args: { identityToken: string }) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return rpcQuery.users.profile.syncThirdwebEmail.call(args);
		},
		onSuccess: () => {
			invalidateUser();
		},
	});
}
