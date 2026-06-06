import {
	contentSha256Hex,
	DEFAULT_TYPED_SIGNATURE_FONT_ID,
	resolveDefaultSignatureArtifact,
	resolveTypedSignatureText,
	type SignerProfileForTypedSignature,
	type UserSignatureArtifact,
	type UserSignatureRole,
} from "@filosign/shared";
import { rasterizeTypedSignature } from "./rasterize-typed-signature";
import {
	intrinsicAspectRatioFromBytes,
	type RpcQueryForUserSignatureUpload,
	uploadUserSignatureArtifact,
} from "./upload-user-signature";

export type EnsuredSignatureArtifact = Pick<
	UserSignatureArtifact,
	"id" | "storageKey" | "contentSha256" | "previewUrl"
>;

export async function ensureDefaultTypedSignatureArtifact(args: {
	rpcQuery: RpcQueryForUserSignatureUpload;
	profile: SignerProfileForTypedSignature & {
		defaultSignatureId?: string | null;
		defaultInitialId?: string | null;
	};
	role: UserSignatureRole;
	signatures: UserSignatureArtifact[];
}): Promise<EnsuredSignatureArtifact> {
	const defaultId =
		args.role === "signature"
			? args.profile.defaultSignatureId
			: args.profile.defaultInitialId;

	const existing = resolveDefaultSignatureArtifact(
		args.signatures,
		args.role,
		defaultId,
	);
	if (existing) {
		return {
			id: existing.id,
			storageKey: existing.storageKey,
			contentSha256: existing.contentSha256,
			previewUrl: existing.previewUrl,
		};
	}

	const text = resolveTypedSignatureText({
		role: args.role,
		profile: args.profile,
	});
	const fontId = DEFAULT_TYPED_SIGNATURE_FONT_ID;
	const bytes = await rasterizeTypedSignature({
		text,
		fontId,
		role: args.role,
	});
	const contentType = "image/png";
	const contentSha256 = await contentSha256Hex(bytes);

	const { artifactId, storageKey } = await uploadUserSignatureArtifact({
		rpcQuery: args.rpcQuery,
		bytes,
		contentType,
		role: args.role,
		kind: "typed",
		typedMeta: { text, fontId },
		intrinsicAspectRatio: intrinsicAspectRatioFromBytes(
			bytes,
			contentType,
			args.role,
		),
		setAsDefault: true,
	});

	return {
		id: artifactId,
		storageKey,
		contentSha256,
		previewUrl: null,
	};
}
