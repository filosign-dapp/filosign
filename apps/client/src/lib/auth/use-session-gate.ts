import { useFilosignContext } from "@filosign/react";
import { useIdentifyAnalyticsWallet } from "@filosign/react/analytics";
import {
	useCryptoUnlocked,
	useIsLoggedIn,
	useIsRegistered,
} from "@filosign/react/auth";
import { useEffect } from "react";
import { useThirdweb } from "@/src/lib/web3/use-thirdweb";
import {
	canAttemptWalletLogin,
	isDashboardEntryAllowed,
	isFilosignSessionActive,
	type SessionGateFlags,
	shouldRedirectToSignIn,
	shouldShowSessionBootstrapLoader,
} from "./session-state";

export function useSessionGateFlags(): SessionGateFlags {
	const { ready, authenticated } = useThirdweb();
	const { wallet } = useFilosignContext();
	const isRegistered = useIsRegistered();
	const apiSession = useIsLoggedIn();
	const cryptoUnlocked = useCryptoUnlocked();

	return {
		ready,
		authenticated,
		hasWalletClient: Boolean(wallet?.account?.address),
		isRegistered: isRegistered.data,
		isRegisteredPending: isRegistered.isPending,
		isApiSessionActive: apiSession.data,
		isApiSessionPending: apiSession.isPending,
		isApiSessionError: apiSession.isError,
		isCryptoUnlocked: cryptoUnlocked.data,
		isCryptoUnlockedPending: cryptoUnlocked.isPending,
	};
}

export function useSessionGateAnalytics() {
	const { wallet } = useFilosignContext();
	const apiSession = useIsLoggedIn();
	const identifyAnalyticsWallet = useIdentifyAnalyticsWallet();

	useEffect(() => {
		if (apiSession.data && wallet?.account?.address) {
			identifyAnalyticsWallet(wallet.account.address);
		}
	}, [apiSession.data, wallet?.account?.address, identifyAnalyticsWallet]);
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
