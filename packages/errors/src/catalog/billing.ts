import { z } from "zod";
import type { ErrorDefinition } from "../types";

export const billingErrors = {
	"BILLING.INVALID_CHECKOUT_LINK": {
		title: "Invalid checkout link",
		description:
			"The checkout session link you provided is invalid or has expired.",
		steps: [
			"Request a new checkout link from the pricing page.",
			"Ensure the entire URL was copied correctly.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.CHECKOUT_LINK_NOT_FOUND": {
		title: "Checkout link expired",
		description:
			"This checkout link has expired or has already been completed.",
		steps: [
			"Request a new checkout link.",
			"Complete the payment flow within 24 hours.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.PENDING_SETUP_NOT_FOUND": {
		title: "Setup link expired",
		description: "No pending workspace setup was found for this email address.",
		steps: [
			"Check if your subscription has already been activated.",
			"Ensure you entered the correct email address linked to the purchase.",
			"Contact support if the issue persists.",
		],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "NOT_FOUND",
	},
	"BILLING.INDIVIDUAL_CHECKOUT_SEATS_LIMIT": {
		title: "Seat limit exceeded",
		description: "Individual checkout supports exactly one seat only.",
		steps: [
			"Choose a Teams or Teams Pro plan if you need multiple seats.",
			"Set seat count to 1 to proceed with the Individual plan.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.WORKSPACE_NO_SUBSCRIPTION": {
		title: "No active subscription",
		description: "This workspace has no active Dodo subscription.",
		steps: [
			"Go to Workspace Settings -> Billing & Plans.",
			"Purchase a subscription plan to unlock capabilities.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.WORKSPACE_NOT_PAID_PLAN": {
		title: "Paid plan required",
		description: "Workspace subscription is not a paid plan.",
		steps: ["Upgrade your workspace to a paid plan under Billing & Plans."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.WORKSPACE_INTERVAL_UNKNOWN": {
		title: "Unknown billing interval",
		description:
			"Your workspace billing interval is unknown. Contact support to resolve.",
		steps: ["Contact Filosign support for assistance."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.RETURN_URL_DISALLOWED": {
		title: "Invalid return URL",
		description: "The specified return URL origin is not allowed.",
		steps: ["Ensure you are accessing Filosign from an authorized domain."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.ADMIN_EMAIL_REQUIRED": {
		title: "Admin email required",
		description:
			"An email address on your administrator profile is required to complete checkout.",
		steps: [
			"Go to Account -> Profile.",
			"Add and verify a primary email address.",
			"Return to checkout.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.NO_CUSTOMER_FOUND": {
		title: "Billing customer not found",
		description: "No billing customer profile was found for this workspace.",
		steps: ["Purchase a subscription first to create a billing profile."],
		audience: "user",
		severity: "error",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.SEAT_COUNT_INVALID": {
		title: "Invalid seat count",
		description: "The seat count must be a positive integer.",
		steps: ["Enter a positive number of seats (1 or more)."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.SEAT_COUNT_BELOW_USAGE": {
		title: "Seat count below current usage",
		description:
			"Your target seat count cannot be below your current usage of {{usedSeats}} seats (members and pending invites).",
		steps: [
			"Remove organization members or pending invites first.",
			"Try again with a higher seat count.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
		paramsSchema: z.object({
			usedSeats: z.number(),
		}),
	},
	"BILLING.SEAT_COUNT_ALREADY_ON_TARGET": {
		title: "Seat count already on target",
		description:
			"Your workspace is already configured with the requested number of seats.",
		steps: ["No action is needed as your seat count matches."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.WORKSPACE_ALREADY_ON_PLAN": {
		title: "Already on this plan",
		description: "Your workspace is already on the selected subscription plan.",
		steps: [
			"Compare plan features under Billing & Plans to choose a different tier.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.PERSONAL_WORKSPACE_TEAMS_FORBIDDEN": {
		title: "Personal workspace restriction",
		description: "Personal workspaces cannot have team subscriptions.",
		steps: ["Create an organization workspace to use team subscriptions."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.INDIVIDUAL_PLAN_SEATS_LIMIT": {
		title: "Individual plan seat limit",
		description: "The Individual plan supports exactly 1 seat.",
		steps: ["Choose a Teams or Teams Pro plan to configure multiple seats."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.TEAMS_PLAN_MIN_SEATS": {
		title: "Minimum seats required",
		description: "The Teams plan requires at least 2 seats.",
		steps: ["Set seat count to 2 or more to subscribe to the Teams plan."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.TEAMS_PRO_PLAN_MIN_SEATS": {
		title: "Minimum seats required",
		description: "The Teams Pro plan requires at least 2 seats.",
		steps: ["Set seat count to 2 or more to subscribe to the Teams Pro plan."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.ORG_HAS_ACTIVE_SUBSCRIPTION": {
		title: "Active subscription exists",
		description: "This organization already has an active subscription.",
		steps: [
			"Manage or cancel your existing subscription before purchasing a new one.",
		],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
	"BILLING.PERSONAL_WORKSPACE_SUBSCRIPTION_FORBIDDEN": {
		title: "Subscription restricted",
		description:
			"Personal workspaces cannot have subscriptions. Open Workspace Settings.",
		steps: ["Create a new organization workspace to subscribe."],
		audience: "user",
		severity: "warning",
		defaultOrpcCode: "BAD_REQUEST",
	},
} as const satisfies Record<string, ErrorDefinition>;
