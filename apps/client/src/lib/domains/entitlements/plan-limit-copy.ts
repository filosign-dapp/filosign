import type { UpgradePlanLimitReason } from "@filosign/react/billing";

export const PLAN_LIMIT_COPY: Record<
	UpgradePlanLimitReason,
	{ title: string; description: string }
> = {
	"documents.sent.monthly": {
		title: "Document limit reached",
		description:
			"You've exhausted your document quota. Upgrade to continue sending envelopes.",
	},
	"envelope.recipients.max": {
		title: "Recipient limit reached",
		description:
			"You've reached the maximum recipients per envelope on your current plan. Upgrade to add more recipients.",
	},
	"features.settlement.basic": {
		title: "USDC payouts need a paid plan",
		description:
			"Upgrade to Solo or higher, then request payout attachment access in Workspace settings. After Filosign approves, you can attach USDC payouts when signing finishes.",
	},
	"features.settlement.advanced": {
		title: "Advanced payouts need Teams Pro",
		description:
			"Split payments across people, set minimum signatures before pay, and edit payouts after send with Teams Pro or Enterprise.",
	},
	"features.routing.advanced": {
		title: "Advanced signing order needs Teams Pro",
		description:
			"Set turn order (sequential or parallel) and minimum signatures (quorum) with Teams Pro or Enterprise.",
	},
	"features.shared_templates": {
		title: "Templates require Teams plan",
		description:
			"Create and reuse shared document templates with your team. Upgrade to Teams or Teams Pro to build templates.",
	},
	"features.team_drafts": {
		title: "Cloud draft save requires Teams plan",
		description:
			"Save encrypted envelope drafts to your workspace and pick up where you left off. Upgrade to Teams or Teams Pro to use cloud drafts.",
	},
	"features.draft_comments": {
		title: "Draft comments require Teams plan",
		description:
			"Leave encrypted comments on shared envelope drafts while you prepare to send. Upgrade to Teams or Teams Pro to collaborate on drafts.",
	},
	"features.supplementary_attachments": {
		title: "Gated file packets need Solo or higher",
		description:
			"Send encrypted extra files with your envelope on Solo or higher. Upgrade to unlock gated file packets.",
	},
	"features.supplementary_attachments.recipient_select": {
		title: "Choose who gets each gated file packet",
		description:
			"Pick which recipients receive each supplementary packet with Teams or higher.",
	},
	"features.supplementary_attachments.conditional_release": {
		title: "Conditional file unlock needs Teams Pro",
		description:
			"Release supplementary files only when signing conditions are met with Teams Pro or Enterprise.",
	},
};
