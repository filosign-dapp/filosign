import { z } from "zod";
import type { ErrorDefinition } from "../types";

export const settlementsErrors = {
	"SETTLEMENTS.RULE_NOT_FOUND": {
		title: "Settlement rule not found",
		description:
			"We could not find the specified settlement rule for this document.",
		steps: [
			"Verify the document ID and settlement rule configuration.",
			"Confirm you are logged in to the correct wallet address.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"SETTLEMENTS.FORBIDDEN": {
		title: "Access denied",
		description:
			"You do not have permission to configure or execute settlements for this document.",
		steps: [
			"Ensure your connected wallet is a participant in this envelope.",
			"If you are managing workspace settings, verify your permissions.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"SETTLEMENTS.INVALID_PAYOUT_TOTAL": {
		title: "Invalid payout total",
		description:
			"The total payment amounts or percentages do not match the required rule logic.",
		steps: [
			"Check the payment distribution values in the form.",
			"Ensure the sum of allocations equals 100% or matches the document total.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.TOKEN_NOT_SUPPORTED": {
		title: "Token not supported",
		description:
			"The payment token address requested is not approved or supported by this platform.",
		steps: [
			"Select a supported payment token (e.g. USDC).",
			"Check the network and token address configuration.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.ON_CHAIN_MISMATCH": {
		title: "On-chain verification mismatch",
		description:
			"The settlement rule parameters do not match the on-chain registered state.",
		steps: [
			"Wait a few moments for the blockchain to sync.",
			"Confirm you signed the transaction with the correct configuration.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.INVALID_TX_HASH": {
		title: "Invalid transaction hash",
		description:
			"The transaction hash provided for settlement verification is invalid or not found.",
		steps: [
			"Verify the transaction hash on the block explorer.",
			"Wait for the transaction to be confirmed on-chain.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.RULE_MUTATION_NOT_ALLOWED": {
		title: "Rule cannot be updated",
		description:
			"This settlement rule has already been verified, locked, or active and cannot be modified.",
		steps: [
			"If you need to make changes, propose a new signer replacement or cancel the rule first.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.VERIFICATION_FAILED": {
		title: "Settlement verification failed",
		description: "{{reason}}",
		steps: [
			"Review the verification mismatch reason.",
			"Ensure the smart contract registry state matches the database.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
		paramsSchema: z.object({
			reason: z.string(),
		}),
	},
	"ATTACHMENTS.PACKET_NOT_FOUND": {
		title: "Attachment packet not found",
		description: "The requested attachment packet could not be located.",
		steps: [
			"Check the packet identifier.",
			"Confirm the parent document still has attachments.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"ATTACHMENTS.FORBIDDEN": {
		title: "Attachment access denied",
		description:
			"You do not have permission to view or manage attachments for this document.",
		steps: [
			"Ensure you are a registered participant or signer of the document.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"SETTLEMENTS.TERMS_OUTDATED": {
		title: "Addendum terms outdated",
		description:
			"The Settlement Feature Addendum terms version you accepted is outdated.",
		steps: [
			"Refresh the page to load the latest addendum terms.",
			"Review and accept the current terms again.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"SETTLEMENTS.ACCESS_REQUEST_PENDING": {
		title: "Access request pending review",
		description:
			"A payout attachment access request is already pending review.",
		steps: [
			"Wait for a platform administrator to review your request.",
			"Contact support if your request is urgent.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "CONFLICT",
	},
	"SETTLEMENTS.FEATURE_ACCESS_REQUIRED": {
		title: "Payout attachment disabled",
		description: "Payout attachment is not enabled for this workspace.",
		steps: ["Request access in workspace settings."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"SETTLEMENTS.ACCESS_REQUEST_NOT_FOUND": {
		title: "Access request not found",
		description:
			"No settlement feature access request was found for this workspace.",
		steps: ["Ensure you have submitted an access request for this workspace."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
} as const satisfies Record<string, ErrorDefinition>;
