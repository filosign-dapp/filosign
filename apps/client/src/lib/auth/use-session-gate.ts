import { useFilosignContext } from "@filosign/react";
import { useIdentifyAnalyticsWallet } from "@filosign/react/analytics";
import { useIsLoggedIn, useIsRegistered } from "@filosign/react/auth";
import { useEffect } from "react";
import { useThirdwebWalletAuth } from "@/src/lib/web3/hooks/use-thirdweb-wallet-auth";
import {
	canAttemptWalletLogin,
	isDashboardEntryAllowed,
	isFilosignSessionActive,
	type SessionGateFlags,
	shouldRedirectToSignIn,
	shouldShowSessionBootstrapLoader,
} from "./session-state";

export function useSessionGateFlags(): SessionGateFlags {
	const { ready, authenticated } = useThirdwebWalletAuth();
	const { wallet } = useFilosignContext();
	const isRegistered = useIsRegistered();
	const isLoggedIn = useIsLoggedIn();

	return {
		ready,
		authenticated,
		hasWalletClient: Boolean(wallet?.account?.address),
		isRegistered: isRegistered.data,
		isRegisteredPending: isRegistered.isPending,
		isLoggedIn: isLoggedIn.data,
		isLoggedInPending: isLoggedIn.isPending,
		isLoggedInError: isLoggedIn.isError,
	};
}

export function useSessionGateAnalytics() {
	const { wallet } = useFilosignContext();
	const isLoggedIn = useIsLoggedIn();
	const identifyAnalyticsWallet = useIdentifyAnalyticsWallet();

	useEffect(() => {
		if (isLoggedIn.data && wallet?.account?.address) {
			identifyAnalyticsWallet(wallet.account.address);
		}
	}, [isLoggedIn.data, wallet?.account?.address, identifyAnalyticsWallet]);
}

export function useSessionGateDerived(flags: SessionGateFlags) {
	return {
		dashboardEntryAllowed: isDashboardEntryAllowed(flags),
		filosignSessionActive: isFilosignSessionActive(flags),
		shouldRedirectToSignIn: shouldRedirectToSignIn(flags),
		shouldShowBootstrapLoader: shouldShowSessionBootstrapLoader(flags),
		canAttemptWalletLogin: canAttemptWalletLogin(flags),
	};
}
