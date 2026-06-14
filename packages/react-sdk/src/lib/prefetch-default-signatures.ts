import {
	resolveDefaultSignatureArtifact,
	type SignerProfileForTypedSignature,
	type UserSignatureArtifact,
	type UserSignatureRole,
} from "@filosign/shared";
import { ensureDefaultTypedSignatureArtifact } from "./ensure-default-signature-artifact";
import type { RpcQueryForUserSignatureUpload } from "./upload-user-signature";

const SIGNATURE_PREFETCH_ROLES = ["signature", "initial"] as const satisfies readonly UserSignatureRole[];

export type SignaturePrefetchProfile = SignerProfileForTypedSignature & {
	defaultSignatureId?: string | null;
	defaultInitialId?: string | null;
};

export function signatureRolesNeedingPrefetch(
	profile: SignaturePrefetchProfile,
	signatures: UserSignatureArtifact[],
): UserSignatureRole[] {
	return SIGNATURE_PREFETCH_ROLES.filter((role) => {
		const defaultId =
			role === "signature"
				? profile.defaultSignatureId
				: profile.defaultInitialId;
		return !resolveDefaultSignatureArtifact(signatures, role, defaultId);
	});
}

/** Best-effort typed signature + initial provisioning (non-throwing). */
export async function prefetchDefaultTypedSignatures(args: {
	rpcQuery: RpcQueryForUserSignatureUpload;
	profile: SignaturePrefetchProfile;
	signatures: UserSignatureArtifact[];
}): Promise<{ ensuredRoles: UserSignatureRole[] }> {
	const roles = signatureRolesNeedingPrefetch(args.profile, args.signatures);
	if (roles.length === 0) {
		return { ensuredRoles: [] };
	}

	const ensuredRoles: UserSignatureRole[] = [];

	await Promise.all(
		roles.map(async (role) => {
			try {
				await ensureDefaultTypedSignatureArtifact({
					rpcQuery: args.rpcQuery,
					profile: args.profile,
					role,
					signatures: args.signatures,
				});
				ensuredRoles.push(role);
			} catch {
				// Prefetch must not block navigation or sign UI.
			}
		}),
	);

	return { ensuredRoles };
}
