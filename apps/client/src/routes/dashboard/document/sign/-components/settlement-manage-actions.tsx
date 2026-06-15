import type { SettlementRuleRow } from "@filosign/react/files";
import { useState } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Button } from "@/src/lib/components/ui/button";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";

type Props = {
	rule: SettlementRuleRow;
	onCancel: () => void | Promise<void>;
	onUpdate: () => void;
	cancelPending?: boolean;
	updatePending?: boolean;
};

export function SettlementManageActions({
	onCancel,
	onUpdate,
	cancelPending,
	updatePending,
}: Props) {
	const [confirmOpen, setConfirmOpen] = useState(false);

	return (
		<>
			<div className="flex flex-wrap gap-2 mt-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-7 gap-1.5 text-xs"
					disabled={updatePending || cancelPending}
					onClick={onUpdate}
				>
					{updatePending ? "Updating…" : "Change amounts"}
					<ProFeatureMark size="xs" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 text-xs text-destructive"
					disabled={cancelPending || updatePending}
					onClick={() => setConfirmOpen(true)}
				>
					{cancelPending ? "Removing…" : "Remove payout"}
					<ProFeatureMark size="xs" />
				</Button>
			</div>
			<ConfirmAlertDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Remove this payout?"
				description="This removes the payout rule on-chain and lowers your USDC approval to match any remaining payouts."
				confirmLabel="Remove payout"
				destructive
				pending={cancelPending}
				onConfirm={() => onCancel()}
			/>
		</>
	);
}
