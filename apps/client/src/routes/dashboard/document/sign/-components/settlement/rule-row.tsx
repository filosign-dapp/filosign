import type { SettlementRuleRow } from "@filosign/react/files";
import {
	settlementReleaseTypeLabel,
	settlementStatusLabel,
} from "@filosign/shared";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import type { Address } from "viem";
import { getAddress } from "viem";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	buildSettlementRuleRowState,
	formatSettlementAmountLine,
	formatSettlementRecipientLine,
	settlementRuleAccentClassName,
	settlementRuleStatusBadgeClassName,
} from "@/src/lib/domains/settlements";
import { cn } from "@/src/lib/utils";
import { SettlementManageActions } from "@/src/routes/dashboard/document/sign/-components/settlement-manage-actions";

type Props = {
	rule: SettlementRuleRow;
	decimals: number;
	formatAddress: (address: string) => string;
	isSender: boolean;
	walletAddress: `0x${string}` | undefined;
	canSettleByRuleId: Map<string, boolean>;
	firstCanExecuteAtByRuleId: Map<string, number>;
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
	signingStarted?: boolean;
};

export function SettlementRuleRowView({
	rule,
	decimals,
	formatAddress,
	isSender,
	walletAddress,
	canSettleByRuleId,
	firstCanExecuteAtByRuleId,
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
	signingStarted = false,
}: Props) {
	const state = buildSettlementRuleRowState({
		rule,
		walletAddress,
		isSender,
		canSettleByRuleId,
		firstCanExecuteAtByRuleId,
		trySettlePending,
		manualSettlePending,
		settlingRuleId,
		explorerTxUrl,
	});
	const settlePending = trySettlePending || manualSettlePending;

	return (
		<div
			className={cn(
				"rounded-lg border border-border/50 bg-background/50 p-3 border-l-2",
				settlementRuleAccentClassName(state, rule.status),
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1 space-y-1">
					<div className="flex flex-wrap items-center gap-1.5">
						<p className="min-w-0 truncate text-sm font-medium">
							{formatSettlementRecipientLine(rule, formatAddress)}
						</p>
						<Badge
							variant="outline"
							className={cn(
								"shrink-0 text-[11px] font-medium",
								settlementRuleStatusBadgeClassName(state, rule.status),
							)}
						>
							{settlementStatusLabel(rule.status, {
								autoPayoutPending: state.autoPayoutPending,
							})}
						</Badge>
					</div>
					<p className="text-xs text-muted-foreground">
						{formatSettlementAmountLine(rule, decimals)}
						{state.legCount > 1
							? state.partial
								? ` · ${state.paidLegCount}/${state.legCount} recipients paid`
								: ` · ${state.legCount} recipients`
							: ""}{" "}
						· {settlementReleaseTypeLabel(rule.releaseType)}
					</p>
					{rule.lastError && state.failed ? (
						<p className="text-[11px] text-destructive text-pretty">
							{rule.lastError}
						</p>
					) : null}
					{state.autoPayoutPending ? (
						<p className="text-[11px] text-muted-foreground text-pretty pt-1">
							Filosign sends this automatically after signing completes. Usually
							within a few minutes.
						</p>
					) : null}
					{state.canSettleManual ? (
						<div className="space-y-1.5 pt-1">
							<Button
								type="button"
								variant={state.autoPayoutPending ? "outline" : "default"}
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
								{state.isTrying
									? "Sending…"
									: state.partial || state.failed
										? "Retry payout"
										: state.autoPayoutPending
											? "Retry payout manually"
											: "Send payout"}
							</Button>
							<button
								type="button"
								className="text-xs text-muted-foreground underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
								disabled={settlePending}
								onClick={() =>
									onManualSettleRule({
										onChainRuleId: rule.onChainRuleId,
										validatorAddress: getAddress(rule.validatorAddress),
									})
								}
							>
								{state.isSettling && !state.isTrying
									? "Sending payout…"
									: "Send payout from my account instead"}
							</button>
						</div>
					) : null}
					{canManageSettlements &&
					isSender &&
					!state.paid &&
					!state.partial &&
					!state.cancelled &&
					onCancelRule &&
					onUpdateRule ? (
						<div className="space-y-2 pt-1">
							{signingStarted ? (
								<p className="text-[11px] text-muted-foreground text-pretty">
									Payout edits are locked after the first required signature.
									Use Clear signatures in Sender tools to reopen edits without
									voiding the envelope.
								</p>
							) : null}
							{!signingStarted ? (
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
							) : null}
						</div>
					) : null}
				</div>
				{state.payoutUrl ? (
					<a
						href={state.payoutUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="shrink-0 text-muted-foreground hover:text-foreground"
						title="View payout on explorer"
					>
						<ArrowSquareOutIcon className="size-4" />
					</a>
				) : null}
			</div>
		</div>
	);
}
