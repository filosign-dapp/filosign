import type { FeatureKey } from "../features";
import type { PlanEntitlements, PlanId } from "../types";

const teamCommentFeatures = {
	"features.draft_comments": { kind: "boolean", enabled: true },
	"features.comments": { kind: "boolean", enabled: true },
} as const satisfies Pick<
	PlanEntitlements,
	"features.draft_comments" | "features.comments"
>;

const teamCollaborationFeatures = {
	"features.shared_templates": { kind: "boolean", enabled: true },
	"features.team_drafts": { kind: "boolean", enabled: true },
	"features.draft_review_links": { kind: "boolean", enabled: true },
	"features.envelope.team_visibility": { kind: "boolean", enabled: true },
	"features.settlement.basic": { kind: "boolean", enabled: true },
} as const satisfies Pick<
	PlanEntitlements,
	| "features.shared_templates"
	| "features.team_drafts"
	| "features.draft_review_links"
	| "features.envelope.team_visibility"
	| "features.settlement.basic"
>;

const teamsProFeatures = {
	"features.routing.advanced": { kind: "boolean", enabled: true },
	"features.settlement.advanced": { kind: "boolean", enabled: true },
} as const satisfies Pick<
	PlanEntitlements,
	"features.routing.advanced" | "features.settlement.advanced"
>;

const proOnlyFeatures = {
	"features.draft_comments": { kind: "boolean", enabled: true },
	"features.comments": { kind: "boolean", enabled: true },
	"features.integrations.custom": { kind: "boolean", enabled: true },
	"features.quota_allocation": { kind: "boolean", enabled: true },
	"features.bulk_send": { kind: "boolean", enabled: true },
	"features.template_folders": { kind: "boolean", enabled: true },
	"features.branding.custom": { kind: "boolean", enabled: true },
	"features.webhooks": { kind: "boolean", enabled: true },
	"features.metadata.tags": { kind: "boolean", enabled: true },
} as const satisfies Pick<
	PlanEntitlements,
	| "features.draft_comments"
	| "features.comments"
	| "features.integrations.custom"
	| "features.quota_allocation"
	| "features.bulk_send"
	| "features.template_folders"
	| "features.branding.custom"
	| "features.webhooks"
	| "features.metadata.tags"
>;

const disabledProFeatures = {
	"features.draft_comments": { kind: "boolean", enabled: false },
	"features.comments": { kind: "boolean", enabled: false },
	"features.integrations.custom": { kind: "boolean", enabled: false },
	"features.quota_allocation": { kind: "boolean", enabled: false },
	"features.bulk_send": { kind: "boolean", enabled: false },
	"features.template_folders": { kind: "boolean", enabled: false },
	"features.branding.custom": { kind: "boolean", enabled: false },
	"features.webhooks": { kind: "boolean", enabled: false },
	"features.metadata.tags": { kind: "boolean", enabled: false },
} as const satisfies Pick<
	PlanEntitlements,
	| "features.draft_comments"
	| "features.comments"
	| "features.integrations.custom"
	| "features.quota_allocation"
	| "features.bulk_send"
	| "features.template_folders"
	| "features.branding.custom"
	| "features.webhooks"
	| "features.metadata.tags"
>;

const disabledSupplementaryFeatures = {
	"features.supplementary_attachments": { kind: "boolean", enabled: false },
	"features.supplementary_attachments.recipient_select": {
		kind: "boolean",
		enabled: false,
	},
	"features.supplementary_attachments.conditional_release": {
		kind: "boolean",
		enabled: false,
	},
} as const satisfies Pick<
	PlanEntitlements,
	| "features.supplementary_attachments"
	| "features.supplementary_attachments.recipient_select"
	| "features.supplementary_attachments.conditional_release"
>;

const soloSupplementaryFeatures = {
	"features.supplementary_attachments": { kind: "boolean", enabled: true },
	"features.supplementary_attachments.recipient_select": {
		kind: "boolean",
		enabled: false,
	},
	"features.supplementary_attachments.conditional_release": {
		kind: "boolean",
		enabled: false,
	},
} as const satisfies Pick<
	PlanEntitlements,
	| "features.supplementary_attachments"
	| "features.supplementary_attachments.recipient_select"
	| "features.supplementary_attachments.conditional_release"
>;

const teamsSupplementaryFeatures = {
	"features.supplementary_attachments": { kind: "boolean", enabled: true },
	"features.supplementary_attachments.recipient_select": {
		kind: "boolean",
		enabled: true,
	},
	"features.supplementary_attachments.conditional_release": {
		kind: "boolean",
		enabled: false,
	},
} as const satisfies Pick<
	PlanEntitlements,
	| "features.supplementary_attachments"
	| "features.supplementary_attachments.recipient_select"
	| "features.supplementary_attachments.conditional_release"
