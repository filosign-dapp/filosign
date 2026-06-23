import { useFilosignContext } from "@filosign/react";
import { useUserProfile, useUserSignatures } from "@filosign/react/users";
import type { FieldCompletion, PlacementField } from "@filosign/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { PlacementLayout } from "@/src/lib/domains/files/use-placement-layout";
import { resolvePlacementFieldCompletion } from "../utils/resolve-placement-field-completion";

export function useFieldProvisioning(options: {
	getPlacementLayout: () => PlacementLayout;
}) {
	const { getPlacementLayout } = options;
	const { rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const { data: profile } = useUserProfile();
	const { data: signaturesData } = useUserSignatures();

	const resolveFieldCompletion = useCallback(
		async (field: PlacementField): Promise<FieldCompletion | null> =>
			resolvePlacementFieldCompletion({
				field,
				defaultArtifacts: {
					signature:
						signaturesData?.signatures.find(
							(row) => row.id === profile?.defaultSignatureId,
						) ?? null,
					initial:
						signaturesData?.signatures.find(
							(row) => row.id === profile?.defaultInitialId,
						) ?? null,
				},
				profile,
				layout: getPlacementLayout(),
				rpcQuery,
				queryClient,
				signatures: signaturesData?.signatures ?? [],
			}),
		[
			getPlacementLayout,
			profile,
			queryClient,
			rpcQuery,
			signaturesData?.signatures,
		],
	);

	return {
		resolveFieldCompletion,
	};
}
