import { useEntitlements } from "@filosign/react/billing";
import {
	canUseBasicSettlements,
	useBasicPayoutAttachGate,
} from "@filosign/react/files";
import { useActiveOrganization, useActiveOrgId } from "@filosign/react/orgs";
import {
	isAdvancedSettlementReleaseType,
	normalizeSettlementReleaseType,
	type ReleaseCopyContext,
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
import { mergeEnvelopeFormIntoCreateForm } from "@/src/lib/domains/drafts";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import {
	PayoutRuleDialog,
	routingContextFromCompose,
} from "@/src/lib/domains/satellites";
import type { SettlementAttachmentDraft } from "@/src/lib/domains/settlements";
import {
	PayoutAccessRequestDialog,
	PayoutAccessStatusLine,
	PayoutPayerControl,
	payoutAccessRequestDialogProps,
	useBasicPayoutGateActions,
	usePayoutPayerBalance,
	usePayoutPayerPreference,
} from "@/src/lib/domains/settlements";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { formatUsdcAmountString } from "@/src/lib/web3/format-usdc";
import {
	ComposeRuleCard,
	ComposeRuleCardEditRemoveActions,
} from "@/src/routes/dashboard/envelope/create/-components/compose-rule-card";
import { PayoutBalanceSummary } from "@/src/routes/dashboard/envelope/create/-components/payout-balance-summary";
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
	routingContext,
	onEdit,
	onRemove,
}: {
	legs: SettlementAttachmentDraft[];
	routingContext: ReleaseCopyContext;
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
				{settlementReleaseTypeLabel(releaseType, routingContext, {
					thresholdN: first.thresholdN,
				})}
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

export function ComposePayoutsContent() {
	const { form, payoutBalance } = useCreateEnvelope();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const { data: entitlements } = useEntitlements();
	const { canUseExternalRecipients } = useBasicPayoutAttachGate();
	const activeOrgId = useActiveOrgId();
	const activeOrg = useActiveOrganization();
	const settlementsEnabled = canUseBasicSettlements(entitlements);

	const createForm = useStorePersist((s) => s.createForm);
	const recipients = useStore(form.store, (state) => state.values.recipients);
	const settlementDrafts = useStore(
		form.store,
		(state) => state.values.settlementDrafts ?? [],
	);
	const payoutPayerSource = useStore(
		form.store,
		(state) => state.values.payoutPayerSource ?? "sender",
	);
	const payoutPayerUserOverride = useStore(
		form.store,
		(state) => state.values.payoutPayerUserOverride,
	);

	const routingContext = useMemo(
		() => routingContextFromCompose(recipients, createForm?.registerRouting),
		[recipients, createForm?.registerRouting],
	);

	const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
	const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

	const payerPreference = usePayoutPayerPreference(form, {
		payoutPayerSource,
		payoutPayerUserOverride,
	});

	const payerBalance = usePayoutPayerBalance(payoutPayerSource, {
		enabled: ruleDialogOpen,
	});

	const canManage = activeOrg?.role === "owner" || activeOrg?.role === "admin";

	const {
		canAttach,
		gate,
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

	if (settlementsEnabled && !canAttach && ruleGroups.length === 0) {
		return (
			<>
				<PayoutAccessStatusLine
					gate={gate}
					canManage={canManage}
					onRequestAccess={() => setRequestDialogOpen(true)}
				/>
				<PayoutAccessRequestDialog
					{...payoutAccessRequestDialogProps(
						{ open: requestDialogOpen, onOpenChange: setRequestDialogOpen },
						payoutAccess,
					)}
				/>
			</>
		);
	}

	const editingLegs = editingRuleId
		? getDraftsByRuleId(settlementDrafts, editingRuleId)
		: [];

	const onSettlementDraftsChange = (next: typeof settlementDrafts) => {
		form.setFieldValue("settlementDrafts", next);
	};

	const persistSettlementDrafts = async (next: typeof settlementDrafts) => {
		onSettlementDraftsChange(next);
		const prev = useStorePersist.getState().createForm;
		const merged = await mergeEnvelopeFormIntoCreateForm(
			{ ...form.state.values, settlementDrafts: next },
			prev,
		);
		setCreateForm(merged);
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

	const handleSave = async (
		ruleId: string,
		legs: SettlementAttachmentDraft[],
	) => {
		await persistSettlementDrafts(
			upsertRuleDrafts(settlementDrafts, ruleId, legs),
		);
		setEditingRuleId(null);
	};

	const handleRemove = async () => {
		if (!editingRuleId) return;
		await persistSettlementDrafts(
			removeDraftsByRuleId(settlementDrafts, editingRuleId),
		);
		setEditingRuleId(null);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1">
					<h3 className="text-sm font-semibold">Attached payouts</h3>
					<p className="text-xs text-muted-foreground">
						Pre-authorize stablecoin payouts for Filosign recipients
						{canUseExternalRecipients ? " or external wallets" : ""} when
						signing conditions are met. Funds stay in your account until each
						payout executes.{" "}
						<DocsLink href={DOCS_LINKS.payouts()}>Payouts guide</DocsLink>
					</p>
					{canAttach ? (
						<p className="text-xs text-muted-foreground">
							Attached payouts use a small amount of ETH from your paying
							account to register rules on Base. Keep a little ETH there, not
							just USDC.
						</p>
					) : null}
				</div>
				{canAttach ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="gap-1.5 shrink-0"
						onClick={openCreate}
					>
						<PlusIcon className="size-4" weight="regular" />
						Add payout
					</Button>
				) : null}
			</div>

			<PayoutPayerControl
				canOfferTreasuryPayer={payerPreference.canOfferTreasuryPayer}
				payoutPayerSource={payerPreference.payoutPayerSource}
				orgWalletAddress={payerPreference.orgWalletAddress}
				onUseConnectedWallet={payerPreference.useConnectedWallet}
				onUseTreasury={payerPreference.resetTreasuryDefault}
			/>

			{ruleGroups.length > 0 ? (
				<>
					<ul className="space-y-2">
						{ruleGroups.map(({ ruleId, legs }) => (
							<PayoutRuleCard
								key={ruleId}
								legs={legs}
								routingContext={routingContext}
								onEdit={() => openEdit(ruleId)}
								onRemove={() =>
									void persistSettlementDrafts(
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
			) : canAttach ? (
				<p className="text-xs text-muted-foreground">
					No payouts yet. Add a rule and choose Filosign recipients
					{canUseExternalRecipients ? " or an external wallet address" : ""}.
				</p>
			) : (
				<PayoutAccessStatusLine
					gate={gate}
					canManage={canManage}
					onRequestAccess={() => setRequestDialogOpen(true)}
				/>
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
					routingContext={routingContext}
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
		</div>
	);
}