>;

const teamsProSupplementaryFeatures = {
	"features.supplementary_attachments": { kind: "boolean", enabled: true },
	"features.supplementary_attachments.recipient_select": {
		kind: "boolean",
		enabled: true,
	},
	"features.supplementary_attachments.conditional_release": {
		kind: "boolean",
		enabled: true,
	},
} as const satisfies Pick<
	PlanEntitlements,
	| "features.supplementary_attachments"
	| "features.supplementary_attachments.recipient_select"
	| "features.supplementary_attachments.conditional_release"
>;

const disabledProductFeatures = {
	"features.shared_templates": { kind: "boolean", enabled: false },
	"features.team_drafts": { kind: "boolean", enabled: false },
	"features.draft_review_links": { kind: "boolean", enabled: false },
	"features.envelope.team_visibility": { kind: "boolean", enabled: false },
	"features.routing.advanced": { kind: "boolean", enabled: false },
	"features.settlement.basic": { kind: "boolean", enabled: false },
	"features.settlement.advanced": { kind: "boolean", enabled: false },
	...disabledProFeatures,
} as const satisfies Pick<
	PlanEntitlements,
	| "features.shared_templates"
	| "features.team_drafts"
	| "features.draft_review_links"
	| "features.draft_comments"
	| "features.comments"
	| "features.envelope.team_visibility"
	| "features.routing.advanced"
	| "features.settlement.basic"
	| "features.settlement.advanced"
	| "features.integrations.custom"
	| "features.quota_allocation"
	| "features.bulk_send"
	| "features.template_folders"
	| "features.branding.custom"
	| "features.webhooks"
	| "features.metadata.tags"
>;

const paidArchivalPurchase = {
	"features.archival.purchase": { kind: "boolean", enabled: true },
} as const satisfies Pick<PlanEntitlements, "features.archival.purchase">;

const disabledArchivalPurchase = {
	"features.archival.purchase": { kind: "boolean", enabled: false },
} as const satisfies Pick<PlanEntitlements, "features.archival.purchase">;

/** Versioned plan catalog — change via PR + tests; bump version when breaking. */
export const catalogV1: Record<PlanId, PlanEntitlements> = {
	free: {
		"documents.sent.monthly": {
			kind: "quota",
			limit: 3,
			period: "lifetime",
			scope: "account",
		},
		"envelope.recipients.max": { kind: "max", limit: 1 },
		...disabledProductFeatures,
		...disabledSupplementaryFeatures,
		...disabledArchivalPurchase,
	},
	individual: {
		"documents.sent.monthly": {
			kind: "quota",
			limit: 10,
			period: "calendar_month",
			scope: "account",
		},
		"envelope.recipients.max": { kind: "max", limit: 3 },
		...disabledProductFeatures,
		...soloSupplementaryFeatures,
		"features.draft_review_links": { kind: "boolean", enabled: true },
		"features.settlement.basic": { kind: "boolean", enabled: true },
		...paidArchivalPurchase,
	},
	teams: {
		"documents.sent.monthly": {
			kind: "quota",
			limit: 15,
			period: "calendar_month",
			scope: "per_seat",
		},
		"envelope.recipients.max": { kind: "max", limit: 10 },
		...teamCollaborationFeatures,
		"features.routing.advanced": { kind: "boolean", enabled: false },
		"features.settlement.advanced": { kind: "boolean", enabled: false },
		...disabledProFeatures,
		...teamCommentFeatures,
		...teamsSupplementaryFeatures,
		...paidArchivalPurchase,
	},
	teams_pro: {
		"documents.sent.monthly": {
			kind: "quota",
			limit: 25,
			period: "calendar_month",
			scope: "per_seat",
		},
		"envelope.recipients.max": { kind: "max", limit: 15 },
		...teamCollaborationFeatures,
		...teamsProFeatures,
		...proOnlyFeatures,
		...teamsProSupplementaryFeatures,
		...paidArchivalPurchase,
	},
	enterprise: {
		"documents.sent.monthly": {
			kind: "quota",
			limit: null,
			period: "calendar_month",
			scope: "account",
		},
		"envelope.recipients.max": { kind: "max", limit: null },
		...teamCollaborationFeatures,
		...teamsProFeatures,
		...proOnlyFeatures,
		...teamsProSupplementaryFeatures,
		...paidArchivalPurchase,
	},
};

export const CATALOG_VERSION = 3 as const;

export function catalogEntitlement(
	planId: PlanId,
	featureKey: FeatureKey,
): PlanEntitlements[FeatureKey] {
	return catalogV1[planId][featureKey];
}
