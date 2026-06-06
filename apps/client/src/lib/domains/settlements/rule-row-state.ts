import type { SettlementRuleRow } from "@filosign/react/files";
import type { SettlementRuleStatus } from "@filosign/shared";
import { isSettlementRecipient } from "@/src/lib/domains/settlements/settlement-display";

export type SettlementRuleRowState = {
	paid: boolean;
	partial: boolean;
	cancelled: boolean;
	failed: boolean;
	payoutUrl: string | null;
	isSettling: boolean;
	isTrying: boolean;
	canSettle: boolean;
	legCount: number;
	paidLegCount: number;
};

export function canActOnSettlementRule(
	rule: SettlementRuleRow,
	walletAddress: `0x${string}` | undefined,
	isSender: boolean,
): boolean {
	if (!walletAddress) return false;
	if (isSender) return true;
	return isSettlementRecipient(rule, walletAddress);
}

export function buildSettlementRuleRowState(args: {
	rule: SettlementRuleRow;
	walletAddress: `0x${string}` | undefined;
	isSender: boolean;
	canSettleByRuleId: Map<string, boolean>;
	trySettlePending: boolean;
	manualSettlePending: boolean;
	settlingRuleId: string | undefined;
	explorerTxUrl: (hash: string) => string | null;
}): SettlementRuleRowState {
	const {
		rule,
		walletAddress,
		isSender,
		canSettleByRuleId,
		trySettlePending,
		manualSettlePending,
		settlingRuleId,
		explorerTxUrl,
	} = args;

	const paid = rule.status === "executed";
	const partial = rule.status === "partial";
	const cancelled = rule.status === "cancelled";
	const failed = rule.status.startsWith("failed_");
	const settlePending = trySettlePending || manualSettlePending;

	return {
		paid,
		partial,
		cancelled,
		failed,
		payoutUrl: rule.payoutTxHash ? explorerTxUrl(rule.payoutTxHash) : null,
		isSettling: settlePending && settlingRuleId === rule.onChainRuleId,
		isTrying: trySettlePending && settlingRuleId === rule.onChainRuleId,
		canSettle:
			!paid &&
			!cancelled &&
			canSettleByRuleId.get(rule.onChainRuleId) === true &&
			canActOnSettlementRule(rule, walletAddress, isSender),
		legCount: rule.legs?.length ?? 1,
		paidLegCount: rule.legs?.filter((leg) => leg.paid === true).length ?? 0,
	};
}

export function settlementRuleRowClassName(
	state: SettlementRuleRowState,
): string {
	if (state.paid || state.partial) return "bg-secondary/10 border-secondary/30";
	if (state.failed) return "bg-amber-500/10 border-amber-500/30";
	if (state.cancelled) return "bg-muted/20 border-border/80";
	return "bg-muted/30 border-border";
}

export function settlementRuleIconClassName(
	state: SettlementRuleRowState,
): string {
	if (state.paid) return "bg-secondary";
	if (state.partial) return "bg-secondary/40";
	if (state.failed) return "bg-amber-100 dark:bg-amber-950";
	return "bg-muted";
}

export function settlementRuleStatusClassName(
	state: SettlementRuleRowState,
): string {
	if (state.paid || state.partial) return "text-secondary-foreground";
	if (state.failed) return "text-amber-800 dark:text-amber-200";
	return "text-muted-foreground";
}

export function settlementStatusIconKind(
	status: SettlementRuleStatus,
): "executed" | "partial" | "failed" | "pending" {
	if (status === "executed") return "executed";
	if (status === "partial") return "partial";
	if (status.startsWith("failed_")) return "failed";
	return "pending";
}
