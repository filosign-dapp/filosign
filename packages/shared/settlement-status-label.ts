import type {
	SettlementReleaseType,
	SettlementRuleStatus,
} from "./settlement-rules";

export function settlementStatusLabel(status: SettlementRuleStatus): string {
	switch (status) {
		case "pending":
			return "Pending";
		case "ready":
			return "Ready to pay";
		case "executed":
			return "Paid";
		case "cancelled":
			return "Cancelled";
		case "failed_insufficient":
			return "Insufficient balance";
		case "failed_relay":
			return "Automatic payout failed";
		case "failed_conditions":
			return "Conditions not met";
	}
}

export function settlementReleaseTypeLabel(
	releaseType: SettlementReleaseType | string,
): string {
	switch (releaseType) {
		case "all_signed":
			return "When all sign";
		case "specific_signer":
			return "When specific signer signs";
		case "at_least_n":
			return "When N signers sign";
		case "all_required_signed":
			return "When all required sign";
		case "all_signed_complete":
			return "When all signers complete";
		case "quorum_required":
			return "When registry quorum met";
		case "quorum_set":
			return "When quorum set met";
		case "quorum_all":
			return "When roster quorum met";
		case "all_of_set":
			return "When all listed sign";
		default:
			return releaseType;
	}
}

export function settlementHeaderSummary(
	rules: readonly { status: SettlementRuleStatus }[],
): "none" | "all_paid" | "pending" | "failed" {
	if (rules.length === 0) return "none";
	if (rules.some((r) => r.status.startsWith("failed_"))) return "failed";
	if (rules.every((r) => r.status === "executed")) return "all_paid";
	return "pending";
}
