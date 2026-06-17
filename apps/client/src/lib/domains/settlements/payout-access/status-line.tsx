import type { BasicPayoutGate } from "@filosign/react/files";
import { Button } from "@/src/lib/components/ui/button";
import { TOASTS } from "@/src/lib/copy/toasts";
import { payoutAccessRequestIntent } from "@/src/lib/domains/settlements/payout-access/intent";

type Props = {
	gate: BasicPayoutGate;
	canManage: boolean;
	onRequestAccess: () => void;
};

function payoutAccessStatusCopy(gate: BasicPayoutGate): string | null {
	if (gate.allowed) return null;
	switch (gate.reason) {
		case "free_plan":
			return null;
		case "access_pending":
			return TOASTS.payouts.accessPending.hint;
		case "access_rejected":
			return TOASTS.payouts.accessRejected.hint;
		case "terms_outdated":
			return TOASTS.payouts.termsOutdated.hint;
		case "access_none":
			return TOASTS.payouts.accessNone.hint;
		default:
			return TOASTS.payouts.accessRequired.hint;
	}
}

export function PayoutAccessStatusLine({
	gate,
	canManage,
	onRequestAccess,
}: Props) {
	const copy = payoutAccessStatusCopy(gate);
	if (!copy) return null;

	const canRequest =
		!gate.allowed &&
		(gate.reason === "access_none" ||
			gate.reason === "terms_outdated" ||
			gate.reason === "access_rejected");
	const intent = payoutAccessRequestIntent(canManage);

	return (
		<p className="text-sm text-muted-foreground">
			<span className="font-medium text-foreground">Attached payouts</span>
			{": "}
			{copy}{" "}
			{canRequest && intent === "open" ? (
				<Button
					type="button"
					variant="link"
					className="h-auto p-0 text-sm font-medium"
					onClick={onRequestAccess}
				>
					Request access
				</Button>
			) : null}
		</p>
	);
}
