/** Stable feature identifiers - add keys when shipping new product capabilities. */
export const FEATURE_KEYS = [
	"documents.sent.monthly",
	"envelope.recipients.max",
	"features.shared_templates",
	"features.team_drafts",
	"features.draft_review_links",
	"features.draft_comments",
	"features.comments",
	"features.envelope.team_visibility",
	"features.routing.advanced",
	"features.settlement.basic",
	"features.settlement.advanced",
	"features.supplementary_attachments",
	"features.supplementary_attachments.recipient_select",
	"features.supplementary_attachments.conditional_release",
	"features.integrations.custom",
	"features.quota_allocation",
	"features.bulk_send",
	"features.template_folders",
	"features.branding.custom",
	"features.webhooks",
	"features.metadata.tags",
	"features.archival.purchase",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const QUOTA_FEATURE_KEYS = ["documents.sent.monthly"] as const;
export type QuotaFeatureKey = (typeof QUOTA_FEATURE_KEYS)[number];

export const MAX_FEATURE_KEYS = ["envelope.recipients.max"] as const;
export type MaxFeatureKey = (typeof MAX_FEATURE_KEYS)[number];

export const BOOLEAN_FEATURE_KEYS = [
	"features.shared_templates",
	"features.team_drafts",
	"features.draft_review_links",
	"features.draft_comments",
	"features.comments",
	"features.envelope.team_visibility",
	"features.routing.advanced",
	"features.settlement.basic",
	"features.settlement.advanced",
	"features.supplementary_attachments",
	"features.supplementary_attachments.recipient_select",
	"features.supplementary_attachments.conditional_release",
	"features.integrations.custom",
	"features.quota_allocation",
	"features.bulk_send",
	"features.template_folders",
	"features.branding.custom",
	"features.webhooks",
	"features.metadata.tags",
	"features.archival.purchase",
] as const;
export type BooleanFeatureKey = (typeof BOOLEAN_FEATURE_KEYS)[number];

export type FeatureKind = "quota" | "max" | "boolean";

export function featureKind(key: FeatureKey): FeatureKind {
	if ((QUOTA_FEATURE_KEYS as readonly string[]).includes(key)) return "quota";
	if ((MAX_FEATURE_KEYS as readonly string[]).includes(key)) return "max";
	return "boolean";
}

export function isQuotaFeatureKey(key: FeatureKey): key is QuotaFeatureKey {
	return featureKind(key) === "quota";
}

export function isMaxFeatureKey(key: FeatureKey): key is MaxFeatureKey {
	return featureKind(key) === "max";
}

export function isBooleanFeatureKey(key: FeatureKey): key is BooleanFeatureKey {
	return featureKind(key) === "boolean";
}
