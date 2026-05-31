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
	onTrySettleRule: (input: {
		onChainRuleId: string;
		validatorAddress: Address;
	}) => void;
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
	if (status === "partial") {
		return <CheckIcon className="size-4 text-chart-2" weight="bold" />;
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
					Payout packets ({rules.length})
				</h4>
				{isSender ? (
					<p className="text-xs text-muted-foreground">
						USDC stays in your wallet until a leg executes. Filosign may relay
						authorized transfers, but the contract pulls only from your
						approval. Revoke approval below to block further legs.
					</p>
				) : (
					<p className="text-xs text-muted-foreground">
						When release conditions are met, the sender&apos;s wallet may
						transfer USDC on-chain. Use Execute attached payout to retry relay,
						or Run payout leg from your wallet if needed. Signing does not
						guarantee payment.
					</p>
				)}
			</div>
			<div className="space-y-2">
				{rules.map((rule) => {
					const paid = rule.status === "executed";
					const partial = rule.status === "partial";
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
					const paidLegCount =
						rule.legs?.filter((leg) => leg.paid === true).length ?? 0;

					return (
						<div
							key={rule.id}
							className={cn(
								"flex items-start gap-3 p-3 rounded-lg border",
								paid || partial
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
										: partial
											? "bg-chart-2/40"
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
									{legCount > 1
										? partial
											? ` · ${paidLegCount}/${legCount} legs paid`
											: ` · ${legCount} legs`
										: ""}{" "}
									· {settlementReleaseTypeLabel(rule.releaseType)}
								</p>
								<p
									className={cn(
										"text-xs",
										paid || partial
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
											onClick={() =>
												onTrySettleRule({
													onChainRuleId: rule.onChainRuleId,
													validatorAddress: getAddress(rule.validatorAddress),
												})
											}
										>
											{isTrying ? "Executing…" : "Execute attached payout"}
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
											{isSettling && !isTrying ? "Sending…" : "Run payout leg"}
										</Button>
									</div>
								) : null}
								{canManageSettlements &&
								isSender &&
								!paid &&
								!cancelled &&
								onCancelRule &&
								onUpdateRule ? (
									<div className="mt-2 space-y-2">
										{partial ? (
											<p className="text-[11px] text-muted-foreground text-pretty">
												Cancelling stops only unpaid legs. Amounts already
												transferred on-chain cannot be reversed.
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
