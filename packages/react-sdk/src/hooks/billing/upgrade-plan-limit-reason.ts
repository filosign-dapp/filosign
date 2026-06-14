/** Mirrors server `UPGRADE_LIMIT_REASONS` - keep in sync with plan-transitions.ts */
export const UPGRADE_PLAN_LIMIT_REASONS = [
	"documents.sent.monthly",
	"envelope.recipients.max",
	"features.settlement.basic",
	"features.settlement.advanced",
	"features.routing.advanced",
	"features.shared_templates",
	"features.team_drafts",
	"features.draft_comments",
	"features.supplementary_attachments",
	"features.supplementary_attachments.recipient_select",
	"features.supplementary_attachments.conditional_release",
] as const;

export type UpgradePlanLimitReason =
	(typeof UPGRADE_PLAN_LIMIT_REASONS)[number];
