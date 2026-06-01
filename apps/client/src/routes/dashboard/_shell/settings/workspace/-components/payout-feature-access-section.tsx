import { SETTLEMENT_FEATURE_TERMS_VERSION } from "@filosign/shared";
import { CurrencyCircleDollarIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { Checkbox } from "@/src/lib/components/ui/checkbox";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { useWorkspaceSettings } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/context/context";
import { usePayoutFeatureAccess } from "@/src/routes/dashboard/_shell/settings/workspace/-lib/hooks/use-payout-feature-access";
import { WorkspaceSection, WorkspaceSyncNotice } from "./workspace-section";

const ADDENDUM_PATH = "/legal/settlement-feature-addendum";

export function PayoutFeatureAccessSection() {
	const { activeOrgId, activeMembership } = useWorkspaceSettings();

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

	if (!activeOrgId) return null;

	return (
		<WorkspaceSection
			icon={<CurrencyCircleDollarIcon className="size-4" aria-hidden="true" />}
			title="Payout attachment access"
			description="Optional USDC payout instructions on documents."
		>
			{accessQuery.isPending ? (
				<p className="text-sm text-muted-foreground">Loading access status…</p>
			) : status === "approved" && termsCurrent ? (
				<p className="text-sm text-muted-foreground">
					Active for this workspace. You can attach payout rules on envelopes
					now.
				</p>
			) : status === "approved" && !termsCurrent ? (
				<WorkspaceSyncNotice
					title="Addendum updated"
					body="Settlement terms were updated. Submit a new access request and accept the current addendum."
				/>
			) : status === "pending" ? (
				<WorkspaceSyncNotice
					title="Pending review"
					body="Filosign is reviewing your payout attachment request. You cannot attach payouts until approved."
				/>
			) : status === "rejected" ? (
				<div className="space-y-3">
					<p className="text-sm text-destructive">
						Your payout attachment request was not approved.
						{reviewNote ? ` Note: ${reviewNote}` : ""}
					</p>
					{canManage ? (
						<RequestForm
							useCase={useCase}
							onUseCaseChange={setUseCase}
							acceptTerms={acceptTerms}
							onAcceptTermsChange={setAcceptTerms}
							sanctionsSelfCert={sanctionsSelfCert}
							onSanctionsSelfCertChange={setSanctionsSelfCert}
							canSubmit={canSubmitRequest}
							pending={submitPending}
							onSubmit={submitAccessRequest}
						/>
					) : null}
				</div>
			) : canManage ? (
				<RequestForm
					useCase={useCase}
					onUseCaseChange={setUseCase}
					acceptTerms={acceptTerms}
					onAcceptTermsChange={setAcceptTerms}
					sanctionsSelfCert={sanctionsSelfCert}
					onSanctionsSelfCertChange={setSanctionsSelfCert}
					canSubmit={canSubmitRequest}
					pending={submitPending}
					onSubmit={submitAccessRequest}
				/>
			) : (
				<p className="text-sm text-muted-foreground">
					Only workspace owners and admins can request payout attachment access.
				</p>
			)}
		</WorkspaceSection>
	);
}

function RequestForm(props: {
	useCase: string;
	onUseCaseChange: (v: string) => void;
	acceptTerms: boolean;
	onAcceptTermsChange: (v: boolean) => void;
	sanctionsSelfCert: boolean;
	onSanctionsSelfCertChange: (v: boolean) => void;
	canSubmit: boolean;
	pending: boolean;
	onSubmit: () => void;
}) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="payout-use-case">Stated use case</Label>
				<Textarea
					id="payout-use-case"
					placeholder="e.g. USDC completion bonus on freelance SOWs sent to known counterparties…"
					value={props.useCase}
					onChange={(e) => props.onUseCaseChange(e.target.value)}
					rows={3}
				/>
			</div>
			<div className="flex items-start gap-2">
				<Checkbox
					id="payout-accept-terms"
					checked={props.acceptTerms}
					onCheckedChange={(v) => props.onAcceptTermsChange(v === true)}
				/>
				<Label
					htmlFor="payout-accept-terms"
					className="text-sm font-normal leading-snug"
				>
					I accept the{" "}
					<a
						href={ADDENDUM_PATH}
						target="_blank"
						rel="noopener noreferrer"
						className="underline"
					>
						Settlement Feature Addendum
					</a>{" "}
					(version {SETTLEMENT_FEATURE_TERMS_VERSION}) on behalf of this
					workspace.
				</Label>
			</div>
			<div className="flex items-start gap-2">
				<Checkbox
					id="payout-sanctions"
					checked={props.sanctionsSelfCert}
					onCheckedChange={(v) => props.onSanctionsSelfCertChange(v === true)}
				/>
				<Label
					htmlFor="payout-sanctions"
					className="text-sm font-normal leading-snug"
				>
					We will use payout attachment only in compliance with applicable
					sanctions, export, and anti–money laundering laws.
				</Label>
			</div>
			<Button
				type="button"
				variant="primary"
				disabled={!props.canSubmit || props.pending}
				onClick={props.onSubmit}
			>
				{props.pending ? "Submitting…" : "Request payout attachment access"}
			</Button>
		</div>
	);
}
