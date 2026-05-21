import type { PaymentReleaseType, PaymentRuleStatus } from "./payment-rules";

export function paymentStatusLabel(status: PaymentRuleStatus): string {
	switch (status) {
		case "pending":
			return "Pending";
		case "ready":
			return "Ready to pay";
		case "executed":
			return "Paid";
		case "failed_insufficient":
			return "Insufficient balance";
		case "failed_gas_tank":
			return "Gas tank depleted";
		case "failed_conditions":
			return "Conditions not met";
	}
}

export function paymentReleaseTypeLabel(
	releaseType: PaymentReleaseType | string,
): string {
	switch (releaseType) {
		case "all_signed":
			return "When all sign";
		case "specific_signer":
			return "When specific signer signs";
		case "at_least_n":
			return "When N signers sign";
		default:
			return releaseType;
	}
}

export function paymentHeaderSummary(
	rules: readonly { status: PaymentRuleStatus }[],
): "none" | "all_paid" | "pending" | "failed" {
	if (rules.length === 0) return "none";
	if (rules.some((r) => r.status.startsWith("failed_"))) return "failed";
	if (rules.every((r) => r.status === "executed")) return "all_paid";
	return "pending";
}
