import { catalogV1 } from "./catalog";
import type { FeatureKey } from "./features";
import { isBooleanFeatureKey } from "./features";
import type { PlanId, PlanMarketingLine } from "./types";

const MARKETING_LABELS: Record<FeatureKey, string> = {
	"documents.sent.monthly": "Documents sent per month",
	"envelope.recipients.max": "Recipients per document",
	"features.shared_templates": "Shared templates",
	"features.team_drafts": "Team envelope drafts",
	"features.draft_review_links": "Draft review links for clients",
	"features.draft_comments": "Comments on drafts",
	"features.comments": "Comments on documents",
	"features.envelope.team_visibility": "Team envelope visibility",
	"features.routing.advanced": "Advanced routing",
	"features.integrations.custom": "Custom integrations",
	"archival.1y": "Filecoin archival (1 year)",
	"archival.5y": "Filecoin archival (5 years)",
	"archival.10y": "Filecoin archival (10 years)",
};

/** Human-readable bullets for pricing pages (derived from catalog). */
export function planMarketingLines(planId: PlanId): PlanMarketingLine[] {
	const entitlements = catalogV1[planId];
	const lines: PlanMarketingLine[] = [];

	for (const featureKey of Object.keys(entitlements) as FeatureKey[]) {
		const def = entitlements[featureKey];
		const label = MARKETING_LABELS[featureKey];

		if (def.kind === "quota" && def.limit !== null) {
			const scope = def.scope === "per_seat" ? " per user" : "";
			lines.push({
				featureKey,
				label: `Up to ${def.limit} ${label.toLowerCase()}${scope}`,
			});
			continue;
		}

		if (def.kind === "max" && def.limit !== null) {
			lines.push({
				featureKey,
				label: `Up to ${def.limit} ${label.toLowerCase()}`,
			});
			continue;
		}

		if (def.kind === "boolean" && def.enabled) {
			lines.push({ featureKey, label });
		}
	}

	if (planId === "enterprise") {
		lines.push({
			featureKey: "features.integrations.custom",
			label: "Custom limits and integrations (contract)",
		});
	}

	return lines;
}

export function planIncludesFeature(planId: PlanId, key: FeatureKey): boolean {
	const def = catalogV1[planId][key];
	if (isBooleanFeatureKey(key)) {
		return def.kind === "boolean" && def.enabled;
	}
	if (def.kind === "quota" || def.kind === "max") {
		return def.limit !== null && def.limit > 0;
	}
	return false;
}
