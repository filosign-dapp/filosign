import { WorkspaceSyncNotice } from "../workspace-section";
import { PayoutAccessRequestForm } from "./request-form";

type RequestFormProps = {
	useCase: string;
	onUseCaseChange: (v: string) => void;
	acceptTerms: boolean;
	onAcceptTermsChange: (v: boolean) => void;
	sanctionsSelfCert: boolean;
	onSanctionsSelfCertChange: (v: boolean) => void;
	canSubmit: boolean;
	pending: boolean;
	onSubmit: () => void;
};

type Props = {
	status: string | undefined;
	termsCurrent: boolean;
	reviewNote: string | null | undefined;
	canManage: boolean;
	requestForm: RequestFormProps;
};

export function PayoutAccessStatusContent({
	status,
	termsCurrent,
	reviewNote,
	canManage,
	requestForm,
}: Props) {
	if (status === "approved" && termsCurrent) {
		return (
			<p className="text-sm text-muted-foreground">
				Active for this workspace. You can attach payout rules on envelopes now.
			</p>
		);
	}

	if (status === "approved" && !termsCurrent) {
		return (
			<WorkspaceSyncNotice
				title="Addendum updated"
				body="Settlement terms were updated. Submit a new access request and accept the current addendum."
			/>
		);
	}

	if (status === "pending") {
		return (
			<WorkspaceSyncNotice
				title="Pending review"
				body="Filosign is reviewing your payout attachment request. You cannot attach payouts until approved."
			/>
		);
	}

	if (status === "rejected") {
		return (
			<div className="space-y-3">
				<p className="text-sm text-destructive">
					Your payout attachment request was not approved.
					{reviewNote ? ` Note: ${reviewNote}` : ""}
				</p>
				{canManage ? <PayoutAccessRequestForm {...requestForm} /> : null}
			</div>
		);
	}

	if (canManage) {
		return <PayoutAccessRequestForm {...requestForm} />;
	}

	return (
		<p className="text-sm text-muted-foreground">
			Only workspace owners and admins can request payout attachment access.
		</p>
	);
}
