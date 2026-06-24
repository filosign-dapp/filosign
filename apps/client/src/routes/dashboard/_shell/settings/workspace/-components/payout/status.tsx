import { Button } from "@/src/lib/components/ui/button";
import { WorkspaceSyncNotice } from "../workspace-section";

type Props = {
	status: string | undefined;
	termsCurrent: boolean;
	reviewNote: string | null | undefined;
	canManage: boolean;
	onRequestAccess: () => void;
};

function RequestAccessButton(props: { onClick: () => void }) {
	return (
		<Button type="button" variant="primary" onClick={props.onClick}>
			Request access
		</Button>
	);
}

export function PayoutAccessStatusContent({
	status,
	termsCurrent,
	reviewNote,
	canManage,
	onRequestAccess,
}: Props) {
	if (status === "approved" && termsCurrent) {
		return (
			<div className="space-y-2">
				<p className="text-sm bg-secondary p-4 rounded-sm text-black">
					Active for this workspace. You can attach payout rules on new
					envelopes.
				</p>
			</div>
		);
	}

	if (status === "approved" && !termsCurrent) {
		return (
			<div className="space-y-4">
				<WorkspaceSyncNotice
					title="Addendum updated"
					body="Settlement terms were updated. Submit a new access request and accept the current addendum."
				/>
				{canManage ? <RequestAccessButton onClick={onRequestAccess} /> : null}
			</div>
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
			<div className="space-y-4">
				<p className="text-sm text-destructive">
					Your payout attachment request was not approved.
					{reviewNote ? ` Note: ${reviewNote}` : ""}
				</p>
				{canManage ? <RequestAccessButton onClick={onRequestAccess} /> : null}
			</div>
		);
	}

	if (canManage) {
		return (
			<div className="space-y-4">
				<p className="text-sm text-muted-foreground">
					Request access to attach optional USDC payout instructions on
					documents. Filosign reviews each workspace before payouts can be used.
				</p>
				<RequestAccessButton onClick={onRequestAccess} />
			</div>
		);
	}

	return (
		<p className="text-sm text-muted-foreground">
			Only workspace owners and admins can request payout attachment access.
		</p>
	);
}
