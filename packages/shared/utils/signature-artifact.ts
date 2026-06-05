import { z } from "zod";

export const zUserSignatureKind = z.enum(["typed", "drawn", "uploaded"]);
export const zUserSignatureRole = z.enum(["signature", "initial"]);

export const zTypedSignatureMeta = z.object({
	text: z.string().min(1),
	fontId: z.string().min(1),
});

export const SIGNATURE_FIELD_BASE_RECT = {
	signature: { width: 200, height: 28 },
	initial: { width: 80, height: 28 },
} as const;

export const SIGNATURE_RECT_ASPECT_RATIO =
	SIGNATURE_FIELD_BASE_RECT.signature.width /
	SIGNATURE_FIELD_BASE_RECT.signature.height;
export const INITIAL_RECT_ASPECT_RATIO =
	SIGNATURE_FIELD_BASE_RECT.initial.width /
	SIGNATURE_FIELD_BASE_RECT.initial.height;

export const zContentSha256Hex = z.string().regex(/^[0-9a-f]{64}$/, {
	error: "contentSha256 must be 64 lowercase hex chars",
});

export const zUserSignatureArtifact = z.object({
	id: z.uuid(),
	walletAddress: z.string(),
	kind: zUserSignatureKind,
	role: zUserSignatureRole,
	storageKey: z.string(),
	contentType: z.string(),
	contentSha256: zContentSha256Hex,
	typedMeta: zTypedSignatureMeta.nullable(),
	intrinsicAspectRatio: z.number().positive().nullable(),
	previewUrl: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const zUserSignatureCreateInput = z.object({
	kind: zUserSignatureKind,
	role: zUserSignatureRole,
	storageKey: z.string().min(1),
	contentType: z.string().min(1),
	contentSha256: zContentSha256Hex,
	typedMeta: zTypedSignatureMeta.optional(),
	intrinsicAspectRatio: z.number().positive().optional(),
});

export const zUserSignatureSetDefaultInput = z.object({
	id: z.uuid(),
	role: zUserSignatureRole,
});

export type UserSignatureKind = z.infer<typeof zUserSignatureKind>;
export type UserSignatureRole = z.infer<typeof zUserSignatureRole>;
export type TypedSignatureMeta = z.infer<typeof zTypedSignatureMeta>;
export type UserSignatureArtifact = z.infer<typeof zUserSignatureArtifact>;
export type UserSignatureCreateInput = z.infer<
	typeof zUserSignatureCreateInput
>;

export async function contentSha256Hex(bytes: Uint8Array): Promise<string> {
	const buf = bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
	const digest = await crypto.subtle.digest("SHA-256", buf);
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export function extensionForContentType(contentType: string): string {
	const ct = contentType.toLowerCase();
	if (ct === "image/svg+xml") return "svg";
	if (ct === "image/webp") return "webp";
	if (ct === "image/png") return "png";
	if (ct === "image/jpeg" || ct === "image/jpg") return "jpg";
	return "bin";
}
