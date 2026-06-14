import type { FeedbackFeatureArea, FeedbackKind } from "@filosign/shared";

export const FEEDBACK_SUPPORT_EMAIL = "support@filosign.xyz";

export const FEEDBACK_COPY = {
	dialog: {
		badge: "Feedback",
		title: "Share feedback",
		description:
			"Tell us what worked or what felt confusing. We read every note.",
		kindLabel: "What would you like to do?",
		areaLabel: "Which part of Filosign?",
		messageLabel: "Notes",
		messagePlaceholder: "What would make this better?",
		submit: "Send feedback",
		submitting: "Sending…",
		followUpLead: "Not resolved within 48 hours?",
		followUpAction: "Email us for a direct follow-up.",
	},
	kinds: {
		feedback: "Share feedback",
		bug: "Report a bug",
		support: "Get help",
	} satisfies Record<FeedbackKind, string>,
	kindToggle: {
		feedback: "Feedback",
		bug: "Bug",
		support: "Help",
	} satisfies Record<FeedbackKind, string>,
	kindDialog: {
		feedback: {
			title: "Share feedback",
			description:
				"Tell us what worked or what felt confusing. We read every note.",
			messageLabel: "Notes",
			messagePlaceholder: "What would make this better?",
			submit: "Send feedback",
		},
		bug: {
			title: "Report a bug",
			description:
				"Describe what went wrong and what you expected instead. We read every report.",
			messageLabel: "What happened?",
			messagePlaceholder:
				"Steps to reproduce, what you saw, and what you expected…",
			submit: "Send report",
		},
		support: {
			title: "Get help",
			description:
				"Tell us what you are trying to do and where you are stuck. We will follow up by email.",
			messageLabel: "How can we help?",
			messagePlaceholder:
				"What you were doing, what you expected, and any error messages you saw…",
			submit: "Submit request",
		},
	} satisfies Record<
		FeedbackKind,
		{
			title: string;
			description: string;
			messageLabel: string;
			messagePlaceholder: string;
			submit: string;
		}
	>,
	thankYou: "Thanks. We read every note.",
	supportTicketLink: "Still stuck? Raise a support ticket.",
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
