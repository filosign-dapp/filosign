import type { ActivationStepDef } from "./types";

/** Canonical activation step definitions - profiles compose by id. */
export const ACTIVATION_STEPS: Record<
	ActivationStepDef["id"],
	ActivationStepDef
> = {
	confirm_signature: {
		id: "confirm_signature",
		section: "core",
		title: "Create your signature",
		description:
			"Add a typed, drawn, or uploaded signature so you can sign documents.",
		milestoneId: "signature_created",
	},
	sign_practice_agreement: {
		id: "sign_practice_agreement",
		section: "core",
		title: "Sign your first agreement",
		description:
			"Practice signing on a sample document before you send a real envelope.",
		milestoneId: "practice_document_signed",
	},
	learn_proof_packets: {
		id: "learn_proof_packets",
		section: "core",
		title: "Learn about proof packets",
		description:
			"See how Filosign packages signatures and audit data for verification.",
		milestoneId: "proof_packet_learned",
	},
	send_first_envelope: {
		id: "send_first_envelope",
		section: "core",
		title: "Send your first envelope",
		description: "Upload a document and send it to someone who needs to sign.",
		milestoneId: "first_envelope_sent",
	},
	gated_file_release: {
		id: "gated_file_release",
		section: "advanced",
		title: "Try gated file release",
		description: "Attach supplementary files that unlock after signing.",
		hintOnly: true,
		requiresFeatures: ["features.supplementary_attachments"],
	},
	payout_packet_access: {
		id: "payout_packet_access",
		section: "advanced",
		title: "Request payout packet access",
		description: "Enable settlement attachments for your workspace.",
		hintOnly: true,
		requiresFeatures: ["features.settlement.basic"],
		requiresPlans: ["teams_pro", "enterprise"],
	},
	invite_teammates: {
		id: "invite_teammates",
		section: "advanced",
		title: "Invite teammates",
		description: "Bring your team into a shared workspace.",
		hintOnly: true,
		requiresPlans: ["teams", "teams_pro", "enterprise"],
		requiresFeatures: ["features.shared_templates", "features.team_drafts"],
	},
	advanced_settlements: {
		id: "advanced_settlements",
		section: "advanced",
		title: "Explore advanced settlements",
		description: "Configure routing and settlement rules on Teams Pro.",
		hintOnly: true,
		requiresPlans: ["teams_pro", "enterprise"],
		requiresFeatures: [
			"features.settlement.advanced",
			"features.routing.advanced",
		],
	},
	sandbox_vs_production: {
		id: "sandbox_vs_production",
		section: "disclosure",
		title: "Sandbox vs production",
		description:
			"You are on testnet. Paid plans and limits on filosign.com still apply in production.",
		hintOnly: true,
	},
	sandbox_testnet_limits: {
		id: "sandbox_testnet_limits",
		section: "disclosure",
		title: "Testnet demo",
		description:
			"Features here demonstrate Teams Pro workflows. Progress may reset when the sandbox is purged.",
		hintOnly: true,
	},
	try_sandbox_workflow: {
		id: "try_sandbox_workflow",
		section: "advanced",
		title: "Try the full workflow on sandbox",
		description:
			"Explore Teams Pro features on our testnet before upgrading on production.",
		hintOnly: true,
		requiresPlans: ["free"],
		requiresDeployments: ["production"],
		linkKey: "sandbox",
	},
	upgrade_premium_plan: {
		id: "upgrade_premium_plan",
		section: "advanced",
		title: "Compare paid plans",
		description:
			"See Solo, Teams, and Teams Pro when you need more sends or team features.",
		hintOnly: true,
		requiresPlans: ["free"],
		requiresDeployments: ["production"],
		linkKey: "pricing",
	},
};

export const CORE_STEP_IDS = [
	"confirm_signature",
	"sign_practice_agreement",
	"learn_proof_packets",
	"send_first_envelope",
] as const satisfies readonly ActivationStepDef["id"][];

/** Compact dashboard overlay - signature, practice sign, first send. */
export const BASIC_ONBOARDING_STEP_IDS = [
	"confirm_signature",
	"sign_practice_agreement",
	"send_first_envelope",
] as const satisfies readonly ActivationStepDef["id"][];

export const PLAN_ADVANCED_STEP_IDS: Record<
	import("./types").BillingPlanId,
	readonly ActivationStepDef["id"][]
> = {
	free: ["try_sandbox_workflow", "upgrade_premium_plan"],
	individual: ["gated_file_release"],
	teams: ["invite_teammates", "gated_file_release"],
	teams_pro: [
		"invite_teammates",
		"gated_file_release",
		"payout_packet_access",
		"advanced_settlements",
	],
	enterprise: [
		"invite_teammates",
		"gated_file_release",
		"payout_packet_access",
		"advanced_settlements",
	],
};
