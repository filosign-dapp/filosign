import type { ErrorDefinition } from "../types";

export const clientErrors = {
	"CLIENT.CRYPTO.NOT_UNLOCKED": {
		title: "Unlock your keys to continue",
		description:
			"Authorize with Filosign, or enter your recovery phrase if automatic unlock does not work.",
		steps: ["Complete unlock or recovery on this screen.", "Retry the action."],
		supportSlug: "wallet-not-unlocked",
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"CLIENT.CRYPTO.NO_SEED": {
		title: "Signing keys not available",
		description: "We couldn't load your signing keys in this session.",
		steps: [
			"Sign out and sign in again.",
			"Complete account setup or recovery if needed.",
		],
		supportSlug: "wallet-keys-unavailable",
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
} as const satisfies Record<string, ErrorDefinition>;
