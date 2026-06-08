import type { EntitlementsSnapshot } from "../hooks/billing/useEntitlements";
import type { SettlementFeatureAccessGetOutput } from "../hooks/orgs/useSettlementFeatureAccessGet";

function featureEnabled(
	entitlements: EntitlementsSnapshot | undefined,
	key: string,
): boolean {
	return entitlements?.features[key]?.enabled === true;
}

export function canUseAdvancedRouting(
	entitlements: EntitlementsSnapshot | undefined,
): boolean {
	return featureEnabled(entitlements, "features.routing.advanced");
}

export function canUseAdvancedSettlements(
	entitlements: EntitlementsSnapshot | undefined,
): boolean {
	return featureEnabled(entitlements, "features.settlement.advanced");
}

export function canUseBasicSettlements(
	entitlements: EntitlementsSnapshot | undefined,
): boolean {
	return featureEnabled(entitlements, "features.settlement.basic");
}

export type BasicPayoutGateReason =
	| "free_plan"
	| "access_none"
	| "access_pending"
	| "access_rejected"
	| "terms_outdated";

export type BasicPayoutGate =
	| { allowed: true }
	| { allowed: false; reason: BasicPayoutGateReason };

export function resolveBasicPayoutGate(
	entitlements: EntitlementsSnapshot | undefined,
	access?: SettlementFeatureAccessGetOutput | null,
): BasicPayoutGate {
	if (!canUseBasicSettlements(entitlements)) {
		return { allowed: false, reason: "free_plan" };
	}

	const status = access?.status ?? "none";
	if (status === "pending") {
		return { allowed: false, reason: "access_pending" };
	}
	if (status === "rejected" || status === "suspended") {
		return { allowed: false, reason: "access_rejected" };
	}
	if (status !== "approved") {
		return { allowed: false, reason: "access_none" };
	}
	if (access?.termsCurrent === false) {
		return { allowed: false, reason: "terms_outdated" };
	}

	return { allowed: true };
}

export function canAttachBasicPayout(
	entitlements: EntitlementsSnapshot | undefined,
	access?: SettlementFeatureAccessGetOutput | null,
): boolean {
	return resolveBasicPayoutGate(entitlements, access).allowed;
}

export function canUseSupplementaryAttachments(
	entitlements: EntitlementsSnapshot | undefined,
): boolean {
	return featureEnabled(entitlements, "features.supplementary_attachments");
}

export function canSelectSupplementaryRecipients(
	entitlements: EntitlementsSnapshot | undefined,
): boolean {
	return featureEnabled(
		entitlements,
		"features.supplementary_attachments.recipient_select",
	);
}

export function canUseConditionalAttachmentRelease(
	entitlements: EntitlementsSnapshot | undefined,
): boolean {
	return featureEnabled(
		entitlements,
		"features.supplementary_attachments.conditional_release",
	);
}

export function canUseMetadataTags(
	entitlements: EntitlementsSnapshot | undefined,
): boolean {
	return featureEnabled(entitlements, "features.metadata.tags");
}
