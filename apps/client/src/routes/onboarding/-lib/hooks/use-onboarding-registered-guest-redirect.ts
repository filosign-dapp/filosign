import { useUserProfile } from "@filosign/react/users";
import { useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { isPersonalizationComplete } from "@/src/lib/auth/account-defaults";
import { resolvePostAuthDestination } from "@/src/lib/auth/post-auth-destination";
import { useNavigatePostAuthOnce } from "@/src/lib/auth/use-navigate-post-auth-once";
import { signDocumentSearchFromColdEntry } from "@/src/lib/domains/invites/cold-invite-search";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

export function useOnboardingRegisteredGuestRedirect() {
	const coldSearch = useSearch({ from: "/onboarding/" });
	const { ready, authenticated } = useThirdweb();
	const { data: profile, isPending: profilePending } = useUserProfile({
		enabled: ready && authenticated,
	});
	const navigatePostAuth = useNavigatePostAuthOnce({
		resetKey: `${coldSearch.coldPieceCid}:${coldSearch.coldInvite}:${coldSearch.skipColdSign}`,
	});

	useEffect(() => {
		if (!ready || !authenticated || profilePending) return;
		if (!isPersonalizationComplete(profile)) return;

		const destination = resolvePostAuthDestination({
			coldSearch,
			signSearch: signDocumentSearchFromColdEntry(coldSearch),
			profile,
			profilePending: false,
		});

		if (destination.type === "pending" || destination.type === "onboarding") {
			return;
		}

		navigatePostAuth(destination, { replace: true });
	}, [
		ready,
		authenticated,
		profile,
		profilePending,
		coldSearch,
		navigatePostAuth,
	]);
}
