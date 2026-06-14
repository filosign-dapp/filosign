import { useFilosignContext } from "@filosign/react";
import { invalidateSignatureLibrary } from "@filosign/react/invalidate-queries";
import {
	ensureDefaultTypedSignatureArtifact,
	toSignaturePrefetchProfile,
	useUserProfile,
	useUserSignatures,
} from "@filosign/react/users";
import type {
	FieldCompletion,
	PlacementField,
	UserSignatureArtifact,
} from "@filosign/shared";
import { buildVisualCompletionFromArtifact } from "@filosign/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { buildSyncFieldCompletion } from "../utils/field-completion-builders";

export function useFieldProvisioning(options: {
	signDraftPieceCid: string | undefined;
}) {
	const { signDraftPieceCid } = options;
	const { rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const { data: profile } = useUserProfile();
	const { data: signaturesData } = useUserSignatures();

	const defaultArtifacts = useMemo(() => {
		const signatures = signaturesData?.signatures ?? [];
		const sigId = profile?.defaultSignatureId;
		const initId = profile?.defaultInitialId;
		return {
			signature: signatures.find((signature) => signature.id === sigId) ?? null,
			initial: signatures.find((signature) => signature.id === initId) ?? null,
		};
	}, [
		signaturesData?.signatures,
		profile?.defaultSignatureId,
		profile?.defaultInitialId,
	]);

	const refreshSignatureLibrary = useCallback(async () => {
		await Promise.all([
			invalidateSignatureLibrary(queryClient, rpcQuery),
			signDraftPieceCid
				? queryClient.invalidateQueries({
						queryKey: rpcQuery.files.piece.signDraftGet.queryKey({
							input: { pieceCid: signDraftPieceCid },
						}),
					})
				: Promise.resolve(),
		]);
	}, [queryClient, rpcQuery, signDraftPieceCid]);

	const applyFieldCompletion = useCallback(
		(field: PlacementField): FieldCompletion | null =>
			buildSyncFieldCompletion(field, defaultArtifacts, profile),
		[defaultArtifacts, profile],
	);

	const resolveVisualCompletionForField = useCallback(
		async (field: PlacementField): Promise<FieldCompletion | null> => {
			if (field.type !== "signature" && field.type !== "initial") return null;

			const role = field.type;
			const cachedArtifact =
				role === "signature"
					? defaultArtifacts.signature
					: defaultArtifacts.initial;
			if (cachedArtifact) {
				return buildVisualCompletionFromArtifact(field, cachedArtifact);
			}
			if (!profile) return null;

			let ensured: Pick<
				UserSignatureArtifact,
				"id" | "storageKey" | "contentSha256" | "previewUrl"
			>;
			try {
				ensured = await ensureDefaultTypedSignatureArtifact({
					rpcQuery,
					profile: toSignaturePrefetchProfile(profile),
					role,
					signatures: signaturesData?.signatures ?? [],
				});
			} catch {
				return null;
			}

			await refreshSignatureLibrary();
			return buildVisualCompletionFromArtifact(field, ensured);
		},
		[
			defaultArtifacts,
			refreshSignatureLibrary,
			profile,
			rpcQuery,
			signaturesData?.signatures,
		],
	);

	const resolveFieldCompletion = useCallback(
		async (field: PlacementField): Promise<FieldCompletion | null> => {
			const syncCompletion = applyFieldCompletion(field);
			if (syncCompletion) return syncCompletion;
			if (field.type === "signature" || field.type === "initial") {
				return resolveVisualCompletionForField(field);
			}
			return null;
		},
		[applyFieldCompletion, resolveVisualCompletionForField],
	);

	return {
		resolveFieldCompletion,
	};
}
