import type { ErrorDefinition } from "../types";

export const usersErrors = {
	"USERS.SIGNATURE_NOT_FOUND": {
		title: "Signature not found",
		description: "We could not find the signature template requested.",
		steps: [
			"Check the signature template ID.",
			"Try uploading a new signature under Account Settings.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"USERS.EMAIL_REQUIRED": {
		title: "Email address required",
		description:
			"Registration requires a verified email address from your login provider.",
		steps: [
			"Sign in using email or Google instead of a raw wallet token.",
			"Confirm that your login provider email is shared with the application.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"USERS.AUTH_PROVIDER_REQUIRED": {
		title: "Auth provider ID required",
		description:
			"The authentication provider did not supply a valid provider ID.",
		steps: ["Re-authenticate with your primary authentication provider."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"USERS.INVALID_REGISTRATION_SIGNATURE": {
		title: "Invalid registration signature",
		description:
			"The signature provided to register this account is invalid or mismatched.",
		steps: [
			"Ensure your wallet is connected and unlocked.",
			"Retry the registration process from the start.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"USERS.USER_NOT_FOUND": {
		title: "User not found",
		description:
			"We could not find the user account associated with this wallet or query.",
		steps: [
			"Verify the wallet address or username.",
			"Make sure the user has registered a Filosign profile.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"USERS.AVATAR_KEY_MISMATCH": {
		title: "Invalid avatar key",
		description: "The provided avatar key is not authorized for this wallet.",
		steps: ["Check that the avatar upload key matches your wallet address."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"USERS.AVATAR_UPLOAD_NOT_FOUND": {
		title: "Avatar upload not found",
		description: "No uploaded avatar image was found matching this key.",
		steps: [
			"Ensure you successfully uploaded the image using the presigned URL first.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"USERS.THIRDWEB_SYNC_FAILED": {
		title: "Email sync failed",
		description:
			"We could not verify your wallet email configuration via thirdweb.",
		steps: [
			"Ensure you are signed in and have authorized email sharing in thirdweb.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "UNAUTHORIZED",
	},
	"USERS.EMAIL_NOT_LINKED": {
		title: "Email not linked",
		description:
			"The requested email address is not linked to your authenticated wallet.",
		steps: ["Select a linked email address from your provider configuration."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"USERS.PRIVACY_REQUEST_NOT_FOUND": {
		title: "Privacy request not found",
		description: "The requested privacy request could not be located.",
		steps: [
			"Ensure the request identifier is correct.",
			"Check if the request has already been completed.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
} as const satisfies Record<string, ErrorDefinition>;
