import type { UserSignatureCreateInput } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadUserSignatureArtifact } from "../../lib/upload-user-signature";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useCreateUserSignature() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (args: {
			bytes: Uint8Array;
			contentType: string;
			role: UserSignatureCreateInput["role"];
			kind: UserSignatureCreateInput["kind"];
			typedMeta?: UserSignatureCreateInput["typedMeta"];
			intrinsicAspectRatio?: number;
			setAsDefault?: boolean;
		}) => {
			if (!isAuthed) throw new Error("Not authenticated");
			return uploadUserSignatureArtifact({
				rpcQuery,
				...args,
			});
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.users.signatures.list.key(),
			});
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.users.profile.me.key(),
			});
		},
	});
}
