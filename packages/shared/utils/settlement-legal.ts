import type { SettlementRuleStatus } from "./settlement-rules";

export type {
	ReleaseCopyContext,
	ReleaseValidationIssue,
} from "./release-copy";
export {
	envelopeMinimumRoutingNote,
	formatReleaseValidationError,
	quorumRequiredThresholdLockedHelper,
	settlementReleaseTypeDescription,
	settlementReleaseTypeLabel,
} from "./release-copy";

/** Versioned settlement feature legal copy - counsel must review before production. */
export const SETTLEMENT_FEATURE_TERMS_VERSION = "2026-06-20" as const;

/** Checkbox label on sign page when a payout attachment is present. */
export const SETTLEMENT_RECIPIENT_ACK_LABEL =
	"I understand any USDC payout on this document is between the sender and recipients. Filosign doesn't guarantee payment, isn't part of that transfer, and won't settle disputes between us.";

export const SETTLEMENT_RECIPIENT_ACK_INTENT_VERSION =
	`settlement-recipient-ack:${SETTLEMENT_FEATURE_TERMS_VERSION}` as const;

export function settlementStatusLabel(
	status: SettlementRuleStatus,
	options?: { autoPayoutPending?: boolean },
): string {
	if (options?.autoPayoutPending && status === "ready") {
		return "Payout processing";
	}
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

export function settlementStatusLabelForCompliance(
	status: SettlementRuleStatus,
	options: { envelopeSigningComplete: boolean },
): string {
	if (
		options.envelopeSigningComplete &&
		(status === "pending" || status === "ready")
	) {
		return "Payout processing";
	}
	return settlementStatusLabel(status);
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
