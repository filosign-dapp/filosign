import type { PaymentRuleRow } from "@filosign/react/files";
import { paymentHeaderSummary } from "@filosign/shared";
import { CheckCircleIcon, ClockIcon, WarningIcon } from "@phosphor-icons/react";
import { Badge } from "@/src/lib/components/ui/badge";

type Props = {
	rules: PaymentRuleRow[];
};

export function PaymentHeaderBadge({ rules }: Props) {
	const summary = paymentHeaderSummary(rules);
	if (summary === "none") return null;

	if (summary === "all_paid") {
		return (
			<Badge
				variant="secondary"
				className="gap-1.5 border-border bg-secondary/90 text-secondary-foreground shadow-none"
			>
				<CheckCircleIcon className="size-3.5 text-chart-2" weight="fill" />
				Payments complete
			</Badge>
		);
	}

	if (summary === "failed") {
		return (
			<Badge variant="destructive" className="gap-1.5 shadow-none">
				<WarningIcon className="size-3.5" weight="fill" />
				Payment issue
			</Badge>
		);
	}

	return (
		<Badge
			variant="secondary"
			className="gap-1.5 border-border bg-secondary/90 text-secondary-foreground shadow-none"
		>
			<ClockIcon className="size-3.5 text-muted-foreground" />
			Payment pending
		</Badge>
	);
}
