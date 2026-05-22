import type { SettlementRuleRow } from "@filosign/react/files";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils";

type Props = {
	rules: SettlementRuleRow[];
	isSender: boolean;
	revokePending: boolean;
	settlePending?: boolean;
	onRevokeAllowance: () => void;
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
	const canRevoke =
		isSender && rules.some((rule) => rule.status !== "executed");
	if (!canRevoke) return null;

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className={cn("text-xs", className)}
			disabled={revokePending || settlePending}
			onClick={onRevokeAllowance}
		>
			{revokePending ? "Revoking approval…" : "Revoke payout approval"}
		</Button>
	);
}
