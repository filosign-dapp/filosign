import env from "@/src/env";
import { SettingsSyncNotice } from "@/src/lib/components/settings/section";
import { Badge } from "@/src/lib/components/ui/badge";
import {
	PlanSeatTiles,
	planDisplayName,
} from "@/src/lib/domains/billing/plan-seat-tiles";
import { BILLING_SYNC_COPY } from "../change-preview-dialog";
import { SubscriptionCheckoutForm } from "./checkout-form";
import { SubscriptionPaidControls } from "./paid-controls";
import type { useSubscriptionSection } from "./use-section";

type SectionState = ReturnType<typeof useSubscriptionSection>;

const pricingHref = `${env.VITE_ASTRO_URL.replace(/\/$/, "")}/pricing`;

export function SubscriptionSectionBody({ state }: { state: SectionState }) {
	const { data } = state;
	if (!data) return null;

	return (
		<div className="space-y-6">
			{state.billingSyncPending ? (
				<SettingsSyncNotice
					title="Update in progress"
					body={BILLING_SYNC_COPY}
				/>
			) : null}

			{state.awaitingSeatSync ? (
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
								{data.billingInterval === "yearly" ? "annually" : "monthly"}.
								Renews {new Date(data.periodEnd).toLocaleDateString()}.
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
					{new Date(data.periodEnd).toLocaleDateString()}
					). Paid features stay available until then.
				</div>
			) : null}

			{data.hasDodoSubscription ? (
				<SubscriptionPaidControls
					isTeamsPaid={state.isTeamsPaid}
					canUpgradeSoloToTeams={state.canUpgradeSoloToTeams}
					alternatePlanId={state.alternatePlanId}
					allowed={state.allowed}
					changePlanPending={state.changePlan.isPending}
					planPreviewPending={state.planPreview.isPending}
					openPlanPreview={state.openPlanPreview}
					minSeats={state.minSeats}
					committedSeats={state.committedSeats}
					seatCount={state.seatCount}
					setSeatCount={state.setSeatCount}
					seatControlsDisabled={state.seatControlsDisabled}
					awaitingSeatSync={state.awaitingSeatSync}
					openSeatPreview={state.openSeatPreview}
					portalPending={state.portal.isPending}
					openPortal={state.openPortal}
				/>
			) : state.publicCheckoutEnabled ? (
				<SubscriptionCheckoutForm
					allowed={state.allowed}
					planId={state.planId}
					setPlanId={state.setPlanId}
					interval={state.interval}
					setInterval={state.setInterval}
					minSeats={state.minSeats}
					seatCount={state.seatCount}
					setSeatCount={state.setSeatCount}
					pricePerSeat={state.pricePerSeat}
					totalPrice={state.totalPrice}
					totalYearlyPrice={state.totalYearlyPrice}
					hasPaidPlan={state.hasPaidPlan}
					checkoutPending={state.checkout.isPending}
					startCheckout={state.startCheckout}
				/>
			) : (
				<div className="space-y-3 border-t border-border/60 pt-6 text-sm text-muted-foreground">
					<p>
						Self-serve checkout is not open yet. Request access and we will
						follow up with an invite link.
					</p>
					<a
						href={pricingHref}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex font-medium text-foreground underline-offset-4 hover:underline"
					>
						Request access on pricing
					</a>
				</div>
			)}
		</div>
	);
}
