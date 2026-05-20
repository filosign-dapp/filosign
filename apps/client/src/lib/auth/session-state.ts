export type SessionGateFlags = {
	ready: boolean;
	authenticated: boolean;
	/** Wagmi wallet client available (may be true before thirdweb reports connected). */
	hasWalletClient: boolean;
	isRegistered: boolean | undefined;
	isRegisteredPending: boolean;
	isLoggedIn: boolean | undefined;
	isLoggedInPending: boolean;
	isLoggedInError: boolean;
};

function walletSessionUp(flags: SessionGateFlags): boolean {
	return (flags.ready && flags.authenticated) || flags.hasWalletClient;
}

/** User may enter dashboard layout (wallet connected + Filosign registered). */
export function isDashboardEntryAllowed(flags: SessionGateFlags): boolean {
	return (
		walletSessionUp(flags) &&
		flags.isRegistered === true &&
		!flags.isRegisteredPending
	);
}

/** Filosign SDK session is active (not recovery gate). */
export function isFilosignSessionActive(flags: SessionGateFlags): boolean {
	return flags.isLoggedIn === true;
}

export function shouldRedirectToSignIn(flags: SessionGateFlags): boolean {
	return (
		flags.ready &&
		(!flags.authenticated || flags.isRegistered === false) &&
		!flags.isRegisteredPending
	);
}

export function shouldShowSessionBootstrapLoader(
	flags: SessionGateFlags,
): boolean {
	if (!walletSessionUp(flags) || flags.isRegisteredPending) {
		return true;
	}
	// Registered but no in-memory seed: unlock runs next — do not wait on isLoggedIn query.
	if (flags.isRegistered === true && flags.isLoggedIn !== true) {
		return false;
	}
	return (
		flags.isLoggedIn !== true &&
		flags.isLoggedInPending &&
		!flags.isLoggedInError
	);
}

export function canAttemptWalletLogin(flags: SessionGateFlags): boolean {
	return (
		walletSessionUp(flags) &&
		flags.isRegistered === true &&
		!flags.isRegisteredPending &&
		flags.isLoggedIn !== true
	);
}
