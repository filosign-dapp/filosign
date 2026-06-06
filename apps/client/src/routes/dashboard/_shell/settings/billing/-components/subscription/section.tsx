import { CreditCardIcon } from "@phosphor-icons/react";
import { SettingsSection } from "@/src/lib/components/settings/section";
import { BillingChangePreviewDialog } from "../change-preview-dialog";
import { SubscriptionSectionBody } from "./section-body";
import { useSubscriptionSection } from "./use-subscription-section";

export function BillingSection() {
	const state = useSubscriptionSection();
	if (!state.canManage) return null;

	return (
		<SettingsSection
			icon={<CreditCardIcon className="size-4" aria-hidden="true" />}
			title="Subscription"
			description="Manage your subscription, renewal cycle, and seat count."
		>
			{state.summary.isLoading ? (
				<p className="text-sm text-muted-foreground">Loading billing…</p>
			) : (
				<SubscriptionSectionBody state={state} />
			)}

			<BillingChangePreviewDialog
				open={state.seatPreviewOpen}
				onOpenChange={state.setSeatPreviewOpen}
				title="Confirm seat change"
				description={
					state.seatPreview.data
						? `Change from ${state.seatPreview.data.currentSeatCount} to ${state.seatPreview.data.seatCount} seats.`
						: "Preview unavailable"
				}
				preview={state.seatPreview}
				onConfirm={state.confirmSeatChange}
				isConfirming={state.updateSeats.isPending}
			/>
			<BillingChangePreviewDialog
				open={state.planPreviewOpen}
				onOpenChange={state.setPlanPreviewOpen}
				title="Confirm plan change"
				description={
					state.planPreview.data
						? `Switch from ${state.planDisplayName(state.planPreview.data.currentPlanId ?? state.data?.planId ?? "teams")} to ${state.planDisplayName(state.planPreview.data.planId ?? state.pendingPlanId)}.`
						: "Preview unavailable"
				}
				preview={state.planPreview}
				onConfirm={state.confirmPlanChange}
				isConfirming={state.changePlan.isPending}
			/>
		</SettingsSection>
	);
}
