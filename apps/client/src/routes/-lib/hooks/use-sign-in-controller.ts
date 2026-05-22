import { useFilosignContext } from "@filosign/react";
import { useIsRegistered, useLogout } from "@filosign/react/auth";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
	hasColdReturn,
	signDocumentSearchFromColdEntry,
} from "@/src/lib/domains/invites/cold-invite-search";
import { useColdInviteRecipientWarning } from "@/src/lib/domains/invites/use-cold-invite-recipient-warning";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";
import { executeSwitchAccountLogout } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";

export type SignInView =
	| "registration-failed"
	| "signing-in"
	| "needs-setup"
	| "guest";

export function useSignInController() {
	const { ready, authenticated, login, logout: logoutWallet } = useThirdweb();
	const { wallet } = useFilosignContext();
	const logoutFilosign = useLogout();
	const clearOnboardingForm = useStorePersist((s) => s.clearOnboardingForm);
	const isRegistered = useIsRegistered();
	const navigate = useNavigate();
	const [switchAccountPending, setSwitchAccountPending] = useState(false);
	const coldSearch = useSearch({ from: "/" });

	const coldReturn = useMemo(
		() => hasColdReturn(coldSearch),
		[coldSearch.coldPieceCid, coldSearch.coldInvite],
	);
	const signSearch = useMemo(
		() => signDocumentSearchFromColdEntry(coldSearch),
		[coldSearch.coldPieceCid, coldSearch.coldInvite, coldSearch.skipColdSign],
	);

	const continueAnywayColdSearch = useMemo(() => {
		if (!coldReturn) return undefined;
		const piece = coldSearch.coldPieceCid?.trim();
		const inv = coldSearch.coldInvite?.trim();
		if (!piece || !inv) return undefined;
		return { coldPieceCid: piece, coldInvite: inv };
	}, [coldReturn, coldSearch.coldPieceCid, coldSearch.coldInvite]);

	const coldInviteWarning = useColdInviteRecipientWarning();
	const showColdInviteMismatch =
		authenticated && coldReturn && coldInviteWarning.showWarning;

	useEffect(() => {
		if (!ready || !authenticated) return;
		if (isRegistered.isPending) return;
		if (isRegistered.data !== true) return;
		if (signSearch) {
			void navigate({
				to: "/dashboard/document/sign",
				search: signSearch,
				replace: true,
			});
			return;
		}
		void navigate({ to: "/dashboard", replace: true });
	}, [
		ready,
		authenticated,
		isRegistered.isPending,
		isRegistered.data,
		navigate,
		signSearch,
	]);

	const walletAddress = wallet?.account.address;
	const walletReady = Boolean(walletAddress);
	const checkingRegistration = walletReady && isRegistered.isLoading;

	const needsAccountSetup =
		authenticated &&
		walletReady &&
		isRegistered.data === false &&
		!checkingRegistration;

	const signingIn = authenticated && (!walletReady || checkingRegistration);
	const registrationCheckFailed =
		authenticated && walletReady && isRegistered.isError;
	const buttonLoading = !ready;

	const view: SignInView = registrationCheckFailed
		? "registration-failed"
		: signingIn
			? "signing-in"
			: needsAccountSetup
				? "needs-setup"
				: "guest";

	const handleSwitchAccountFromSignIn = async () => {
		setSwitchAccountPending(true);
		try {
			await executeSwitchAccountLogout({
				clearOnboardingForm,
				wallet,
				logoutFilosign,
				logoutWallet,
				navigate,
				stayAfterLogout: false,
			});
		} finally {
			setSwitchAccountPending(false);
		}
	};

	const goToOnboarding = () => {
		void navigate({
			to: "/onboarding",
			...(coldReturn
				? {
						search: {
							coldPieceCid: coldSearch.coldPieceCid,
							coldInvite: coldSearch.coldInvite,
						},
					}
				: {}),
		});
	};

	return {
		view,
		coldReturn,
		coldSearch,
		showColdInviteMismatch,
		coldInviteWarning,
		continueAnywayColdSearch,
		switchAccountPending,
		buttonLoading,
		isRegistered,
		handleSwitchAccountFromSignIn,
		goToOnboarding,
		login,
	};
}

export type SignInController = ReturnType<typeof useSignInController>;
