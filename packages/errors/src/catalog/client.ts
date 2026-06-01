import type { ErrorDefinition } from "../types";

export const clientErrors = {
	"CLIENT.CRYPTO.NOT_UNLOCKED": {
		title: "Unlock your wallet to continue",
		description:
			"Unlock with your wallet, or enter your recovery phrase if the app asks.",
		steps: [
			"Complete the unlock or recovery prompt on screen.",
			"Retry the action.",
		],
		supportSlug: "wallet-not-unlocked",
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"CLIENT.CRYPTO.NO_SEED": {
		title: "Signing keys not available",
		description: "We could not load your signing keys in this session.",
		steps: [
			"Sign out and sign in again.",
			"Complete wallet setup or recovery if prompted.",
		],
		supportSlug: "wallet-keys-unavailable",
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
} as const satisfies Record<string, ErrorDefinition>;
