import type {
	SettlementReleaseType,
	SettlementRuleStatus,
} from "./settlement-rules";

/** Versioned settlement feature legal copy — counsel must review before production. */
export const SETTLEMENT_FEATURE_TERMS_VERSION = "2026-05-01" as const;

/** Checkbox label on sign page when a payout attachment is present. */
export const SETTLEMENT_RECIPIENT_ACK_LABEL =
	"I understand any USDC payout on this document is between the sender and me. Filosign doesn't guarantee payment, isn't part of that transfer, and won't settle disputes between us.";

export const SETTLEMENT_RECIPIENT_ACK_INTENT_VERSION =
	`settlement-recipient-ack:${SETTLEMENT_FEATURE_TERMS_VERSION}` as const;

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
		case "all_required_signed":
		case "all_signed_complete":
			return "Everyone has signed";
		case "specific_signer":
			return "When a specific signer signs";
		case "at_least_n":
			return "When at least N signers sign";
		case "quorum_required":
			return "When envelope quorum is met";
		case "quorum_set":
			return "When at least N from a chosen group sign";
		case "quorum_all":
			return "When at least N from the roster sign";
		case "all_of_set":
			return "When everyone on a chosen list signs";
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
