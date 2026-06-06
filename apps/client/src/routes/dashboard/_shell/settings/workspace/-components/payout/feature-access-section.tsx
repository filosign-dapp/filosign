import { useEntitlements } from "@filosign/react/billing";
import { CurrencyCircleDollarIcon } from "@phosphor-icons/react";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { usePayoutFeatureAccess } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/hooks/use-payout-feature-access";
import { WorkspaceSection } from "../workspace-section";
import { PayoutAccessStatusContent } from "./status";

export function PayoutFeatureAccessSection() {
	const { data: entitlements } = useEntitlements();
	const { activeOrgId, activeMembership } = useWorkspaceSettings();

	const isPaidPlan =
		entitlements?.planId !== undefined && entitlements.planId !== "free";

	const canManage =
		activeMembership?.role === "owner" || activeMembership?.role === "admin";

	const {
		accessQuery,
		status,
		termsCurrent,
		reviewNote,
		useCase,
		setUseCase,
		acceptTerms,
		setAcceptTerms,
		sanctionsSelfCert,
		setSanctionsSelfCert,
		canSubmitRequest,
		submitAccessRequest,
		submitPending,
	} = usePayoutFeatureAccess({
		activeOrgId: activeOrgId ?? undefined,
		canManage,
	});

	if (!activeOrgId || !isPaidPlan) return null;

	return (
		<WorkspaceSection
			icon={<CurrencyCircleDollarIcon className="size-4" aria-hidden="true" />}
			title="Payout attachment access"
			description="Optional USDC payout instructions on documents. Available on paid plans after Filosign review."
		>
			<DocsLink href={DOCS_LINKS.payoutAccess()} className="mb-4">
				Payout access guide
			</DocsLink>
			{accessQuery.isPending ? (
				<p className="text-sm text-muted-foreground">Loading access status…</p>
			) : (
				<PayoutAccessStatusContent
					status={status}
					termsCurrent={termsCurrent}
					reviewNote={reviewNote}
					canManage={canManage}
					requestForm={{
						useCase,
						onUseCaseChange: setUseCase,
						acceptTerms,
						onAcceptTermsChange: setAcceptTerms,
						sanctionsSelfCert,
						onSanctionsSelfCertChange: setSanctionsSelfCert,
						canSubmit: canSubmitRequest,
						pending: submitPending,
						onSubmit: submitAccessRequest,
					}}
				/>
			)}
		</WorkspaceSection>
	);
}
