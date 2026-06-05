import type { Address } from "viem";
import { z } from "zod";
import { userAvatarWebpKey } from "@/lib/domains/files";
import { bucket } from "@/lib/platform/s3/client";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

/** Extend with discriminated unions as new wallet-scoped WebP kinds ship. */
export const zStoragePresignPutInput = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("webp_user_avatar") }),
]);

export type StoragePresignPutInput = z.infer<typeof zStoragePresignPutInput>;

/** Private bucket: presigned PUT only (no ACL). Caller must PUT `image/webp` bytes. */
export function storagePresignPut(
	wallet: Address,
	input: StoragePresignPutInput,
) {
	if (input.kind !== "webp_user_avatar") {
		throw throwZodBadRequest(
			new z.ZodError([
				{
					code: "custom",
					path: ["kind"],
					message: "Unsupported storage kind",
				},
			]),
		);
	}
	const key = userAvatarWebpKey(wallet);

	const expiresInSeconds = 60 * 15;
	const uploadUrl = bucket.presign(key, {
		method: "PUT",
		expiresIn: expiresInSeconds,
		type: "image/webp",
	});

	return { uploadUrl, key, expiresInSeconds };
}
