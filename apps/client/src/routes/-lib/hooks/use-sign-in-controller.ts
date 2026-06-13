import { useFilosignContext } from "@filosign/react";
import { useIsRegistered, useLogout } from "@filosign/react/auth";
import { useUserProfile } from "@filosign/react/users";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { isPersonalizationComplete } from "@/src/lib/auth/account-defaults";
import { useAutoRegisterOptional } from "@/src/lib/auth/auto-register-provider";
import {
	hasColdReturn,
	signDocumentSearchFromColdEntry,
} from "@/src/lib/domains/invites/cold-invite-search";
import { useColdInviteRecipientWarning } from "@/src/lib/domains/invites/use-cold-invite-recipient-warning";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";
import { useSignInGate } from "@/src/routes/-lib/hooks/use-sign-in-gate";
import { executeSwitchAccountLogout } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";

export type SignInView =
	| "registration-failed"
	| "signing-in"
	| "auto-registering"
	| "bootstrap-failed"
	| "guest";

export function useSignInController() {
	const { ready, authenticated, login, logout: logoutWallet } = useThirdweb();
	const { wallet } = useFilosignContext();
	const logoutFilosign = useLogout();
	const clearOnboardingForm = useStorePersist((s) => s.clearOnboardingForm);
	const isRegistered = useIsRegistered();
	const { data: userProfile, isPending: profilePending } = useUserProfile({
		enabled: authenticated && isRegistered.data === true,
	});
	const autoRegister = useAutoRegisterOptional();
	const navigate = useNavigate();
	const [switchAccountPending, setSwitchAccountPending] = useState(false);
	const coldSearch = useSearch({ from: "/" });
	const signInGate = useSignInGate(coldSearch);

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

	const autoRegisterStatus = autoRegister?.status.status ?? "idle";
	const autoRegisterReady = autoRegisterStatus === "completed";
	const autoRegisterFailed = autoRegisterStatus === "failed";
	const autoRegisterBlocking = autoRegister?.isBlocking ?? false;

	useEffect(() => {
		if (!ready || !authenticated) return;
		if (isRegistered.isPending) return;
		if (isRegistered.data !== true) return;
		if (!autoRegisterReady) return;
		if (signSearch) {
			void navigate({
				to: "/dashboard/document/sign",
				search: signSearch,
				replace: true,
			});
			return;
		}
		if (profilePending) return;
		if (!isPersonalizationComplete(userProfile)) {
			void navigate({
				to: "/onboarding",
				search: {
					upgrade: coldSearch.upgrade,
					interval: coldSearch.interval,
				},
				replace: true,
			});
			return;
		}
		void navigate({
			to: "/dashboard",
			replace: true,
			search: {
				upgrade: coldSearch.upgrade,
				interval: coldSearch.interval,
			},
		});
	}, [
		ready,
		authenticated,
		isRegistered.isPending,
		isRegistered.data,
		autoRegisterReady,
		navigate,
		signSearch,
		profilePending,
		userProfile,
		coldSearch.upgrade,
		coldSearch.interval,
	]);

	const walletAddress = wallet?.account.address;
	const walletReady = Boolean(walletAddress);
	const checkingRegistration = walletReady && isRegistered.isLoading;

	const signingIn =
		authenticated &&
		(!walletReady || checkingRegistration || autoRegisterBlocking);
	const registrationCheckFailed =
		authenticated &&
		walletReady &&
		(isRegistered.isError ||
			(autoRegisterFailed && autoRegister?.status.status === "failed"));
	const bootstrapFailed =
		autoRegisterFailed &&
		autoRegister?.status.status === "failed" &&
		autoRegister.status.phase === "bootstrap";
	const buttonLoading = !ready;

	const view: SignInView = registrationCheckFailed
		? bootstrapFailed
			? "bootstrap-failed"
			: "registration-failed"
		: signingIn
			? autoRegisterBlocking
				? "auto-registering"
				: "signing-in"
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
		autoRegisterStatus,
		autoRegisterFailedPhase:
			autoRegister?.status.status === "failed"
				? autoRegister.status.phase
				: null,
		autoRegisterError:
			autoRegister?.status.status === "failed"
				? autoRegister.status.error
				: null,
		retryAutoRegister: autoRegister?.retry,
		handleSwitchAccountFromSignIn,
		login,
		signInGate,
	};
}

export type SignInController = ReturnType<typeof useSignInController>;
