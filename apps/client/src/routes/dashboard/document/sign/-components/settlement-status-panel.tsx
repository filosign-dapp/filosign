import type { SettlementRuleRow } from "@filosign/react/files";
import type { Address } from "viem";
import { defaultChain, SUPPORTED_TOKENS } from "@/src/constants";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { SettlementRuleRowView } from "@/src/routes/dashboard/document/sign/-components/settlement/rule-row";
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
	signingStarted?: boolean;
	/** Omit duplicate heading when wrapped in SignSidebar.Section. */
	hideSectionHeader?: boolean;
};

function explorerTxUrl(hash: string) {
	const base = defaultChain.blockExplorers?.default?.url;
	if (!base) return null;
	return `${base}/tx/${hash}`;
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
	signingStarted = false,
	hideSectionHeader = false,
}: Props) {
	if (rules.length === 0) return null;

	const decimals = SUPPORTED_TOKENS[0]?.decimals ?? 6;
	const settlePending = trySettlePending || manualSettlePending;

	return (
		<div
			className={
				hideSectionHeader
					? "space-y-3"
					: "space-y-3 border-t border-border pt-4"
			}
		>
			<div className="space-y-1">
				{hideSectionHeader ? null : (
					<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
						Attached payouts ({rules.length})
					</h4>
				)}
				{isSender ? (
					<p className="text-xs text-muted-foreground">
						USDC stays in your wallet until each payout runs. We send it
						automatically when signing is complete, using only what you&apos;ve
						approved. Use Send payout below only if one didn&apos;t go through.
						Revoke approval below to stop any unpaid payouts.{" "}
						<DocsLink href={DOCS_LINKS.payouts()}>
							Read the payouts guide
						</DocsLink>
					</p>
				) : (
					<p className="text-xs text-muted-foreground">
						Payouts run automatically after signing is complete. Use Retry
						payout if a transfer failed. Signing this document does not
						guarantee payment.{" "}
						<DocsLink href={DOCS_LINKS.payouts()}>
							Read the payouts guide
						</DocsLink>
					</p>
				)}
			</div>
			<div className="space-y-2">
				{rules.map((rule) => (
					<SettlementRuleRowView
						key={rule.id}
						rule={rule}
						decimals={decimals}
						formatAddress={formatAddress}
						isSender={isSender}
						walletAddress={walletAddress}
						canSettleByRuleId={canSettleByRuleId}
						trySettlePending={trySettlePending}
						manualSettlePending={manualSettlePending}
						settlingRuleId={settlingRuleId}
						explorerTxUrl={explorerTxUrl}
						onTrySettleRule={onTrySettleRule}
						onManualSettleRule={onManualSettleRule}
						canManageSettlements={canManageSettlements}
						onCancelRule={onCancelRule}
						onUpdateRule={onUpdateRule}
						cancelPending={cancelPending}
						updatePending={updatePending}
						signingStarted={signingStarted}
					/>
				))}
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
