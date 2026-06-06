import { useEntitlements, useOrgBillingSummary } from "@filosign/react/billing";
import { Link } from "@tanstack/react-router";
import { Button } from "@/src/lib/components/ui/button";
import { PlanSeatTiles } from "@/src/lib/domains/billing/plan-seat-tiles";
import { BILLING_SETTINGS_PATH } from "@/src/lib/domains/billing/settings-path";

type WorkspacePlanSummaryProps = {
	canManageBilling: boolean;
};

function WorkspacePlanSummaryAdmin() {
	const billingSummary = useOrgBillingSummary();
	const entitlements = useEntitlements();

	if (billingSummary.isLoading) {
		return (
			<p className="text-sm text-muted-foreground">Loading plan details…</p>
		);
	}

	const billingData = billingSummary.data;
	const planId = billingData?.planId ?? entitlements.data?.planId ?? "free";
	const planName = billingData?.planName ?? entitlements.data?.planName;

	return (
		<div className="space-y-4">
			<PlanSeatTiles
				planId={planId}
				planName={planName}
				usedSeats={billingData?.usedSeats}
				seatCount={billingData?.seatCount}
				billingInterval={billingData?.billingInterval ?? null}
				periodEnd={billingData?.periodEnd ?? null}
			/>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="touch-manipulation"
				render={<Link to={BILLING_SETTINGS_PATH} />}
			>
				Manage billing
			</Button>
		</div>
	);
}

function WorkspacePlanSummaryMember() {
	const entitlements = useEntitlements();

	if (entitlements.isLoading) {
		return (
			<p className="text-sm text-muted-foreground">Loading plan details…</p>
		);
	}

	const planId = entitlements.data?.planId ?? "free";
	const planName = entitlements.data?.planName;

	return (
		<PlanSeatTiles planId={planId} planName={planName} showSeatBar={false} />
	);
}

export function WorkspacePlanSummary({
	canManageBilling,
}: WorkspacePlanSummaryProps) {
	if (canManageBilling) {
		return <WorkspacePlanSummaryAdmin />;
	}
	return <WorkspacePlanSummaryMember />;
}
