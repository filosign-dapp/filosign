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
	"features.routing.advanced": "Advanced signing conditions",
	"features.settlement.basic": "Payout packets",
	"features.settlement.advanced": "Multi-recipient payout rules",
	"features.treasury.workspace_custom": "Custom workspace treasury wallet",
	"features.supplementary_attachments": "Gated file packets",
	"features.supplementary_attachments.recipient_select":
		"Per-packet recipient selection",
	"features.supplementary_attachments.conditional_release":
		"Signature-conditional attachment release",
	"features.integrations.custom": "Custom integrations",
	"features.quota_allocation": "Seat quota allocation",
	"features.bulk_send": "Bulk send from CSV",
	"features.template_folders": "Shared template folders",
	"features.branding.custom": "Custom branding on sign pages",
	"features.webhooks": "Webhook notifications",
	"features.metadata.tags": "Envelope metadata tags",
	"features.archival.purchase": "Long-term storage for org documents",
};

/** Customer-facing label for pricing / comparison tables. */
export function featureMarketingLabel(featureKey: FeatureKey): string {
	return MARKETING_LABELS[featureKey];
}

/** Human-readable bullets for pricing pages (derived from catalog). */
export function planMarketingLines(planId: PlanId): PlanMarketingLine[] {
	const entitlements = catalogV1[planId];
	const lines: PlanMarketingLine[] = [];
	const seenLabels = new Set<string>();

	for (const featureKey of Object.keys(entitlements) as FeatureKey[]) {
		const def = entitlements[featureKey];
		const label = MARKETING_LABELS[featureKey];

		if (def.kind === "quota" && def.limit !== null) {
			const scope =
				def.scope === "per_seat" ? " per user (pooled team quota)" : "";
			const period =
				def.period === "lifetime"
					? " documents lifetime"
					: " documents per month";
			lines.push({
				featureKey,
				label: `${def.limit}${period}${scope}`,
			});
			continue;
		}

		if (def.kind === "max" && def.limit !== null) {
			lines.push({
				featureKey,
				label: `Up to ${def.limit} signers per document`,
			});
			continue;
		}

		if (def.kind === "boolean" && def.enabled) {
			if (seenLabels.has(label)) continue;
			seenLabels.add(label);
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
