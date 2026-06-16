import { z } from "zod";
import type { ErrorDefinition } from "../types";

export const settlementsErrors = {
	"SETTLEMENTS.RULE_NOT_FOUND": {
		title: "Payment rule not found",
		description: "We couldn't find that payment for this document.",
		steps: [
			"Refresh the page and try again.",
			"Confirm you're signed in with the correct account.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"SETTLEMENTS.FORBIDDEN": {
		title: "Access denied",
		description: "You can't manage payments for this document.",
		steps: [
			"Confirm you're a signer or sender on this document.",
			"Check your workspace permissions if managing settings.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"SETTLEMENTS.INVALID_PAYOUT_TOTAL": {
		title: "Invalid payment total",
		description: "Check amounts add up correctly.",
		steps: [
			"Review payment amounts in the form.",
			"Ensure allocations match the document total.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.TOKEN_NOT_SUPPORTED": {
		title: "Payment type not supported",
		description: "Use USDC for payouts on Filosign.",
		steps: [
			"Select USDC as the payment token.",
			"Check your wallet network settings.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.ON_CHAIN_MISMATCH": {
		title: "Payment settings out of sync",
		description: "Wait a moment and try again.",
		steps: [
			"Refresh the page.",
			"Confirm your wallet approved the payment setup.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.INVALID_TX_HASH": {
		title: "Payment not found",
		description: "We couldn't verify that payment. Try again shortly.",
		steps: [
			"Wait for the payment to finish processing.",
			"Retry from the sign page.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.RULE_MUTATION_NOT_ALLOWED": {
		title: "Payment can't be changed",
		description: "This payment is locked or already sent.",
		steps: [
			"Cancel the payment first if it hasn't been sent.",
			"Contact the sender if you need a new payment setup.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.ENVELOPE_CLOSED": {
		title: "Envelope is complete",
		description:
			"Payouts can only be attached while the envelope is still open for signing.",
		steps: [
			"Attach payouts before everyone has signed, or when sending the envelope.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.VERIFICATION_FAILED": {
		title: "Payment verification failed",
		description: "{{reason}}",
		steps: [
			"Review the message above.",
			"Refresh the sign page and try again.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
		paramsSchema: z.object({
			reason: z.string(),
		}),
	},
	"ATTACHMENTS.PACKET_NOT_FOUND": {
		title: "Attached files not found",
		description: "We couldn't find those files for this document.",
		steps: [
			"Refresh the page.",
			"Ask the sender to resend if files are missing.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"ATTACHMENTS.FORBIDDEN": {
		title: "Can't access attached files",
		description: "You don't have permission to view these files.",
		steps: ["Confirm you're a signer on this document."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"SETTLEMENTS.TERMS_OUTDATED": {
		title: "Payout terms updated",
		description: "Review and accept the latest terms.",
		steps: [
			"Refresh the page.",
			"Accept the current payout terms in Workspace settings.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.ACCESS_REQUEST_PENDING": {
		title: "Payout access pending",
		description: "We're reviewing your request.",
		steps: [
			"Check Workspace settings for status.",
			"Contact support if it's urgent.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "CONFLICT",
	},
	"SETTLEMENTS.FEATURE_ACCESS_REQUIRED": {
		title: "Payout access required",
		description: "Request access in Workspace settings first.",
		steps: ["Go to Workspace settings → Payout access."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"SETTLEMENTS.ACCESS_REQUEST_NOT_FOUND": {
		title: "Access request not found",
		description: "Submit a payout access request in Workspace settings.",
		steps: ["Go to Workspace settings → Payout access."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
} as const satisfies Record<string, ErrorDefinition>;
