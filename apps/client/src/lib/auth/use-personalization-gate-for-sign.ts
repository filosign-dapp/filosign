import { useUserProfile } from "@filosign/react/users";
import { useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import {
	onboardingSearchFromSignDocument,
	resolvePostAuthDestination,
} from "@/src/lib/auth/post-auth-destination";
import { useNavigatePostAuthOnce } from "@/src/lib/auth/use-navigate-post-auth-once";

/** Cold sign links require a real name before unlock/sign. */
export function usePersonalizationGateForSign() {
	const search = useSearch({ from: "/dashboard/document/sign/" });
	const { data: profile, isPending, isFetching } = useUserProfile();
	const navigatePostAuth = useNavigatePostAuthOnce({
		resetKey: `${search.pieceCid}:${search.invite}`,
	});

	const pieceCid = search.pieceCid?.trim() ?? "";
	const invite = search.invite?.trim() ?? "";
	const profileFirstName = profile?.firstName?.trim() ?? "";

	useEffect(() => {
		if (!pieceCid || !invite) return;

		const destination = resolvePostAuthDestination({
			coldSearch: onboardingSearchFromSignDocument({ pieceCid, invite }),
			signSearch: { pieceCid, invite },
			profile,
			profilePending: isPending || isFetching,
		});

		if (destination.type !== "onboarding") return;

		navigatePostAuth(destination, { replace: true });
	}, [
		invite,
		isFetching,
		isPending,
		navigatePostAuth,
		pieceCid,
		profile,
		profileFirstName,
	]);
}
