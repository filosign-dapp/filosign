import { useEntitlements } from "@filosign/react/billing";
import { canUseWorkspaceTreasury } from "@filosign/react/files";
import { useActiveOrganization, useActiveOrgId } from "@filosign/react/orgs";
import {
	isAdvancedSettlementReleaseType,
	normalizeSettlementReleaseType,
	settlementReleaseTypeLabel,
} from "@filosign/shared";
import { PlusIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import { useEffect, useMemo, useState } from "react";
import { SUPPORTED_TOKENS } from "@/src/constants";
import { Image } from "@/src/lib/components/app/media/image";
import { Button } from "@/src/lib/components/ui/button";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import { UpgradePlanDialog } from "@/src/lib/domains/entitlements/upgrade-plan-dialog";
import { useOrgWalletAddress } from "@/src/lib/domains/orgs/use-org-wallet-address";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements";
import {
	PayoutAccessRequestDialog,
	payoutAccessRequestDialogProps,
	useBasicPayoutGateActions,
	usePayoutPayerBalance,
} from "@/src/lib/domains/settlements";
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
	const { data: entitlements } = useEntitlements();
	const activeOrgId = useActiveOrgId();
	const activeOrg = useActiveOrganization();
	const orgWalletAddress = useOrgWalletAddress();

	const recipients = useStore(form.store, (state) => state.values.recipients);
	const settlementDrafts = useStore(
		form.store,
		(state) => state.values.settlementDrafts ?? [],
	);
	const payoutPayerSource = useStore(
		form.store,
		(state) => state.values.payoutPayerSource ?? "sender",
	);

	const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
	const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
	const [treasuryUpgradeOpen, setTreasuryUpgradeOpen] = useState(false);
	const canUseCustomTreasury = canUseWorkspaceTreasury(entitlements);

	const payerBalance = usePayoutPayerBalance(payoutPayerSource, {
		enabled: ruleDialogOpen,
	});

	const canManage = activeOrg?.role === "owner" || activeOrg?.role === "admin";

	const {
		canAttach,
		requestDialogOpen,
		setRequestDialogOpen,
		payoutAccess,
		guardPayoutAttach,
	} = useBasicPayoutGateActions({
		activeOrgId: activeOrgId ?? undefined,
		canManage,
	});

	const ruleGroups = useMemo(
		() => getRuleGroups(settlementDrafts),
		[settlementDrafts],
	);
	useEffect(() => {
		if (!canUseCustomTreasury && payoutPayerSource === "org_wallet") {
			form.setFieldValue("payoutPayerSource", "sender");
		}
	}, [canUseCustomTreasury, form, payoutPayerSource]);

	if (recipients.length === 0) return null;

	const editingLegs = editingRuleId
		? getDraftsByRuleId(settlementDrafts, editingRuleId)
		: [];

	const onSettlementDraftsChange = (next: typeof settlementDrafts) => {
		form.setFieldValue("settlementDrafts", next);
	};

	const openCreate = () => {
		if (guardPayoutAttach()) return;
		setEditingRuleId(null);
		setRuleDialogOpen(true);
	};

	const openEdit = (ruleId: string) => {
		if (guardPayoutAttach()) return;
		setEditingRuleId(ruleId);
		setRuleDialogOpen(true);
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

	return (
		<section className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-5">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1">
					<h2 className="inline-flex items-center gap-2 text-sm font-semibold">
						Attached payouts
						<ProFeatureMark size="xs" />
					</h2>
					<p className="text-xs text-muted-foreground">
						Pre-authorize stablecoin payouts for Filosign recipients when
						signing conditions are met. Funds stay in your wallet until each
						payout executes.{" "}
						<DocsLink href={DOCS_LINKS.payouts()}>Payouts guide</DocsLink>
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="gap-1.5 shrink-0"
					onClick={openCreate}
				>
					<PlusIcon className="size-4" weight="regular" />
					Add payout
					<ProFeatureMark size="xs" />
				</Button>
			</div>
			<div className="rounded-lg border border-border/50 bg-background/50 p-3">
				<p className="text-xs font-medium text-foreground">Payout payer</p>
				<div className="mt-2 flex flex-wrap gap-2">
					<Button
						type="button"
						size="sm"
						variant={payoutPayerSource === "sender" ? "primary" : "outline"}
						onClick={() => form.setFieldValue("payoutPayerSource", "sender")}
					>
						My connected wallet
					</Button>
					<Button
						type="button"
						size="sm"
						variant={payoutPayerSource === "org_wallet" ? "primary" : "outline"}
						disabled={!orgWalletAddress}
						onClick={() => {
							if (!canUseCustomTreasury) {
								setTreasuryUpgradeOpen(true);
								return;
							}
							form.setFieldValue("payoutPayerSource", "org_wallet");
						}}
					>
						Workspace treasury
					</Button>
				</div>
				<p className="mt-2 text-xs text-muted-foreground">
					{payoutPayerSource === "org_wallet" && orgWalletAddress
						? `Using treasury ${orgWalletAddress}.`
						: "Using your connected account."}
				</p>
				{!canUseCustomTreasury ? (
					<p className="mt-1 text-xs text-muted-foreground">
						Custom workspace treasury payer requires Teams Pro or Enterprise.
					</p>
				) : null}
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
					{canAttach ? (
						<PayoutBalanceSummary
							formattedTotal={payoutBalance.formattedTotal}
							formattedBalance={payoutBalance.formattedBalance}
							balancePending={payoutBalance.balancePending}
							balanceError={payoutBalance.balanceError}
							walletConnected={Boolean(payoutBalance.walletAddress)}
							exceedsBalance={payoutBalance.exceedsBalance}
							payerLabel={payoutBalance.payerLabel}
						/>
					) : null}
				</>
			) : (
				<p className="text-xs text-muted-foreground">
					No payouts yet. Add a rule and choose Filosign recipients with linked
					wallets.
				</p>
			)}

			{ruleDialogOpen ? (
				<PayoutRuleDialog
					key={payerBalance.payerAddress ?? payoutPayerSource}
					open={ruleDialogOpen}
					onOpenChange={(open) => {
						setRuleDialogOpen(open);
						if (!open) setEditingRuleId(null);
					}}
					recipients={recipients}
					allSettlementDrafts={settlementDrafts}
					existingRuleId={editingRuleId}
					existingLegs={editingLegs}
					payerWalletAddress={payerBalance.payerAddress}
					payerLabel={payerBalance.payerLabel}
					walletBalance={payerBalance.balance}
					walletBalanceFormatted={payerBalance.formatted}
					balancePending={payerBalance.isPending}
					balanceError={payerBalance.isError}
					onSave={handleSave}
					onRemove={handleRemove}
				/>
			) : null}

			<PayoutAccessRequestDialog
				{...payoutAccessRequestDialogProps(
					{ open: requestDialogOpen, onOpenChange: setRequestDialogOpen },
					payoutAccess,
				)}
			/>
			<UpgradePlanDialog
				open={treasuryUpgradeOpen}
				onOpenChange={setTreasuryUpgradeOpen}
				reason="features.treasury.workspace_custom"
			/>
		</section>
	);
}
