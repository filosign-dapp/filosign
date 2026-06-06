import { getPlanPrice, getPlanYearlyTotal } from "@filosign/entitlements";
import {
	useChangeOrgPlan,
	useCreateOrgCheckoutSession,
	useCreateOrgPortalSession,
	useOrgBillingSummary,
	usePreviewOrgPlanChange,
	usePreviewOrgSeatChange,
	useUpdateOrgSeats,
	useWorkspaceBillingContext,
} from "@filosign/react/billing";
import { CreditCardIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	SettingsSection,
	SettingsSyncNotice,
} from "@/src/lib/components/settings/section";
import { Badge } from "@/src/lib/components/ui/badge";
import {
	PlanSeatTiles,
	planDisplayName,
} from "@/src/lib/domains/billing/plan-seat-tiles";
import { billingSettingsReturnUrl } from "@/src/lib/domains/billing/settings-path";
import { useBillingSettings } from "@/src/lib/domains/billing/use-billing-settings";
import {
	BILLING_SYNC_COPY,
	BillingChangePreviewDialog,
} from "../change-preview-dialog";
import { SubscriptionCheckoutForm } from "./checkout-form";
import { SubscriptionPaidControls } from "./paid-controls";

type BillingInterval = "monthly" | "yearly";
type OrgPlanId = "individual" | "teams" | "teams_pro";

