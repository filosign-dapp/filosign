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
import { defaultChain, SUPPORTED_TOKENS } from "@/src/constants";
import { Button } from "@/src/lib/components/ui/button";
import {
	formatSettlementAmountLine,
	formatSettlementRecipientLine,
	isSettlementRecipient,
} from "@/src/lib/domains/settlements/settlement-display";
import { cn } from "@/src/lib/utils";
import { SettlementManageActions } from "@/src/routes/dashboard/document/sign/-components/settlement-manage-actions";
import { SettlementRevokeAllowanceButton } from "@/src/routes/dashboard/document/sign/-components/settlement-revoke-allowance-button";

type Props = {
	rules: SettlementRuleRow[];
	formatAddress: (address: string) => string;
	isSender: boolean;
	walletAddress: `0x${string}` | undefined;
	canSettleByRuleId: Map<string, boolean>;
	trySettlePending: boolean;
	manualSettlePending: boolean;
	settlingRuleId: string | undefined;
	onTrySettleRule: (onChainRuleId: string) => void;
	onManualSettleRule: (input: {
		onChainRuleId: string;
		validatorAddress: Address;
	}) => void;
	revokePending: boolean;
	onRevokeAllowance: () => void;
	canManageSettlements?: boolean;
	onCancelRule?: (input: {
		onChainRuleId: string;
		validatorAddress: Address;
	}) => void;
	onUpdateRule?: (rule: SettlementRuleRow) => void;
	cancelPending?: boolean;
	updatePending?: boolean;
};

function explorerTxUrl(hash: string) {
	const base = defaultChain.blockExplorers?.default?.url;
	if (!base) return null;
	return `${base}/tx/${hash}`;
}

function StatusIcon({ status }: { status: SettlementRuleStatus }) {
	if (status === "executed") {
		return <CheckIcon className="size-4 text-white" weight="bold" />;
	}
	if (status.startsWith("failed_")) {
		return <WarningIcon className="size-4 text-amber-700" weight="fill" />;
	}
	return <ClockIcon className="size-4 text-muted-foreground" />;
}

function canActOnRule(
	rule: SettlementRuleRow,
	walletAddress: `0x${string}` | undefined,
	isSender: boolean,
): boolean {
	if (!walletAddress) return false;
	if (isSender) return true;
	return isSettlementRecipient(rule, walletAddress);
}

export function SettlementStatusPanel({
	rules,
	formatAddress,
	isSender,
	walletAddress,
	canSettleByRuleId,
	trySettlePending,
	manualSettlePending,
	settlingRuleId,
	onTrySettleRule,
	onManualSettleRule,
	revokePending,
	onRevokeAllowance,
	canManageSettlements = false,
	onCancelRule,
	onUpdateRule,
	cancelPending,
	updatePending,
}: Props) {
	if (rules.length === 0) return null;

	const decimals = SUPPORTED_TOKENS[0]?.decimals ?? 6;
	const settlePending = trySettlePending || manualSettlePending;

	return (
		<div className="pt-4 border-t border-border space-y-3">
			<div className="space-y-1">
				<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Attached settlements ({rules.length})
				</h4>
				{isSender ? (
					<p className="text-xs text-muted-foreground">
						USDC stays in your wallet until payout executes. Filosign can relay
						the settlement transaction, but the contract pulls funds only from
						your wallet approval. Revoke approval below to cancel unfunded
						payouts.
					</p>
				) : (
					<p className="text-xs text-muted-foreground">
						When release conditions are met, settlement can execute on-chain.
						Use Settle payment on this page, or settle from your wallet if
						needed.
					</p>
				)}
			</div>
			<div className="space-y-2">
				{rules.map((rule) => {
					const paid = rule.status === "executed";
					const cancelled = rule.status === "cancelled";
					const failed = rule.status.startsWith("failed_");
					const payoutUrl = rule.payoutTxHash
						? explorerTxUrl(rule.payoutTxHash)
						: null;
					const isSettling =
						settlePending && settlingRuleId === rule.onChainRuleId;
					const isTrying =
						trySettlePending && settlingRuleId === rule.onChainRuleId;
					const canSettle =
						!paid &&
						!cancelled &&
						canSettleByRuleId.get(rule.onChainRuleId) === true &&
						canActOnRule(rule, walletAddress, isSender);
					const legCount = rule.legs?.length ?? 1;

					return (
						<div
							key={rule.id}
							className={cn(
								"flex items-start gap-3 p-3 rounded-lg border",
								paid
									? "bg-chart-2/10 border-chart-2/30"
									: failed
										? "bg-amber-500/10 border-amber-500/30"
										: cancelled
											? "bg-muted/20 border-border/80"
											: "bg-muted/30 border-border",
							)}
						>
							<div
								className={cn(
									"size-8 rounded-full flex items-center justify-center shrink-0",
									paid
										? "bg-chart-2"
										: failed
											? "bg-amber-100 dark:bg-amber-950"
											: "bg-muted",
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
									{legCount > 1 ? ` · ${legCount} legs` : ""} ·{" "}
									{settlementReleaseTypeLabel(rule.releaseType)}
								</p>
								<p
									className={cn(
										"text-xs",
										paid
											? "text-chart-2"
											: failed
												? "text-amber-800 dark:text-amber-200"
												: "text-muted-foreground",
									)}
								>
									{settlementStatusLabel(rule.status)}
									{rule.lastError && failed ? `: ${rule.lastError}` : null}
								</p>
								{canSettle ? (
									<div className="flex flex-wrap gap-2 mt-2">
										<Button
											type="button"
											variant="default"
											size="sm"
											className="h-7 text-xs"
											disabled={settlePending}
											onClick={() => onTrySettleRule(rule.onChainRuleId)}
										>
											{isTrying ? "Settling…" : "Settle payment"}
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
													validatorAddress: rule.validatorAddress as Address,
												})
											}
										>
											{isSettling && !isTrying
												? "Sending…"
												: "Settle from wallet"}
										</Button>
									</div>
								) : null}
								{canManageSettlements &&
								isSender &&
								!paid &&
								!cancelled &&
								onCancelRule &&
								onUpdateRule ? (
									<SettlementManageActions
										rule={rule}
										onCancel={() =>
											onCancelRule({
												onChainRuleId: rule.onChainRuleId,
												validatorAddress: rule.validatorAddress as Address,
											})
										}
										onUpdate={() => onUpdateRule(rule)}
										cancelPending={cancelPending}
										updatePending={updatePending}
									/>
								) : null}
							</div>
							{payoutUrl ? (
								<a
									href={payoutUrl}
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
				})}
			</div>
			<SettlementRevokeAllowanceButton
				rules={rules}
				isSender={isSender}
				revokePending={revokePending}
				settlePending={settlePending}
				onRevokeAllowance={onRevokeAllowance}
				className="w-full"
			/>
		</div>
	);
}
