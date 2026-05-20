import { useIsRegistered } from "@filosign/react/auth";
import { Navigate, useRouterState } from "@tanstack/react-router";
import {
	coldInviteEntrySearchSchema,
	signDocumentSearchFromColdEntry,
} from "@/src/lib/domains/invites/cold-invite-search";
import { useThirdwebConnection } from "@/src/lib/web3/hooks/use-thirdweb-connection";

export default function OnboardingProtector({
	children,
	allowRegistered = false,
}: {
	children: React.ReactNode;
	allowRegistered?: boolean;
}) {
	const { ready } = useThirdwebConnection();
	const isRegistered = useIsRegistered();
	const coldSignSearch = useRouterState({
		select: (s) => {
			const p = coldInviteEntrySearchSchema.safeParse(s.location.search);
			return p.success ? signDocumentSearchFromColdEntry(p.data) : null;
		},
	});

	if (!allowRegistered && ready && isRegistered.data) {
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
