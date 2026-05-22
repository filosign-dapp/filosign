import { useIsRegistered } from "@filosign/react/auth";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
	coldInviteEntrySearchSchema,
	signDocumentSearchFromColdEntry,
} from "@/src/lib/domains/invites/cold-invite-search";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";

export function useOnboardingRegisteredGuestRedirect(args: {
	registrationStarted: boolean;
	recoveryPhrase: string | null;
}) {
	const { registrationStarted, recoveryPhrase } = args;
	const navigate = useNavigate();
	const { ready } = useThirdweb();
	const isRegistered = useIsRegistered();
	const coldSignSearch = useRouterState({
		select: (s) => {
			const p = coldInviteEntrySearchSchema.safeParse(s.location.search);
			return p.success ? signDocumentSearchFromColdEntry(p.data) : null;
		},
	});

	useEffect(() => {
		if (!ready || isRegistered.isPending) return;
		if (!isRegistered.data) return;
		if (registrationStarted || recoveryPhrase) return;

		if (coldSignSearch) {
			navigate({
				to: "/dashboard/document/sign",
				search: coldSignSearch,
				replace: true,
			});
			return;
		}
		navigate({ to: "/dashboard", replace: true });
	}, [
		ready,
		isRegistered.data,
		isRegistered.isPending,
		registrationStarted,
		recoveryPhrase,
		coldSignSearch,
		navigate,
	]);
}
