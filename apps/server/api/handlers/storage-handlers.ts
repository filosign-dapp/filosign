import {
	extensionForContentType,
	zContentSha256Hex,
	zUserSignatureRole,
} from "@filosign/shared";
import type { Address } from "viem";
import { z } from "zod";
import { userAvatarWebpKey } from "@/lib/domains/files";
import { userSignatureObjectKey } from "@/lib/domains/files/utils/signature-storage";
import { bucket } from "@/lib/platform/s3/client";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";

/** Extend with discriminated unions as new wallet-scoped object kinds ship. */
export const zStoragePresignPutInput = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("webp_user_avatar") }),
	z.object({
		kind: z.literal("user_signature"),
		contentType: z.string().min(1),
		contentSha256: zContentSha256Hex,
		role: zUserSignatureRole,
	}),
]);

export type StoragePresignPutInput = z.infer<typeof zStoragePresignPutInput>;

/** Private bucket: presigned PUT only (no ACL). Caller must PUT bytes with declared content type. */
export function storagePresignPut(
	wallet: Address,
	input: StoragePresignPutInput,
) {
	if (input.kind === "webp_user_avatar") {
		const key = userAvatarWebpKey(wallet);
		const expiresInSeconds = 60 * 15;
		const uploadUrl = bucket.presign(key, {
			method: "PUT",
			expiresIn: expiresInSeconds,
			type: "image/webp",
		});
		return { uploadUrl, key, expiresInSeconds };
	}

	if (input.kind !== "user_signature") {
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

	const ext = extensionForContentType(input.contentType);
	const key = userSignatureObjectKey(wallet, input.contentSha256, ext);
	const expiresInSeconds = 60 * 15;
	const uploadUrl = bucket.presign(key, {
		method: "PUT",
		expiresIn: expiresInSeconds,
		type: input.contentType,
	});

	return { uploadUrl, key, expiresInSeconds };
}
