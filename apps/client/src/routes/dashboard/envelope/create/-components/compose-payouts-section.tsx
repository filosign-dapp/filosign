import { useBasicPayoutAttachGate } from "@filosign/react/files";
import {
	isAdvancedSettlementReleaseType,
	normalizeSettlementReleaseType,
	settlementReleaseTypeLabel,
} from "@filosign/shared";
import { PlusIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { SUPPORTED_TOKENS } from "@/src/constants";
import { Image } from "@/src/lib/components/app/media/image";
import { Button } from "@/src/lib/components/ui/button";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements/attachment-draft";
import { formatUsdcAmountString } from "@/src/lib/web3/format-usdc";
import {
	ComposeRuleCard,
	ComposeRuleCardEditRemoveActions,
} from "@/src/routes/dashboard/envelope/create/-components/compose-rule-card";
import { PayoutBalanceSummary } from "@/src/routes/dashboard/envelope/create/-components/payout-balance-summary";
import { PayoutRuleDialog } from "@/src/routes/dashboard/envelope/create/-components/payout-rule-dialog";
import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";
import {
	getDraftsByRuleId,
	getRuleGroups,
	removeDraftsByRuleId,
	upsertRuleDrafts,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/settlement-drafts";

const usdcToken = SUPPORTED_TOKENS[0];

function PayoutRuleCard({
	legs,
	onEdit,
	onRemove,
}: {
	legs: SettlementAttachmentDraft[];
	onEdit: () => void;
	onRemove: () => void;
}) {
	const first = legs[0];
	if (!first) return null;

	const releaseType = normalizeSettlementReleaseType(first.releaseType);
	const isProRelease = isAdvancedSettlementReleaseType(releaseType);

	return (
		<ComposeRuleCard
			actions={
				<ComposeRuleCardEditRemoveActions
					onEdit={onEdit}
					onRemove={onRemove}
					editLabel="Edit payout"
					removeLabel="Remove payout"
				/>
			}
		>
			<p className="inline-flex items-center gap-2 text-sm font-medium">
				{settlementReleaseTypeLabel(releaseType)}
				{isProRelease ? <ProFeatureMark size="xs" /> : null}
			</p>
			<ul className="space-y-0.5 text-xs text-muted-foreground">
				{legs.map((leg) => (
					<li
						key={leg.id}
						className="inline-flex min-w-0 items-center gap-1 truncate"
					>
						<span className="truncate">{leg.recipientLabel} ·</span>
						<Image
							src={usdcToken.icon}
							alt=""
							width={12}
							height={12}
							className="size-3 shrink-0 rounded-full"
						/>
						<span className="shrink-0 tabular-nums">
							{formatUsdcAmountString(leg.amountUsdc, usdcToken.decimals)}
						</span>
					</li>
				))}
			</ul>
		</ComposeRuleCard>
	);
}

export function ComposePayoutsSection() {
	const { form, payoutBalance } = useCreateEnvelope();
	const recipients = useStore(form.store, (state) => state.values.recipients);
	const settlementDrafts = useStore(
		form.store,
		(state) => state.values.settlementDrafts ?? [],
	);
	const { canAttach } = useBasicPayoutAttachGate();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

	const ruleGroups = useMemo(
		() => getRuleGroups(settlementDrafts),
		[settlementDrafts],
	);

	const editingLegs = editingRuleId
		? getDraftsByRuleId(settlementDrafts, editingRuleId)
		: [];

	const onSettlementDraftsChange = (next: typeof settlementDrafts) => {
		form.setFieldValue("settlementDrafts", next);
	};

	const openCreate = () => {
		setEditingRuleId(null);
		setDialogOpen(true);
	};

	const openEdit = (ruleId: string) => {
		setEditingRuleId(ruleId);
		setDialogOpen(true);
	};

	const handleSave = (ruleId: string, legs: SettlementAttachmentDraft[]) => {
		onSettlementDraftsChange(upsertRuleDrafts(settlementDrafts, ruleId, legs));
		setEditingRuleId(null);
	};

	const handleRemove = () => {
		if (!editingRuleId) return;
		onSettlementDraftsChange(
			removeDraftsByRuleId(settlementDrafts, editingRuleId),
		);
		setEditingRuleId(null);
	};

	if (!canAttach || recipients.length === 0) return null;

	return (
		<section className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-5">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1">
					<h2 className="text-sm font-semibold">Attached payouts</h2>
					<p className="text-xs text-muted-foreground">
						Pre-authorize stablecoin payouts for Filosign recipients when
						signing conditions are met. Funds stay in your wallet until each
						payout executes.{" "}
						<DocsLink href={DOCS_LINKS.payouts()}>Payouts guide</DocsLink>
					</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={openCreate}>
					<PlusIcon className="size-4" weight="regular" />
					Add payout
				</Button>
			</div>

			{ruleGroups.length > 0 ? (
				<>
					<ul className="space-y-2">
						{ruleGroups.map(({ ruleId, legs }) => (
							<PayoutRuleCard
								key={ruleId}
								legs={legs}
								onEdit={() => openEdit(ruleId)}
								onRemove={() =>
									onSettlementDraftsChange(
										removeDraftsByRuleId(settlementDrafts, ruleId),
									)
								}
							/>
						))}
					</ul>
					<PayoutBalanceSummary
						formattedTotal={payoutBalance.formattedTotal}
						formattedBalance={payoutBalance.formattedBalance}
						balancePending={payoutBalance.balancePending}
						balanceError={payoutBalance.balanceError}
						walletConnected={Boolean(payoutBalance.walletAddress)}
						exceedsBalance={payoutBalance.exceedsBalance}
					/>
				</>
			) : (
				<p className="text-xs text-muted-foreground">
					No payouts yet. Add a rule and choose Filosign recipients with linked
					wallets.
				</p>
			)}

			{dialogOpen ? (
				<PayoutRuleDialog
					open={dialogOpen}
					onOpenChange={(open) => {
						setDialogOpen(open);
						if (!open) setEditingRuleId(null);
					}}
					recipients={recipients}
					allSettlementDrafts={settlementDrafts}
					existingRuleId={editingRuleId}
					existingLegs={editingLegs}
					onSave={handleSave}
					onRemove={handleRemove}
				/>
			) : null}
		</section>
	);
}
