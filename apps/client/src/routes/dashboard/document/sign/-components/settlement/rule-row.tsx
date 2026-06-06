import type { SettlementRuleRow } from "@filosign/react/files";
import type { SettlementRuleStatus } from "@filosign/shared";
import {
	settlementReleaseTypeLabel,
	settlementStatusLabel,
} from "@filosign/shared";
import {
	ArrowSquareOutIcon,
	CheckIcon,
	ClockIcon,
	WarningIcon,
} from "@phosphor-icons/react";
import type { Address } from "viem";
import { getAddress } from "viem";
import { Button } from "@/src/lib/components/ui/button";
import {
	buildSettlementRuleRowState,
	settlementRuleIconClassName,
	settlementRuleRowClassName,
	settlementRuleStatusClassName,
	settlementStatusIconKind,
} from "@/src/lib/domains/settlements/rule-row-state";
import {
	formatSettlementAmountLine,
	formatSettlementRecipientLine,
} from "@/src/lib/domains/settlements/settlement-display";
import { cn } from "@/src/lib/utils";
import { SettlementManageActions } from "@/src/routes/dashboard/document/sign/-components/settlement-manage-actions";

function StatusIcon({ status }: { status: SettlementRuleStatus }) {
	const kind = settlementStatusIconKind(status);
	if (kind === "executed" || kind === "partial") {
		return (
			<CheckIcon className="size-4 text-secondary-foreground" weight="bold" />
		);
	}
	if (kind === "failed") {
		return <WarningIcon className="size-4 text-amber-700" weight="fill" />;
	}
	return <ClockIcon className="size-4 text-muted-foreground" />;
}

type Props = {
	rule: SettlementRuleRow;
	decimals: number;
	formatAddress: (address: string) => string;
	isSender: boolean;
	walletAddress: `0x${string}` | undefined;
	canSettleByRuleId: Map<string, boolean>;
	trySettlePending: boolean;
	manualSettlePending: boolean;
	settlingRuleId: string | undefined;
	explorerTxUrl: (hash: string) => string | null;
	onTrySettleRule: (input: {
		onChainRuleId: string;
		validatorAddress: Address;
	}) => void;
	onManualSettleRule: (input: {
		onChainRuleId: string;
		validatorAddress: Address;
	}) => void;
	canManageSettlements?: boolean;
	onCancelRule?: (input: {
		onChainRuleId: string;
		validatorAddress: Address;
	}) => void;
	onUpdateRule?: (rule: SettlementRuleRow) => void;
	cancelPending?: boolean;
	updatePending?: boolean;
};

export function SettlementRuleRowView({
	rule,
	decimals,
	formatAddress,
	isSender,
	walletAddress,
	canSettleByRuleId,
	trySettlePending,
	manualSettlePending,
	settlingRuleId,
	explorerTxUrl,
	onTrySettleRule,
	onManualSettleRule,
	canManageSettlements = false,
	onCancelRule,
	onUpdateRule,
	cancelPending,
	updatePending,
}: Props) {
	const state = buildSettlementRuleRowState({
		rule,
		walletAddress,
		isSender,
		canSettleByRuleId,
		trySettlePending,
		manualSettlePending,
		settlingRuleId,
		explorerTxUrl,
	});
	const settlePending = trySettlePending || manualSettlePending;

	return (
		<div
			className={cn(
				"flex items-start gap-3 p-3 rounded-lg border",
				settlementRuleRowClassName(state),
			)}
		>
			<div
				className={cn(
					"size-8 rounded-full flex items-center justify-center shrink-0",
					settlementRuleIconClassName(state),
				)}
			>
				<StatusIcon status={rule.status} />
			</div>
			<div className="flex-1 min-w-0 space-y-0.5">
				<p className="text-sm font-medium truncate">
					{formatSettlementRecipientLine(rule, formatAddress)}
				</p>
				<p className="text-xs text-muted-foreground">
					{formatSettlementAmountLine(rule, decimals)}
					{state.legCount > 1
						? state.partial
							? ` · ${state.paidLegCount}/${state.legCount} recipients paid`
							: ` · ${state.legCount} recipients`
						: ""}{" "}
					· {settlementReleaseTypeLabel(rule.releaseType)}
				</p>
				<p className={cn("text-xs", settlementRuleStatusClassName(state))}>
					{settlementStatusLabel(rule.status)}
					{rule.lastError && state.failed ? `: ${rule.lastError}` : null}
				</p>
				{state.canSettle ? (
					<div className="flex flex-wrap gap-2 mt-2">
						<Button
							type="button"
							variant="default"
							size="sm"
							className="h-7 text-xs"
							disabled={settlePending}
							onClick={() =>
								onTrySettleRule({
									onChainRuleId: rule.onChainRuleId,
									validatorAddress: getAddress(rule.validatorAddress),
								})
							}
						>
							{state.isTrying ? "Sending…" : "Pay now"}
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							disabled={settlePending}
							onClick={() =>
								onManualSettleRule({
									onChainRuleId: rule.onChainRuleId,
									validatorAddress: getAddress(rule.validatorAddress),
								})
							}
						>
							{state.isSettling && !state.isTrying
								? "Sending…"
								: "Pay from my wallet"}
						</Button>
					</div>
				) : null}
				{canManageSettlements &&
				isSender &&
				!state.paid &&
				!state.cancelled &&
				onCancelRule &&
				onUpdateRule ? (
					<div className="mt-2 space-y-2">
						{state.partial ? (
							<p className="text-[11px] text-muted-foreground text-pretty">
								Cancelling stops only unpaid amounts. Money already sent cannot
								be taken back.
							</p>
						) : null}
						<SettlementManageActions
							rule={rule}
							onCancel={() =>
								onCancelRule({
									onChainRuleId: rule.onChainRuleId,
									validatorAddress: getAddress(rule.validatorAddress),
								})
							}
							onUpdate={() => onUpdateRule(rule)}
							cancelPending={cancelPending}
							updatePending={updatePending}
						/>
					</div>
				) : null}
			</div>
			{state.payoutUrl ? (
				<a
					href={state.payoutUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="text-muted-foreground hover:text-foreground shrink-0"
					title="View payout on explorer"
				>
					<ArrowSquareOutIcon className="size-4" />
				</a>
			) : null}
		</div>
	);
}
