export {
	buildSignatureFontOptions,
	deriveSignatureInitials,
	renderTypedSignatureSvg,
	resolveSignatureFontId,
	typedSignatureArtifactPreviewSrc,
} from "@filosign/shared";
export {
	type EnsuredSignatureArtifact,
	ensureDefaultTypedSignatureArtifact,
} from "../../lib/ensure-default-signature-artifact";
export {
	prefetchDefaultTypedSignatures,
	type SignaturePrefetchProfile,
	signatureRolesNeedingPrefetch,
} from "../../lib/prefetch-default-signatures";
export { rasterizeTypedSignature } from "../../lib/rasterize-typed-signature";
export {
	dataUrlToBytes,
	intrinsicAspectRatioFromBytes,
	svgStringToBytes,
} from "../../lib/upload-user-signature";
export { useActivationProgress } from "./useActivationProgress";
export { useCreateUserSignature } from "./useCreateUserSignature";
export { useDeleteUserSignature } from "./useDeleteUserSignature";
export { useMarkActivationMilestone } from "./useMarkActivationMilestone";
export {
	type ProfileByAddress,
	useProfilesByAddresses,
} from "./useProfilesByAddresses";
export { useProvisionPracticeEnvelope } from "./useProvisionPracticeEnvelope";
export { useSetDefaultSignature } from "./useSetDefaultSignature";
export { useSetPrimaryEmail } from "./useSetPrimaryEmail";
export { useSyncThirdwebEmail } from "./useSyncThirdwebEmail";
export { useUnmarkActivationMilestone } from "./useUnmarkActivationMilestone";
export { useUpdateUserProfile } from "./useUpdateUserProfile";
export {
	fetchUserProfile,
	type UserProfile,
	type UseUserProfileOptions,
	useUserProfile,
} from "./useUserProfile";
export { useUserProfileByQuery } from "./useUserProfileByQuery";
export { useUserSignatures } from "./useUserSignatures";
