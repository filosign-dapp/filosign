import { useUserProfile } from "@filosign/react/users";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { isPersonalizationComplete } from "@/src/lib/auth/account-defaults";
import { Loader } from "@/src/lib/components/ui/loader";
import {
	coldInviteEntrySearchSchema,
	signDocumentSearchFromColdEntry,
} from "@/src/lib/domains/invites/cold-invite-search";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

export default function OnboardingProtector({
	children,
}: {
	children: React.ReactNode;
}) {
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

	if (!ready || !authenticated) {
		return <>{children}</>;
	}

	if (profilePending) {
		return <Loader />;
	}

	if (isPersonalizationComplete(profile)) {
		if (coldSignSearch) {
			return (
				<Navigate
					to="/dashboard/document/sign"
					search={coldSignSearch}
					replace
				/>
			);
		}
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}
