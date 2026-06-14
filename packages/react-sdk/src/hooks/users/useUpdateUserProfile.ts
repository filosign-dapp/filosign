import type { InferClientInputs } from "@orpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useInvalidateUserProfile } from "../../lib/invalidate-user-profile";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";
import type { UserProfile } from "./useUserProfile";

type ProfileUpdateInput =
	InferClientInputs<AppRouterClient>["users"]["profile"]["update"];

type ProfileTextFields = Pick<
	ProfileUpdateInput,
	"email" | "username" | "firstName" | "lastName"
>;

type ProfileMutationContext = {
	previous: UserProfile | undefined;
	queryKey: readonly unknown[];
};

export function useUpdateUserProfile() {
	const queryClient = useQueryClient();
	const { wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const invalidateUser = useInvalidateUserProfile();

	return useMutation({
		mutationFn: async (args: ProfileTextFields & { avatar?: File }) => {
			if (!isAuthed) throw new Error("Not authenticated");

			const { avatar, ...rest } = args;

			const payload: ProfileUpdateInput = {};
			if (rest.email !== undefined) payload.email = rest.email;
			if (rest.username !== undefined) payload.username = rest.username;
			if (rest.firstName !== undefined) payload.firstName = rest.firstName;
			if (rest.lastName !== undefined) payload.lastName = rest.lastName;

			if (avatar) {
				if (!avatar.type.startsWith("image/")) {
					throw new Error("Avatar must be an image");
				}
				const compressed = await imageCompression(avatar, {
					maxSizeMB: 32 / 1024,
					fileType: "image/webp",
					useWebWorker: true,
				});

				const { uploadUrl, key } = await rpcQuery.storage.presignPut.call({
					kind: "webp_user_avatar",
				});

				const putRes = await fetch(uploadUrl, {
					method: "PUT",
					headers: {
						"Content-Type": "image/webp",
					},
					body: compressed,
				});

				if (!putRes.ok) {
					throw new Error(`Avatar upload failed (${putRes.status})`);
				}

				payload.avatarKey = key;
			}

			if (Object.keys(payload).length === 0) {
				return {};
			}

			return rpcQuery.users.profile.update.call(payload);
		},
		onMutate: async (args): Promise<ProfileMutationContext> => {
			const walletAddress = wallet?.account.address ?? null;
			const queryKey = [
				...rpcQuery.users.profile.me.key(),
				walletAddress,
			] as const;

			await queryClient.cancelQueries({ queryKey });

			const previous = queryClient.getQueryData<UserProfile>(queryKey);
			const hasTextPatch =
				args.firstName !== undefined ||
				args.lastName !== undefined ||
				args.email !== undefined ||
				args.username !== undefined;

			if (previous && hasTextPatch) {
				queryClient.setQueryData<UserProfile>(queryKey, {
					...previous,
					...(args.firstName !== undefined
						? { firstName: args.firstName }
						: {}),
					...(args.lastName !== undefined ? { lastName: args.lastName } : {}),
					...(args.email !== undefined ? { email: args.email } : {}),
					...(args.username !== undefined ? { username: args.username } : {}),
				});
			}

			return { previous, queryKey };
		},
		onError: (_error, _args, context) => {
			if (context?.previous !== undefined) {
				queryClient.setQueryData(context.queryKey, context.previous);
			}
		},
		onSuccess: () => {
			invalidateUser();
		},
	});
}
