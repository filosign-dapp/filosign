import type { SettlementRuleStatus } from "@filosign/shared";
import {
	emitCriticalPlatformEvent,
	PLATFORM_ALERT_EVENTS,
} from "@/lib/platform/analytics";

export function mapExecuteErrorToStatus(message: string): SettlementRuleStatus {
	const lower = message.toLowerCase();
	if (
		lower.includes("insufficient") ||
		lower.includes("allowance") ||
		lower.includes("transfer") ||
		lower.includes("balance")
	) {
		return "failed_insufficient";
	}
	if (lower.includes("not executable") || lower.includes("conditions")) {
		return "failed_conditions";
	}
	return "failed_relay";
}

export function alertSettlementRelayPayoutFailed(args: {
	onChainRuleId: bigint;
	pieceCid?: string;
	status: SettlementRuleStatus;
	error: string;
	txHash?: string;
}): void {
	const message =
		args.status === "failed_insufficient"
			? "Settlement payout failed (insufficient funds)"
			: args.status === "failed_conditions"
				? "Settlement payout failed (conditions not met)"
				: "Settlement relay payout failed";

	void emitCriticalPlatformEvent({
		name: PLATFORM_ALERT_EVENTS.settlementsRelayPayoutFailed,
		severity: "error",
		message,
		context: {
			onChainRuleId: args.onChainRuleId.toString(),
			pieceCid: args.pieceCid,
			status: args.status,
			error: args.error,
			txHash: args.txHash,
		},
	});
}
