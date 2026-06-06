import { useUserProfile } from "@filosign/react/users";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { isPersonalizationComplete } from "@/src/lib/auth/account-defaults";
import {
	coldInviteEntrySearchSchema,
	signDocumentSearchFromColdEntry,
} from "@/src/lib/domains/invites/cold-invite-search";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

export function useOnboardingRegisteredGuestRedirect() {
	const navigate = useNavigate();
	const { ready, authenticated } = useThirdweb();
	const { data: profile, isPending: profilePending } = useUserProfile({
		enabled: ready && authenticated,
	});
	const coldSignSearch = useRouterState({
		select: (s) => {
			const p = coldInviteEntrySearchSchema.safeParse(s.location.search);
			return p.success ? signDocumentSearchFromColdEntry(p.data) : null;
		},
	});

	useEffect(() => {
		if (!ready || !authenticated || profilePending) return;
		if (!isPersonalizationComplete(profile)) return;

		const parsedSearch = coldInviteEntrySearchSchema.safeParse(
			window.location.search,
		);
		const billingSearch = parsedSearch.success
			? {
					upgrade: parsedSearch.data.upgrade,
					interval: parsedSearch.data.interval,
				}
			: undefined;

		if (coldSignSearch) {
			navigate({
				to: "/dashboard/document/sign",
				search: coldSignSearch,
				replace: true,
			});
			return;
		}
		navigate({
			to: "/dashboard",
			replace: true,
			search: {
				upgrade: billingSearch?.upgrade,
				interval: billingSearch?.interval,
			},
		});
	}, [ready, authenticated, profile, profilePending, coldSignSearch, navigate]);
}
