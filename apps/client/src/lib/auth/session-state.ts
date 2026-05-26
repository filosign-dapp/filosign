export type SessionGateFlags = {
	ready: boolean;
	authenticated: boolean;
	/** Wagmi wallet client available (may be true before thirdweb reports connected). */
	hasWalletClient: boolean;
	isRegistered: boolean | undefined;
	isRegisteredPending: boolean;
	/** Thirdweb Bearer + Filosign API session (`useAuthedApi`). */
	isApiSessionActive: boolean | undefined;
	isApiSessionPending: boolean;
	isApiSessionError: boolean;
	/** In-memory crypto seed matches key commitments. */
	isCryptoUnlocked: boolean | undefined;
	isCryptoUnlockedPending: boolean;
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

/** Filosign API session is active (thirdweb token on RPC). */
export function isFilosignSessionActive(flags: SessionGateFlags): boolean {
	return flags.isApiSessionActive === true;
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
	if (flags.isRegistered === true && flags.isApiSessionActive !== true) {
		return flags.isApiSessionPending && !flags.isApiSessionError;
	}
	return false;
}

/** Explicit crypto unlock (sign/view flows), not dashboard auto-unlock. */
export function canAttemptWalletLogin(flags: SessionGateFlags): boolean {
	return (
		walletSessionUp(flags) &&
		flags.isRegistered === true &&
		!flags.isRegisteredPending &&
		flags.isApiSessionActive === true &&
		flags.isCryptoUnlocked !== true
	);
}
