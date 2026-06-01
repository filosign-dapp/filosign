import type { ErrorDefinition } from "../types";

export const genericErrors = {
	"GENERIC.UNKNOWN": {
		title: "Something went wrong",
		description: "We could not complete that action. Try again.",
		steps: [
			"Refresh the page and try again.",
			"If it keeps happening, contact support.",
		],
		supportSlug: "something-went-wrong",
		audience: "user",
		severity: "error",
		defaultOrpcCode: "INTERNAL_SERVER_ERROR",
		showSupportLink: true,
	},
	"GENERIC.NETWORK": {
		title: "Connection problem",
		description:
			"We could not reach Filosign. Check your internet connection and try again.",
		steps: [
			"Verify you are online.",
			"Retry the action.",
			"Try another network if the problem continues.",
		],
		supportSlug: "connection-problem",
		audience: "user",
		severity: "error",
		defaultOrpcCode: "INTERNAL_SERVER_ERROR",
		showSupportLink: true,
	},
	"AUTH.UNAUTHORIZED": {
		title: "Sign in required",
		description: "Your session expired or you are not signed in.",
		steps: [
			"Sign out and sign in again.",
			"Complete wallet unlock if prompted.",
		],
		supportSlug: "sign-in-required",
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "UNAUTHORIZED",
		showSupportLink: true,
	},
} as const satisfies Record<string, ErrorDefinition>;
