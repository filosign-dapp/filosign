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

export type SettlementRuleStatusTone =
	| "muted"
	| "success"
	| "warning"
	| "primary"
	| "destructive";

const statusToneClass: Record<SettlementRuleStatusTone, string> = {
	muted: "border-border/60 bg-muted/60 text-muted-foreground",
	success: "border-border bg-secondary text-black",
	warning: "border-warning/30 bg-warning/10 text-warning",
	primary: "border-secondary/30 bg-secondary/5 text-secondary",
	destructive: "border-destructive/30 bg-destructive/10 text-destructive",
};

const rowAccentClass: Record<SettlementRuleStatusTone, string> = {
	muted: "border-l-muted-foreground/35",
	success: "border-l-secondary",
	warning: "border-l-warning",
	primary: "border-l-primary",
	destructive: "border-l-destructive/70",
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

export function settlementRuleStatusTone(
	state: SettlementRuleRowState,
	status: SettlementRuleStatus,
): SettlementRuleStatusTone {
	if (state.paid) return "success";
	if (state.partial) return "warning";
	if (state.failed) return "destructive";
	if (state.cancelled) return "muted";
	if (status === "ready") return "primary";
	return "muted";
}

export function settlementRuleAccentClassName(
	state: SettlementRuleRowState,
	status: SettlementRuleStatus,
): string {
	return rowAccentClass[settlementRuleStatusTone(state, status)];
}

export function settlementRuleStatusBadgeClassName(
	state: SettlementRuleRowState,
	status: SettlementRuleStatus,
): string {
	return statusToneClass[settlementRuleStatusTone(state, status)];
}
