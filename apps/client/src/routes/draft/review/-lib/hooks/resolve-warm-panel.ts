import type { DraftReviewWarmPanel } from "@/src/routes/draft/review/-lib/hooks/use-draft-review-warm-unlock";

type WarmPanelInput = {
	active: boolean;
	isWarm: boolean;
	shouldSwitchAccount: boolean;
	authenticated: boolean;
	payloadLoading: boolean;
	isRegisteredPending: boolean;
	isRegisteredData: boolean | undefined;
	apiSessionPending: boolean;
	apiSessionData: boolean | undefined;
	cryptoUnlockedPending: boolean;
	cryptoUnlockedData: boolean | undefined;
	needsRecovery: boolean;
	tryingWalletUnlock: boolean;
	missingSeedHint: boolean;
	decryptPending: boolean;
	pdfBytes: Uint8Array | null;
	decryptError: string | null;
};

export function resolveDraftReviewWarmPanel(
	input: WarmPanelInput,
): DraftReviewWarmPanel {
	if (!input.active || !input.isWarm) return null;
	if (input.shouldSwitchAccount) return "wrongAccount";
	if (!input.authenticated) return "signingIn";
	if (
		input.payloadLoading ||
		input.isRegisteredPending ||
		input.apiSessionPending ||
		input.cryptoUnlockedPending
	) {
		return "busy";
	}
	if (input.isRegisteredData === false) return "needsRegistration";
	if (!input.apiSessionData) return "busy";
	if (
		!input.cryptoUnlockedData &&
		(input.needsRecovery || input.missingSeedHint)
	) {
		return "recovery";
	}
	if (!input.cryptoUnlockedData && input.tryingWalletUnlock) {
		return "unlocking";
	}
	if (!input.cryptoUnlockedData) return "busy";
	if (input.decryptPending) return "decrypting";
	if (input.pdfBytes) return "ready";
	if (input.decryptError) return "decryptFailed";
	return "decrypting";
}

export function warmPanelStatusMessage(
	panel: DraftReviewWarmPanel,
): string | null {
	switch (panel) {
		case "signingIn":
			return "Signing in…";
		case "busy":
			return "Connecting your session…";
		case "unlocking":
			return "Unlocking encryption keys…";
		case "decrypting":
			return "Opening draft…";
		case "needsRegistration":
			return "This invite requires a Filosign account.";
		default:
			return null;
	}
}
