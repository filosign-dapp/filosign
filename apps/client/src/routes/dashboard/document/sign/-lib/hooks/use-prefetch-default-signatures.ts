import { useFilosignContext } from "@filosign/react";
import {
	invalidateActivationProgress,
	invalidateUserProfile,
} from "@filosign/react/invalidate-queries";
import {
	prefetchDefaultTypedSignatures,
	useUserProfile,
	useUserSignatures,
} from "@filosign/react/users";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

/** Warm typed signature library while unlock / PDF load is in progress. */
export function usePrefetchDefaultSignatures(options?: { enabled?: boolean }) {
	const enabled = options?.enabled ?? true;
	const { rpcQuery, wallet } = useFilosignContext();
	const queryClient = useQueryClient();
	const walletAddress = wallet?.account.address;
	const { data: profile, isSuccess: profileReady } = useUserProfile({
		enabled,
	});
	const { data: signaturesData, isSuccess: signaturesReady } =
		useUserSignatures();
	const startedRef = useRef(false);

	useEffect(() => {
		startedRef.current = false;
	}, [walletAddress]);

	useEffect(() => {
		if (!enabled || !profileReady || !signaturesReady || !profile) return;
		if (startedRef.current) return;
		startedRef.current = true;

		const signatures = signaturesData?.signatures ?? [];

		void (async () => {
			const { ensuredRoles } = await prefetchDefaultTypedSignatures({
				rpcQuery,
				profile: {
					firstName: profile.firstName,
					lastName: profile.lastName,
					email: profile.email,
					username: profile.username,
					defaultSignatureId: profile.defaultSignatureId,
					defaultInitialId: profile.defaultInitialId,
				},
				signatures,
			});

			if (ensuredRoles.length === 0) return;

			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: rpcQuery.users.signatures.list.key(),
				}),
				invalidateUserProfile(queryClient, rpcQuery),
				invalidateActivationProgress(queryClient, rpcQuery),
			]);
		})();
	}, [
		enabled,
		profile,
		profileReady,
		queryClient,
		rpcQuery,
		signaturesData?.signatures,
		signaturesReady,
	]);
}
