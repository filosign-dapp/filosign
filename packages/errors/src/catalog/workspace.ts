import { z } from "zod";
import type { ErrorDefinition } from "../types";

export const workspaceErrors = {
	"WORKSPACE.SLUG_TAKEN": {
		title: "Slug already taken",
		description:
			"This organization slug is already in use by another workspace.",
		steps: [
			"Choose a different slug for your organization.",
			"Try adding unique numbers or suffixes.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "CONFLICT",
	},
	"WORKSPACE.ORGANIZATION_MISMATCH": {
		title: "Organization mismatch",
		description:
			"The requested organization does not match your active workspace context.",
		steps: [
			"Ensure you are logged into the correct organization.",
			"Switch organizations using the workspace selector in the sidebar.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.ORGANIZATION_NOT_FOUND": {
		title: "Organization not found",
		description: "We could not find the requested organization.",
		steps: [
			"Verify the organization ID or slug in the URL.",
			"Check if you still have access to this organization.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"WORKSPACE.MEMBER_NOT_FOUND": {
		title: "Member not found",
		description: "The selected member could not be found in this organization.",
		steps: [
			"Verify if the member is still active in the organization.",
			"Refresh the page and try again.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"WORKSPACE.OWNER_REQUIRED_FOR_PROMOTION": {
		title: "Owner role required",
		description:
			"Only organization owners can promote members to the owner role.",
		steps: ["Contact one of the organization owners to perform this change."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.OWNER_REQUIRED_FOR_MODIFICATION": {
		title: "Owner role required",
		description:
			"Only organization owners can modify the roles of other owners.",
		steps: ["Contact another organization owner to make this change."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.SELF_DEMOTION_FORBIDDEN": {
		title: "Cannot demote yourself",
		description: "You cannot remove your own owner status directly.",
		steps: [
			"If you want to transfer ownership, use the ownership transfer flow.",
			"Ask another owner to change your role.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.OWNER_REQUIRED": {
		title: "At least one owner required",
		description: "An organization must have at least one active owner.",
		steps: [
			"Promote another member to owner before changing your own role or leaving.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.USE_OWNERSHIP_TRANSFER": {
		title: "Use ownership transfer",
		description:
			"Removing yourself as the sole owner requires transferring organization ownership.",
		steps: [
			"Go to organization settings and initiate the ownership transfer flow.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.OWNER_REQUIRED_FOR_REMOVAL": {
		title: "Owner role required",
		description:
			"Only organization owners can remove other owners from the workspace.",
		steps: ["Contact another owner to perform this action."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.WALLET_CONTROLLER_MISMATCH": {
		title: "Connect the payment wallet",
		description: "Switch to the wallet you're linking, then try again.",
		steps: [
			"Open the wallet picker and connect the payment wallet address (EOA or Safe).",
			"Sign the link prompt from that same address.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.LINK_WALLET_SIGNATURE_INVALID": {
		title: "Invalid wallet signature",
		description:
			"The signature provided to link the organization wallet is invalid or has expired.",
		steps: [
			"Re-initiate the link wallet process.",
			"Sign the signature prompt in your wallet extension again.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"WORKSPACE.NO_WRAPPED_KEY": {
		title: "No organization key found",
		description:
			"Your account does not have a wrapped organization key in this workspace.",
		steps: [
			"Ask an administrator to grant you workspace access or re-publish your key.",
			"Try signing out and signing back in to synchronize your keys.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"WORKSPACE.NOT_MEMBER": {
		title: "Not a workspace member",
		description: "You are not a member of the requested organization.",
		steps: [
			"Verify you are signed in with the correct wallet address.",
			"Ask the administrator for an invitation.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.TARGET_NOT_ACTIVE_MEMBER": {
		title: "Target member is inactive",
		description:
			"The member you are trying to perform this action on is not active in this workspace.",
		steps: [
			"Ensure the member has accepted their invite.",
			"Check the members list for their status.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"WORKSPACE.SEAT_LIMIT_EXCEEDED": {
		title: "No available seats",
		description:
			"Your organization has reached its seat limit. You cannot invite more members.",
		steps: [
			"Go to Workspace Settings -> Billing & Plans to purchase additional seats.",
			"Remove inactive members or pending invites to free up seats.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.OWNER_INVITE_REQUIRED": {
		title: "Owner role required",
		description:
			"Only organization owners can invite new members with the owner role.",
		steps: [
			"Ask an owner to send the invitation.",
			"Invite the member with a different role first and promote them later.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.INVITE_ALREADY_EXISTS": {
		title: "Invite already exists",
		description: "An active invitation already exists for this email address.",
		steps: [
			"Check the pending invites list.",
			"You can resend or cancel the existing invitation.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "CONFLICT",
	},
	"WORKSPACE.EMAIL_REQUIRED_FOR_ACCEPT": {
		title: "Email address required",
		description:
			"You must add and verify a primary email on your Filosign profile before accepting a workspace invite.",
		steps: [
			"Navigate to Account -> Profile.",
			"Add your email address and verify it.",
			"Return to the invite link to accept.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"WORKSPACE.INVITE_NOT_FOUND": {
		title: "Invitation not found",
		description:
			"The invitation link is invalid, has expired, or was already claimed.",
		steps: [
			"Confirm you copied the entire invite link.",
			"Ask the administrator to send a new invitation link.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"WORKSPACE.INVITE_EMAIL_MISMATCH": {
		title: "Email address mismatch",
		description:
			"This invitation was sent to a different email address than the one on your Filosign profile.",
		steps: [
			"Ensure you are logged into Filosign with the correct account.",
			"Request the administrator to send the invite to your registered email.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.TEMPLATE_NOT_FOUND": {
		title: "Template not found",
		description: "The organization document template could not be found.",
		steps: [
			"Verify if the template was deleted.",
			"Check that you are accessing the correct organization context.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"WORKSPACE.PLATFORM_INVITE_REQUIRED": {
		title: "Access invite required",
		description: "{{reason}}",
		steps: [
			"Submit an access request or enter an invite token to get started.",
			"Ensure you are using the correct invite link.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
		paramsSchema: z.object({
			reason: z.string(),
		}),
	},
	"WORKSPACE.PLATFORM_EMAIL_MISMATCH": {
		title: "Email mismatch for platform access",
		description:
			"Your registered email does not match the email authorized for this invite or paid setup.",
		steps: [
			"Use Switch account on the sign-in screen, then sign in with the invited email.",
			"Verify that you are using the email address linked to the purchase or invite.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.PLATFORM_INVITE_NOT_FOUND": {
		title: "Platform invite not found",
		description:
			"The platform access invite could not be found or has expired.",
		steps: ["Request a new invite token from the administrator."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"WORKSPACE.PLATFORM_INVITE_PAID_PLAN_BLOCKS": {
		title: "Partner invite unavailable",
		description:
			"You already have an active paid plan. Partner trials apply to free workspaces only.",
		steps: [
			"Contact support if you believe this is an error.",
			"Partner access is intended for new or free-tier design partners.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.PAID_PLAN_REQUIRED": {
		title: "Paid plan required for new workspace",
		description:
			"Additional workspaces need their own Solo, Teams, or Teams Pro subscription before they can be created.",
		steps: [
			"Choose a plan and complete checkout for the new workspace.",
			"Return to the app and enter a name to finish creating the workspace.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.PLATFORM_ACCESS_REQUEST_NOT_FOUND": {
		title: "Access request not found",
		description: "The platform access request could not be located.",
		steps: [
			"Ensure the request ID is correct.",
			"Verify if the request has already been approved or rejected.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"WORKSPACE.ORG_CONTEXT_REQUIRED": {
		title: "Organization context required",
		description: "This action requires an active organization context.",
		steps: [
			"Confirm you have selected an active workspace.",
			"Ensure the X-Org-Id header is correctly supplied.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"WORKSPACE.DELETION_NOT_ALLOWED": {
		title: "Deletion not allowed",
		description:
			"Organization contains active legal file records. Export or legal sign-off is required before deletion.",
		steps: [
			"Review and export all legal documents in the workspace.",
			"Ensure all active envelopes are recalled, voided, or completed.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "FORBIDDEN",
	},
	"WORKSPACE.CREATE_FAILED": {
		title: "Could not create workspace",
		description:
			"We could not create the organization. Try again or contact support.",
		steps: [
			"Refresh the page and retry.",
			"If the problem continues, contact support.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "INTERNAL_SERVER_ERROR",
	},
} as const satisfies Record<string, ErrorDefinition>;
