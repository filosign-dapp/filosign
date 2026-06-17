import type { FeatureKey } from "@filosign/entitlements";
import { catalogV1, featureMarketingLabel } from "@filosign/entitlements";

/** Paid tiers shown in the pricing comparison matrix (excludes enterprise). */
export type ComparisonPlanId = "free" | "individual" | "teams" | "teams_pro";

export const COMPARISON_PLAN_IDS = [
	// "free", // Temporarily hidden on pricing page
	"individual",
	"teams",
	"teams_pro",
] as const satisfies readonly ComparisonPlanId[];

export const COMPARISON_PLAN_LABELS: Record<ComparisonPlanId, string> = {
	free: "Free",
	individual: "Solo",
	teams: "Teams",
	teams_pro: "Teams Pro",
};

export type ComparisonCellValue = string | boolean | null;

export type ComparisonRow =
	| {
			kind: "section";
			id: string;
			label: string;
	  }
	| {
			kind: "feature";
			id: string;
			label: string;
			values: Record<ComparisonPlanId, ComparisonCellValue>;
	  };

function quotaCell(
	planId: ComparisonPlanId,
	featureKey: "documents.sent.monthly",
): ComparisonCellValue {
	const def = catalogV1[planId][featureKey];
	if (def.kind !== "quota" || def.limit === null) return null;
	if (def.period === "lifetime") return `${def.limit} lifetime`;
	if (def.scope === "per_seat") {
		return `${def.limit} per user (pooled)`;
	}
	return `${def.limit}/mo`;
}

function maxCell(
	planId: ComparisonPlanId,
	featureKey: "envelope.recipients.max",
): ComparisonCellValue {
	const def = catalogV1[planId][featureKey];
	if (def.kind !== "max" || def.limit === null) return null;
	return String(def.limit);
}

function booleanCell(
	planId: ComparisonPlanId,
	featureKey: FeatureKey,
): ComparisonCellValue {
	const def = catalogV1[planId][featureKey];
	if (def.kind !== "boolean") return null;
	return def.enabled ? true : null;
}

function booleanRow(
	id: string,
	label: string,
	featureKey: FeatureKey,
): ComparisonRow {
	return {
		kind: "feature",
		id,
		label,
		values: Object.fromEntries(
			COMPARISON_PLAN_IDS.map((planId) => [
				planId,
				booleanCell(planId, featureKey),
			]),
		) as Record<ComparisonPlanId, ComparisonCellValue>,
	};
}

function staticRow(
	id: string,
	label: string,
	values: Record<ComparisonPlanId, ComparisonCellValue>,
): ComparisonRow {
	return { kind: "feature", id, label, values };
}

function section(label: string): ComparisonRow {
	return { kind: "section", id: `section-${label}`, label };
}

/** Catalog-accurate feature matrix for the pricing page. */
export function buildPricingComparisonRows(): ComparisonRow[] {
	return [
		section("Sending limits"),
		staticRow("documents.sent.monthly", "Document send limit", {
			free: quotaCell("free", "documents.sent.monthly"),
			individual: quotaCell("individual", "documents.sent.monthly"),
			teams: quotaCell("teams", "documents.sent.monthly"),
			teams_pro: quotaCell("teams_pro", "documents.sent.monthly"),
		}),
		staticRow("envelope.recipients.max", "Signers per document", {
			free: maxCell("free", "envelope.recipients.max"),
			individual: maxCell("individual", "envelope.recipients.max"),
			teams: maxCell("teams", "envelope.recipients.max"),
			teams_pro: maxCell("teams_pro", "envelope.recipients.max"),
		}),

		section("Privacy & proof"),
		staticRow("marketing.e2ee", "Private document encryption", {
			free: true,
			individual: true,
			teams: true,
			teams_pro: true,
		}),
		staticRow("marketing.proof_packet", "Exportable proof packets", {
			free: "Basic audit",
			individual: true,
			teams: true,
			teams_pro: true,
		}),
		staticRow("marketing.extended_archival", "Long-term storage options", {
			free: null,
			individual: true,
			teams: true,
			teams_pro: true,
		}),

		section("Handoffs"),
		booleanRow(
			"features.settlement.basic",
			featureMarketingLabel("features.settlement.basic"),
			"features.settlement.basic",
		),
		booleanRow(
			"features.supplementary_attachments",
			featureMarketingLabel("features.supplementary_attachments"),
			"features.supplementary_attachments",
		),
		booleanRow(
			"features.supplementary_attachments.recipient_select",
			featureMarketingLabel(
				"features.supplementary_attachments.recipient_select",
			),
			"features.supplementary_attachments.recipient_select",
		),
		booleanRow(
			"features.supplementary_attachments.conditional_release",
			featureMarketingLabel(
				"features.supplementary_attachments.conditional_release",
			),
			"features.supplementary_attachments.conditional_release",
		),

		section("Team collaboration"),
		booleanRow(
			"features.draft_review_links",
			featureMarketingLabel("features.draft_review_links"),
			"features.draft_review_links",
		),
		booleanRow(
			"features.shared_templates",
			featureMarketingLabel("features.shared_templates"),
			"features.shared_templates",
		),
		booleanRow(
			"features.team_drafts",
			featureMarketingLabel("features.team_drafts"),
			"features.team_drafts",
		),
		booleanRow(
			"features.envelope.team_visibility",
			featureMarketingLabel("features.envelope.team_visibility"),
			"features.envelope.team_visibility",
		),

		section("Workflow control"),
		booleanRow(
			"features.settlement.advanced",
			featureMarketingLabel("features.settlement.advanced"),
			"features.settlement.advanced",
		),
		booleanRow(
			"features.treasury.workspace_custom",
			featureMarketingLabel("features.treasury.workspace_custom"),
			"features.treasury.workspace_custom",
		),
		booleanRow(
			"features.routing.advanced",
			featureMarketingLabel("features.routing.advanced"),
			"features.routing.advanced",
		),

		section("Advanced features"),
		booleanRow(
			"features.comments",
			featureMarketingLabel("features.comments"),
			"features.comments",
		),
		booleanRow(
			"features.draft_comments",
			featureMarketingLabel("features.draft_comments"),
			"features.draft_comments",
		),
		// Catalog-only - not shipped; restore when implemented (see project/todo.md).
		// booleanRow(
		// 	"features.integrations.custom",
		// 	featureMarketingLabel("features.integrations.custom"),
		// 	"features.integrations.custom",
		// ),
		// booleanRow(
		// 	"features.quota_allocation",
		// 	featureMarketingLabel("features.quota_allocation"),
		// 	"features.quota_allocation",
		// ),
		// booleanRow(
		// 	"features.bulk_send",
		// 	featureMarketingLabel("features.bulk_send"),
		// 	"features.bulk_send",
		// ),
		// booleanRow(
		// 	"features.template_folders",
		// 	featureMarketingLabel("features.template_folders"),
		// 	"features.template_folders",
		// ),
		// booleanRow(
		// 	"features.branding.custom",
		// 	featureMarketingLabel("features.branding.custom"),
		// 	"features.branding.custom",
		// ),
		// booleanRow(
		// 	"features.webhooks",
		// 	featureMarketingLabel("features.webhooks"),
		// 	"features.webhooks",
		// ),
		// booleanRow(
		// 	"features.metadata.tags",
		// 	featureMarketingLabel("features.metadata.tags"),
		// 	"features.metadata.tags",
		// ),
	];
}
