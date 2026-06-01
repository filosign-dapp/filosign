import type { SettlementRuleRow } from "@filosign/react/files";
import { useState } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils";

type Props = {
	rules: SettlementRuleRow[];
	isSender: boolean;
	revokePending: boolean;
	settlePending?: boolean;
	onRevokeAllowance: () => void | Promise<void>;
	className?: string;
};

export function SettlementRevokeAllowanceButton({
	rules,
	isSender,
	revokePending,
	settlePending = false,
	onRevokeAllowance,
	className,
}: Props) {
	const [open, setOpen] = useState(false);
	const canRevoke =
		isSender && rules.some((rule) => rule.status !== "executed");
	if (!canRevoke) return null;

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className={cn("text-xs", className)}
				disabled={revokePending || settlePending}
				onClick={() => setOpen(true)}
			>
				{revokePending ? "Revoking approval…" : "Revoke payout approval"}
			</Button>
			<ConfirmAlertDialog
				open={open}
				onOpenChange={setOpen}
				title="Revoke payout approval?"
				description="People can still sign, but no attached payouts can go out until you approve USDC in your wallet again."
				confirmLabel="Revoke"
				destructive
				pending={revokePending}
				onConfirm={() => onRevokeAllowance()}
			/>
		</>
	);
}
