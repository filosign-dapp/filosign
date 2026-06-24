import { z } from "zod";
import type { ErrorDefinition } from "../types";

export const filesErrors = {
	"FILES.NOT_FOUND": {
		title: "Document not found",
		description:
			"We could not locate the requested document in this workspace.",
		steps: [
			"Check the document ID in your URL.",
			"Confirm you are signed in to the correct workspace context.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"FILES.REGISTRATION_PENDING": {
		title: "Document registration in progress",
		description:
			"This envelope is still being confirmed on chain. Try again in a moment.",
		steps: [
			"Wait for on-chain registration to finish.",
			"If this persists, ask the sender to retry sending the envelope.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "CONFLICT",
	},
	"FILES.FORBIDDEN": {
		title: "Access denied",
		description: "You do not have permission to view or manage this document.",
		steps: [
			"Verify that you are using the correct wallet or account.",
			"Ask the workspace administrator for access.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"FILES.ENVELOPE_COMPLETE": {
		title: "Document already completed",
		description:
			"This envelope is complete on-chain. Signing is closed; you can still view or download the signed document.",
		steps: ["View or download the final signed document from this page."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"FILES.ENVELOPE_VOIDED": {
		title: "Document cancelled",
		description: "The sender cancelled this document. It can't be signed.",
		steps: ["Contact the sender to request a new envelope."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"FILES.ALREADY_ACKED": {
		title: "Document already accepted",
		description: "You have already accepted this document.",
		steps: ["Proceed to the signing step."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "CONFLICT",
	},
	"DRAFTS.NOT_FOUND": {
		title: "Draft not found",
		description: "The requested document draft could not be found.",
		steps: [
			"Verify the draft ID in the URL.",
			"Check if the draft was already sent or deleted.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"DRAFTS.FORBIDDEN": {
		title: "Draft access denied",
		description: "You do not have permission to view or edit this draft.",
		steps: [
			"Ensure you are logged into the correct account.",
			"Verify workspace membership.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"DRAFTS.NOT_EDITABLE": {
		title: "Draft is not editable",
		description:
			"This draft has already been sent, voided, or is currently locked.",
		steps: ["Create a new draft if you need to make changes."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"DRAFTS.SHARE_NOT_FOUND": {
		title: "Share link not found",
		description: "The draft sharing link is invalid or has expired.",
		steps: ["Ask the author to send a new share link."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"DRAFTS.INVITE_NOT_FOUND": {
		title: "Draft invite not found",
		description:
			"The invitation to view or collaborate on this draft was not found.",
		steps: [
			"Confirm you copied the invite URL correctly.",
			"Request a new invite from the draft owner.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"DRAFTS.RATE_LIMITED": {
		title: "Too many requests",
		description:
			"This draft review link received too many requests. Wait a moment and try again.",
		steps: [
			"Wait a minute before retrying.",
			"If this keeps happening, ask the draft owner for a new link.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"FILES.COMPLIANCE_EXPORT_NOT_ALLOWED": {
		title: "Export not ready yet",
		description: "Wait until signing finishes or the document is cancelled.",
		steps: [
			"Wait for all signers to complete the document.",
			"If the document is voided, you can export it then.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"FILES.INVALID_PLACEMENT_MANIFEST": {
		title: "Document data unavailable",
		description:
			"This document is missing required placement data and cannot be processed.",
		steps: [
			"Contact the sender to resend the envelope.",
			"If you are the sender, recreate the envelope from your drafts.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "INTERNAL_SERVER_ERROR",
	},
	"FILES.COMPLIANCE_EXPORT_FAILED": {
		title: "Compliance export failed",
		description:
			"We could not generate the compliance export bundle. Try again shortly.",
		steps: [
			"Refresh the page and retry the export.",
			"If the problem continues, contact support.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "INTERNAL_SERVER_ERROR",
	},
	"DRAFTS.REVISION_CONFLICT": {
		title: "Draft updated elsewhere",
		description:
			"This draft was modified by another session. Please reload and try again.",
		steps: [
			"Reload the page to fetch the latest changes.",
			"Re-apply your recent edits.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "CONFLICT",
	},
	"FILES.UPLOAD_MISSING": {
		title: "Upload not finished",
		description:
			"The document file has not finished uploading to storage. Please wait or try uploading again.",
		steps: [
			"Wait a moment for the upload to complete.",
			"If it fails, retry uploading the file.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"FILES.INVITE_NOT_FOUND": {
		title: "Document invite not found",
		description:
			"We could not find a pending invitation for this email address.",
		steps: [
			"Confirm you are signed in with the email address where you received the invitation.",
			"Contact the sender to verify they sent the invite to this email address.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"FILES.SIGNER_EMAIL_REQUIRED": {
		title: "Signer email required",
		description:
			"The signer {{wallet}} does not have a primary email address registered.",
		steps: [
			"Ensure the participant has registered and set a primary email address.",
			"Verify the wallet address of the signer.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
		paramsSchema: z.object({
			wallet: z.string(),
		}),
	},
	"FILES.REPLACEMENT_PENDING": {
		title: "Signer change pending",
		description: "Finish or cancel the signer change first.",
		steps: [
			"Wait for the current signer change to finish or cancel it.",
			"Check that the update completed in your wallet.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"FILES.REPLACEMENT_RELAY_FAILED": {
		title: "Signer change failed",
		description: "{{reason}}",
		steps: [
			"Check your network connection and wallet state.",
			"Confirm you signed the authorization payload correctly.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
		paramsSchema: z.object({
			reason: z.string(),
		}),
	},
	"FILES.NO_PENDING_REPLACEMENT": {
		title: "No pending signer change",
		description: "No pending signer change was found for this document.",
		steps: [
			"Ensure a signer change was proposed and is still waiting to be applied.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
} as const satisfies Record<string, ErrorDefinition>;
