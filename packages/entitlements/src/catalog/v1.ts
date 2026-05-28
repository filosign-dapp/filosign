import type { FeatureKey } from "../features";
import type { PlanEntitlements, PlanId } from "../types";

const teamProductFeatures = {
	"features.shared_templates": { kind: "boolean", enabled: true },
	"features.team_drafts": { kind: "boolean", enabled: true },
	"features.draft_review_links": { kind: "boolean", enabled: true },
	"features.draft_comments": { kind: "boolean", enabled: true },
	"features.comments": { kind: "boolean", enabled: true },
	"features.envelope.team_visibility": { kind: "boolean", enabled: true },
	"features.routing.advanced": { kind: "boolean", enabled: true },
	"features.integrations.custom": { kind: "boolean", enabled: false },
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
>;

const disabledProductFeatures = {
	"features.shared_templates": { kind: "boolean", enabled: false },
	"features.team_drafts": { kind: "boolean", enabled: false },
	"features.draft_review_links": { kind: "boolean", enabled: false },
	"features.draft_comments": { kind: "boolean", enabled: false },
	"features.comments": { kind: "boolean", enabled: false },
	"features.envelope.team_visibility": { kind: "boolean", enabled: false },
	"features.routing.advanced": { kind: "boolean", enabled: false },
	"features.integrations.custom": { kind: "boolean", enabled: false },
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
			limit: 30,
			period: "calendar_month",
			scope: "per_seat",
		},
		"envelope.recipients.max": { kind: "max", limit: 10 },
		...teamProductFeatures,
		...paidArchivalFeatures,
	},
	teams_pro: {
		"documents.sent.monthly": {
			kind: "quota",
			limit: 60,
			period: "calendar_month",
			scope: "per_seat",
		},
		"envelope.recipients.max": { kind: "max", limit: 20 },
		...teamProductFeatures,
		"features.integrations.custom": { kind: "boolean", enabled: true },
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
		...teamProductFeatures,
		"features.integrations.custom": { kind: "boolean", enabled: true },
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