export function BillingSection() {
	const { activeMembership } = useBillingSettings();
	const summary = useOrgBillingSummary();
	const billingContext = useWorkspaceBillingContext();
	const checkout = useCreateOrgCheckoutSession();
	const updateSeats = useUpdateOrgSeats();
	const changePlan = useChangeOrgPlan();
	const portal = useCreateOrgPortalSession();

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";

	const [planId, setPlanId] = useState<OrgPlanId>("teams");
	const [interval, setInterval] = useState<BillingInterval>("monthly");
	const [seatCount, setSeatCount] = useState(1);
	const [seatPreviewOpen, setSeatPreviewOpen] = useState(false);
	const [planPreviewOpen, setPlanPreviewOpen] = useState(false);
	const [pendingSeatCount, setPendingSeatCount] = useState(1);
	const [pendingPlanId, setPendingPlanId] = useState<"teams" | "teams_pro">(
		"teams",
	);
	const [awaitingSeatSync, setAwaitingSeatSync] = useState(false);
	const [awaitingPlanSync, setAwaitingPlanSync] = useState(false);
	const syncedSeatCountRef = useRef<number | undefined>(undefined);
	const seatPreview = usePreviewOrgSeatChange();
	const planPreview = usePreviewOrgPlanChange();

	const data = summary.data;
	const minSeats = Math.max(1, data?.usedSeats ?? 1);
	const committedSeats = Math.max(data?.seatCount ?? seatCount, minSeats);
	const isSolo = data?.planId === "individual";
	const isTeamsPaid = data?.planId === "teams" || data?.planId === "teams_pro";
	const hasPaidPlan = isSolo || isTeamsPaid;

	const pricePerSeat = useMemo(() => {
		return getPlanPrice(planId, interval);
	}, [planId, interval]);

	const totalPrice = useMemo(() => {
		return pricePerSeat * seatCount;
	}, [pricePerSeat, seatCount]);

	const totalYearlyPrice = useMemo(() => {
		return getPlanYearlyTotal(planId) * seatCount;
	}, [planId, seatCount]);

	const billingSyncPending = awaitingSeatSync || awaitingPlanSync;
	const seatControlsDisabled =
		updateSeats.isPending ||
		seatPreview.isPending ||
		seatPreviewOpen ||
		awaitingSeatSync;

	useEffect(() => {
		if (!data) return;
		if (awaitingSeatSync) {
			if (data.seatCount === pendingSeatCount) {
				setAwaitingSeatSync(false);
				syncedSeatCountRef.current = data.seatCount;
				setSeatCount(pendingSeatCount);
			}
			return;
		}
		const next = Math.max(data.seatCount, data.usedSeats);
		if (syncedSeatCountRef.current !== data.seatCount) {
			syncedSeatCountRef.current = data.seatCount;
			setSeatCount(next);
		}
	}, [
		data?.seatCount,
		data?.usedSeats,
		awaitingSeatSync,
		pendingSeatCount,
		data,
	]);

	useEffect(() => {
		if (!awaitingPlanSync || !data) return;
		if (data.planId === pendingPlanId) {
			setAwaitingPlanSync(false);
		}
	}, [awaitingPlanSync, data?.planId, pendingPlanId, data]);

	useEffect(() => {
		if (!billingSyncPending) return;
		const pollId = window.setInterval(() => {
			void summary.refetch();
		}, 5000);
		const timeoutId = window.setTimeout(() => {
			setAwaitingSeatSync(false);
			setAwaitingPlanSync(false);
		}, 180_000);
		return () => {
			window.clearInterval(pollId);
			window.clearTimeout(timeoutId);
		};
	}, [billingSyncPending, summary.refetch]);

	if (!canManage) return null;

	const returnUrl = billingSettingsReturnUrl(window.location.origin);

	const startCheckout = async () => {
		try {
			const checkoutSeats =
				planId === "individual" ? 1 : Math.max(seatCount, minSeats);
			const result = await checkout.mutateAsync({
				planId,
				interval,
				seatCount: checkoutSeats,
				returnUrl,
			});
			window.location.href = result.checkoutUrl;
		} catch {}
	};

	const openSeatPreview = async (next: number) => {
		const target = Math.max(next, minSeats);
		if (data && target === committedSeats) return;
		setPendingSeatCount(target);
		try {
			await seatPreview.mutateAsync(target);
			setSeatPreviewOpen(true);
		} catch {}
	};

	const confirmSeatChange = async () => {
		try {
			const result = await updateSeats.mutateAsync(pendingSeatCount);
			setSeatPreviewOpen(false);
			syncedSeatCountRef.current = result.seatCount;
			setSeatCount(result.seatCount);
			if (result.pendingPayment) {
				toast.error(
					"Payment did not go through. Update your payment method in Manage Subscription, then try again.",
				);
				return;
			}
			if (!result.changed) {
				toast.info(`This workspace is already on ${result.seatCount} seats.`);
				return;
			}
			setAwaitingSeatSync(true);
			toast.success(
				"Seat change submitted. Your dashboard should update within 1–2 minutes.",
			);
		} catch {}
	};

	const allowed = billingContext.data?.allowedActions;
	const alternatePlanId: "teams" | "teams_pro" | null =
		allowed?.alternateOrgPlanId ?? null;
	const canUpgradeSoloToTeams =
		isSolo && Boolean(allowed?.canChangeOrgPlan && data?.hasDodoSubscription);

	const openPlanPreview = async (targetPlanId: "teams" | "teams_pro") => {
		setPendingPlanId(targetPlanId);
		try {
			await planPreview.mutateAsync(targetPlanId);
			setPlanPreviewOpen(true);
		} catch {}
	};

	const confirmPlanChange = async () => {
		try {
			const result = await changePlan.mutateAsync(pendingPlanId);
			setPlanPreviewOpen(false);
			if (!result.changed) return;
			setAwaitingPlanSync(true);
			toast.success(
				"Plan change submitted. Your dashboard should update within 1–2 minutes.",
			);
		} catch {}
	};

	const openPortal = async () => {
		try {
			const result = await portal.mutateAsync();
			window.open(result.url, "_blank", "noopener,noreferrer");
		} catch {}
	};

	return (
		<SettingsSection
			icon={<CreditCardIcon className="size-4" aria-hidden="true" />}
			title="Subscription"
			description="Manage your subscription, renewal cycle, and seat count."
		>
			{summary.isLoading ? (
				<p className="text-sm text-muted-foreground">Loading billing…</p>
			) : data ? (
				<div className="space-y-6">
					{billingSyncPending ? (
						<SettingsSyncNotice
							title="Update in progress"
							body={BILLING_SYNC_COPY}
						/>
					) : null}

					{awaitingSeatSync ? (
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="flex min-h-[110px] flex-col justify-between rounded-xl border border-border bg-card p-4">
								<div>
									<span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
										Current Plan
									</span>
									<div className="mt-1 flex items-center gap-2">
										<span className="text-lg font-medium text-foreground">
											{planDisplayName(data.planId)}
										</span>
										<Badge variant="secondary">Active</Badge>
									</div>
								</div>
								{data.billingInterval && data.periodEnd ? (
									<p className="mt-3 text-xs text-muted-foreground">
										Billed{" "}
										{data.billingInterval === "yearly" ? "annually" : "monthly"}
										. Renews {new Date(data.periodEnd).toLocaleDateString()}.
									</p>
								) : null}
							</div>
							<div className="flex min-h-[110px] flex-col justify-between rounded-xl border border-border bg-card p-4">
								<div>
									<span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
										Seats Utilized
									</span>
									<p className="mt-1 text-lg font-medium text-foreground">
										Syncing…
									</p>
								</div>
							</div>
						</div>
					) : (
						<PlanSeatTiles
							planId={data.planId}
							usedSeats={data.usedSeats}
							seatCount={data.seatCount}
							billingInterval={data.billingInterval}
							periodEnd={data.periodEnd}
						/>
					)}

					{data.cancelAtPeriodEnd && data.periodEnd ? (
						<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
							Cancels at end of period (
							{new Date(data.periodEnd).toLocaleDateString()}). Paid features
							stay available until then.
						</div>
					) : null}

					{data.hasDodoSubscription ? (
						<SubscriptionPaidControls
							isTeamsPaid={isTeamsPaid}
							canUpgradeSoloToTeams={canUpgradeSoloToTeams}
							alternatePlanId={alternatePlanId}
							allowed={allowed}
							changePlanPending={changePlan.isPending}
							planPreviewPending={planPreview.isPending}
							openPlanPreview={openPlanPreview}
							minSeats={minSeats}
							committedSeats={committedSeats}
							seatCount={seatCount}
							setSeatCount={setSeatCount}
							seatControlsDisabled={seatControlsDisabled}
							awaitingSeatSync={awaitingSeatSync}
							openSeatPreview={openSeatPreview}
							portalPending={portal.isPending}
							openPortal={openPortal}
						/>
					) : (
						<SubscriptionCheckoutForm
							allowed={allowed}
							planId={planId}
							setPlanId={setPlanId}
							interval={interval}
							setInterval={setInterval}
							minSeats={minSeats}
							seatCount={seatCount}
							setSeatCount={setSeatCount}
							pricePerSeat={pricePerSeat}
							totalPrice={totalPrice}
							totalYearlyPrice={totalYearlyPrice}
							hasPaidPlan={hasPaidPlan}
							checkoutPending={checkout.isPending}
							startCheckout={startCheckout}
						/>
					)}
				</div>
			) : null}

			<BillingChangePreviewDialog
				open={seatPreviewOpen}
				onOpenChange={setSeatPreviewOpen}
				title="Confirm seat change"
				description={
					seatPreview.data
						? `Change from ${seatPreview.data.currentSeatCount} to ${seatPreview.data.seatCount} seats.`
						: "Preview unavailable"
				}
				preview={seatPreview}
				onConfirm={confirmSeatChange}
				isConfirming={updateSeats.isPending}
			/>
			<BillingChangePreviewDialog
				open={planPreviewOpen}
				onOpenChange={setPlanPreviewOpen}
				title="Confirm plan change"
				description={
					planPreview.data
						? `Switch from ${planDisplayName(planPreview.data.currentPlanId ?? data?.planId ?? "teams")} to ${planDisplayName(planPreview.data.planId ?? pendingPlanId)}.`
						: "Preview unavailable"
				}
				preview={planPreview}
				onConfirm={confirmPlanChange}
				isConfirming={changePlan.isPending}
			/>
		</SettingsSection>
	);
}
