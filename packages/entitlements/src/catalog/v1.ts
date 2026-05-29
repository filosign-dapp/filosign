import type { FeatureKey } from "../features";
import type { PlanEntitlements, PlanId } from "../types";

const teamCollaborationFeatures = {
	"features.shared_templates": { kind: "boolean", enabled: true },
	"features.team_drafts": { kind: "boolean", enabled: true },
	"features.draft_review_links": { kind: "boolean", enabled: true },
	"features.envelope.team_visibility": { kind: "boolean", enabled: true },
	"features.routing.advanced": { kind: "boolean", enabled: true },
} as const satisfies Pick<
	PlanEntitlements,
	| "features.shared_templates"
	| "features.team_drafts"
	| "features.draft_review_links"
	| "features.envelope.team_visibility"
	| "features.routing.advanced"
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

const disabledProductFeatures = {
	"features.shared_templates": { kind: "boolean", enabled: false },
	"features.team_drafts": { kind: "boolean", enabled: false },
	"features.draft_review_links": { kind: "boolean", enabled: false },
	"features.envelope.team_visibility": { kind: "boolean", enabled: false },
	"features.routing.advanced": { kind: "boolean", enabled: false },
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
	| "features.integrations.custom"
	| "features.quota_allocation"
	| "features.bulk_send"
	| "features.template_folders"
	| "features.branding.custom"
	| "features.webhooks"
	| "features.metadata.tags"
>;

const paidArchivalFeatures = {
	"archival.1y": { kind: "boolean", enabled: true },
	"archival.5y": { kind: "boolean", enabled: true },
	"archival.10y": { kind: "boolean", enabled: true },
} as const satisfies Pick<
	PlanEntitlements,
	"archival.1y" | "archival.5y" | "archival.10y"
>;

const disabledArchivalFeatures = {
	"archival.1y": { kind: "boolean", enabled: false },
	"archival.5y": { kind: "boolean", enabled: false },
	"archival.10y": { kind: "boolean", enabled: false },
} as const satisfies Pick<
	PlanEntitlements,
	"archival.1y" | "archival.5y" | "archival.10y"
>;

/** Versioned plan catalog — change via PR + tests; bump version when breaking. */
export const catalogV1: Record<PlanId, PlanEntitlements> = {
	free: {
		"documents.sent.monthly": {
			kind: "quota",
			limit: 3,
			period: "calendar_month",
			scope: "account",
		},
		"envelope.recipients.max": { kind: "max", limit: 1 },
		...disabledProductFeatures,
		...disabledArchivalFeatures,
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
		"features.draft_review_links": { kind: "boolean", enabled: true },
		...paidArchivalFeatures,
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
		...disabledProFeatures,
		...paidArchivalFeatures,
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
		...proOnlyFeatures,
		...paidArchivalFeatures,
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
		...proOnlyFeatures,
		...paidArchivalFeatures,
	},
};

export const CATALOG_VERSION = 1 as const;

export function catalogEntitlement(
	planId: PlanId,
	featureKey: FeatureKey,
): PlanEntitlements[FeatureKey] {
	return catalogV1[planId][featureKey];
}
