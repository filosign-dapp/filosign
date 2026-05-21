import type { PaymentRuleRow } from "@filosign/react/files";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils";

type Props = {
	rules: PaymentRuleRow[];
	isSender: boolean;
	revokePending: boolean;
	retryPending?: boolean;
	onRevokeAllowance: () => void;
	className?: string;
};

export function PaymentRevokeAllowanceButton({
	rules,
	isSender,
	revokePending,
	retryPending = false,
	onRevokeAllowance,
	className,
}: Props) {
	const canRevoke =
		isSender && rules.some((rule) => rule.status !== "executed");
	if (!canRevoke) return null;

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className={cn("text-xs", className)}
			disabled={revokePending || retryPending}
			onClick={onRevokeAllowance}
		>
			{revokePending ? "Revoking approval…" : "Revoke payout approval"}
		</Button>
	);
}
