import type { PaymentRuleRow } from "@filosign/react/files";
import type { PaymentRuleStatus } from "@filosign/shared";
import { paymentReleaseTypeLabel, paymentStatusLabel } from "@filosign/shared";
import {
	ArrowSquareOutIcon,
	CheckIcon,
	ClockIcon,
	WarningIcon,
} from "@phosphor-icons/react";
import { formatUnits } from "viem";
import { defaultChain, SUPPORTED_TOKENS } from "@/src/constants";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils";
import { PaymentRevokeAllowanceButton } from "@/src/routes/dashboard/document/sign/-components/payment-revoke-allowance-button";

const RETRIABLE: PaymentRuleStatus[] = [
	"failed_insufficient",
	"failed_gas_tank",
	"failed_conditions",
];

type Props = {
	rules: PaymentRuleRow[];
	formatAddress: (address: string) => string;
	isSender: boolean;
	retryPending: boolean;
	retryingRuleId: string | undefined;
	onRetryRule: (onChainRuleId: string) => void;
	revokePending: boolean;
	onRevokeAllowance: () => void;
};

function explorerTxUrl(hash: string) {
	const base = defaultChain.blockExplorers?.default?.url;
	if (!base) return null;
	return `${base}/tx/${hash}`;
}

function StatusIcon({ status }: { status: PaymentRuleStatus }) {
	if (status === "executed") {
		return <CheckIcon className="size-4 text-white" weight="bold" />;
	}
	if (status.startsWith("failed_")) {
		return <WarningIcon className="size-4 text-amber-700" weight="fill" />;
	}
	return <ClockIcon className="size-4 text-muted-foreground" />;
}

export function PaymentStatusPanel({
	rules,
	formatAddress,
	isSender,
	retryPending,
	retryingRuleId,
	onRetryRule,
	revokePending,
	onRevokeAllowance,
}: Props) {
	if (rules.length === 0) return null;

	const decimals = SUPPORTED_TOKENS[0]?.decimals ?? 6;

	return (
		<div className="pt-4 border-t border-border space-y-3">
			<div className="space-y-1">
				<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Attached payments ({rules.length})
				</h4>
				{isSender ? (
					<p className="text-xs text-muted-foreground">
						Recipient rules apply to sends through Filosign; on-chain payouts
						are controlled by your wallet. Revoke approval below to cancel
						unfunded payouts.
					</p>
				) : null}
			</div>
			<div className="space-y-2">
				{rules.map((rule) => {
					const paid = rule.status === "executed";
					const failed = rule.status.startsWith("failed_");
					const payoutUrl = rule.payoutTxHash
						? explorerTxUrl(rule.payoutTxHash)
						: null;
					const isRetrying =
						retryPending && retryingRuleId === rule.onChainRuleId;

					return (
						<div
							key={rule.id}
							className={cn(
								"flex items-start gap-3 p-3 rounded-lg border",
								paid
									? "bg-chart-2/10 border-chart-2/30"
									: failed
										? "bg-amber-500/10 border-amber-500/30"
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
									{formatAddress(rule.recipientWallet)}
								</p>
								<p className="text-xs text-muted-foreground">
									{formatUnits(BigInt(rule.amount), decimals)} USDC ·{" "}
									{paymentReleaseTypeLabel(rule.releaseType)}
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
									{paymentStatusLabel(rule.status)}
									{rule.lastError && failed ? ` — ${rule.lastError}` : null}
								</p>
								{isSender && RETRIABLE.includes(rule.status) ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="mt-2 h-7 text-xs"
										disabled={retryPending}
										onClick={() => onRetryRule(rule.onChainRuleId)}
									>
										{isRetrying ? "Queuing…" : "Retry payout"}
									</Button>
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
			<PaymentRevokeAllowanceButton
				rules={rules}
				isSender={isSender}
				revokePending={revokePending}
				retryPending={retryPending}
				onRevokeAllowance={onRevokeAllowance}
				className="w-full"
			/>
		</div>
	);
}
