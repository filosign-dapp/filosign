import type {
	SettlementReleaseType,
	SettlementRuleStatus,
} from "./settlement-rules";

export function settlementStatusLabel(status: SettlementRuleStatus): string {
	switch (status) {
		case "pending":
			return "Waiting for signatures";
		case "ready":
			return "Ready to pay out";
		case "partial":
			return "Partly paid";
		case "executed":
			return "Paid";
		case "cancelled":
			return "Cancelled";
		case "failed_insufficient":
			return "Not enough USDC or approval";
		case "failed_relay":
			return "We couldn't send the transfer";
		case "failed_conditions":
			return "Conditions not met yet";
	}
}

export function settlementReleaseTypeLabel(
	releaseType: SettlementReleaseType | string,
): string {
	switch (releaseType) {
		case "all_signed":
			return "Everyone has signed";
		case "specific_signer":
			return "A specific person signs";
		case "at_least_n":
			return "Enough people sign";
		case "all_required_signed":
			return "Everyone required has signed";
		case "all_signed_complete":
			return "Everyone (including optional) has signed";
		case "quorum_required":
			return "Envelope minimum signatures are met";
		case "quorum_set":
			return "Enough people from your chosen group sign";
		case "quorum_all":
			return "Enough people from the full roster sign";
		case "all_of_set":
			return "Everyone on your list signs";
		default:
			return releaseType;
	}
}

export function settlementHeaderSummary(
	rules: readonly { status: SettlementRuleStatus }[],
): "none" | "all_paid" | "pending" | "failed" {
	if (rules.length === 0) return "none";
	if (rules.some((r) => r.status.startsWith("failed_"))) return "failed";
	if (
		rules.every((r) => r.status === "executed" || r.status === "cancelled") &&
		rules.some((r) => r.status === "executed")
	) {
		return "all_paid";
	}
	if (rules.some((r) => r.status === "partial")) return "pending";
	return "pending";
}
