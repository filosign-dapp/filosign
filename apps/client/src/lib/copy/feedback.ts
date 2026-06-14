import type { FeedbackFeatureArea } from "@filosign/shared";

export const FEEDBACK_COPY = {
	dialog: {
		badge: "Share feedback",
		title: "Share feedback",
		description:
			"Tell us what worked or what felt confusing. We read every note.",
		areaLabel: "Which part of Filosign?",
		ratingLabel: "Overall (optional)",
		messageLabel: "Notes",
		messagePlaceholder: "What would make this better?",
		submit: "Send feedback",
		submitting: "Sending…",
	},
	thankYou: "Thanks. We read every note.",
	errors: {
		submitFailed: {
			title: "Couldn't send feedback",
			hint: "Try again in a moment.",
		},
	},
	invite: {
		label: "Share feedback",
		title: "How are we doing?",
		body: "Tell us what worked or what felt confusing. We read every note.",
		primary: "Share feedback",
		notNow: "Not now",
	},
	supportLink: "Missing a topic? Share feedback.",
	areas: {
		send: "Send",
		sign: "Sign",
		payouts: "Payouts",
		exports: "Exports",
		workspace: "Workspace",
		other: "Other",
	} satisfies Record<FeedbackFeatureArea, string>,
} as const;

export const FEEDBACK_IMAGES = {
	inviteHeader: "/images/stock_10.webp",
	inviteBody: "/images/stock_3.webp",
} as const;
