import type { ErrorDefinition } from "../types";

export const signingErrors = {
	"SIGNING.VIEW_REQUIRED": {
		title: "Open the document first",
		description:
			"Wait for the document to load on the sign page before you tap Sign.",
		steps: [
			"Tap Accept file if you have not already.",
			"Wait until the PDF appears (unlock your wallet if prompted).",
			"Tap Sign again.",
		],
		supportSlug: "signing-view-required",
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"SIGNING.ACK_REQUIRED": {
		title: "Accept the file first",
		description:
			"Tap Accept file on the sign page before the document can open.",
		steps: [
			"Read the acceptance text on the sign page.",
			"Tap Accept file.",
			"Wait for the document to load, then sign when ready.",
		],
		supportSlug: "signing-ack-required",
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"SIGNING.VIEW_AFTER_ACK": {
		title: "Open the document after accepting",
		description:
			"Filosign needs a view recorded after you accept the file, before signing.",
		steps: [
			"Tap Accept file if you have not already.",
			"Wait until the PDF finishes loading on the sign page.",
			"Tap Sign again.",
		],
		supportSlug: "signing-view-after-ack",
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"SIGNING.VIEW_BEFORE_SIGN": {
		title: "Open the document first",
		description:
			"Wait for the document to load on the sign page before you tap Sign.",
		steps: [
			"Tap Accept file if you have not already.",
			"Wait until the PDF appears (unlock your wallet if prompted).",
			"Tap Sign again.",
		],
		supportSlug: "signing-view-before-sign",
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"SIGNING.NOT_REQUIRED": {
		title: "You are not a signer on this document",
		description: "This document does not list you as a signer.",
		steps: [
			"Check that you used the correct invite link.",
			"Contact the sender if you expected to sign.",
		],
		supportSlug: "signing-not-required",
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"SIGNING.ALREADY_SIGNED": {
		title: "You already signed",
		description: "Your signature is already on this document.",
		steps: ["Download the completed copy from your dashboard if you need one."],
		supportSlug: "signing-already-signed",
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "CONFLICT",
	},
	"SIGNING.EMAIL_REQUIRED": {
		title: "Add your email to sign",
		description:
			"Your Filosign profile needs a primary email that matches this document.",
		steps: [
			"Open Profile in the sidebar (Account → Profile).",
			"Add or verify your primary email.",
			"Return to the sign page and tap Sign again.",
		],
		supportSlug: "signing-email-required",
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SIGNING.PLACEMENT_INCOMPLETE": {
		title: "Complete all required fields",
		description: "Mark every required field on the document before signing.",
		steps: [
			"Tap each required field on the PDF (labeled Req until done).",
			"When every required field shows Done, tap Sign.",
		],
		supportSlug: "signing-placement-incomplete",
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SIGNING.SIGNATURE_INVALID": {
		title: "Signature no longer valid",
		description:
			"Your signing request could not be verified on-chain. Sign again to continue.",
		steps: [
			"Return to the document and tap Sign again.",
			"If this keeps happening, refresh the page and retry.",
		],
		supportSlug: "signing-signature-invalid",
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SIGNING.ROUTING_ORDER": {
		title: "Not your turn to sign yet",
		description:
			"This envelope uses signing order. People ahead of you must sign first.",
		steps: [
			"Check the Signing progress section on the sign page.",
			"Return and tap Sign after earlier signers finish.",
		],
		supportSlug: "signing-routing-order",
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
} as const satisfies Record<string, ErrorDefinition>;
