import type { InferClientInputs } from "@orpc/client";
import { useMutation } from "@tanstack/react-query";
import imageCompression from "browser-image-compression";
import { useInvalidateUserProfile } from "../../lib/invalidate-user-profile";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

type ProfileUpdateInput =
	InferClientInputs<AppRouterClient>["users"]["profile"]["update"];

type ProfileTextFields = Pick<
	ProfileUpdateInput,
	"email" | "username" | "firstName" | "lastName"
>;

export function useUpdateUserProfile() {
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
		onSuccess: () => {
			invalidateUser();
		},
	});
}
