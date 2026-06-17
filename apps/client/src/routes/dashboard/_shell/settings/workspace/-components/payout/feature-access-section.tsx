import { useEntitlements } from "@filosign/react/billing";
import { CurrencyCircleDollarIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import { UpgradePlanDialog } from "@/src/lib/domains/entitlements/upgrade-plan-dialog";
import {
	PayoutAccessRequestDialog,
	payoutAccessRequestDialogProps,
	usePayoutFeatureAccess,
} from "@/src/lib/domains/settlements";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { WorkspaceSection } from "../workspace-section";
import { PayoutAccessStatusContent } from "./status";

export function PayoutFeatureAccessSection() {
	const { data: entitlements } = useEntitlements();
	const { activeOrgId, activeMembership } = useWorkspaceSettings();
	const [requestDialogOpen, setRequestDialogOpen] = useState(false);
	const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

	const isPaidPlan =
		entitlements?.planId !== undefined && entitlements.planId !== "free";

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";

	const payoutAccess = usePayoutFeatureAccess({
		activeOrgId: activeOrgId ?? undefined,
		canManage,
		onSubmitted: () => setRequestDialogOpen(false),
	});

	const { accessQuery, status, termsCurrent, reviewNote } = payoutAccess;

	if (!activeOrgId) return null;

	return (
		<>
			<WorkspaceSection
				icon={
					<CurrencyCircleDollarIcon className="size-4" aria-hidden="true" />
				}
				title={
					<span className="inline-flex items-center gap-2">
						Payout attachment access
						<ProFeatureMark size="xs" />
					</span>
				}
				description="Optional USDC payout instructions on documents. Available on paid plans after Filosign review."
			>
				<DocsLink href={DOCS_LINKS.payoutAccess()} className="mb-4">
					Payout access guide
				</DocsLink>
				{!isPaidPlan ? (
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Payout attachment requires a paid plan. Upgrade to Solo or higher
							to request payout access.
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={() => setUpgradeDialogOpen(true)}
							className="gap-1.5"
						>
							Upgrade plan
							<ProFeatureMark size="xs" />
						</Button>
					</div>
				) : accessQuery.isPending ? (
					<p className="text-sm text-muted-foreground">
						Loading access status…
					</p>
				) : (
					<PayoutAccessStatusContent
						status={status}
						termsCurrent={termsCurrent}
						reviewNote={reviewNote}
						canManage={canManage}
						onRequestAccess={() => setRequestDialogOpen(true)}
					/>
				)}
			</WorkspaceSection>

			<UpgradePlanDialog
				open={upgradeDialogOpen}
				onOpenChange={setUpgradeDialogOpen}
				reason="features.settlement.basic"
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
