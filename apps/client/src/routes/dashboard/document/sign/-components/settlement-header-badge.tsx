import type { SettlementRuleRow } from "@filosign/react/files";
import { settlementHeaderSummary } from "@filosign/shared";
import { CheckCircleIcon, ClockIcon, WarningIcon } from "@phosphor-icons/react";
import { Badge } from "@/src/lib/components/ui/badge";

type Props = {
	rules: SettlementRuleRow[];
};

export function SettlementHeaderBadge({ rules }: Props) {
	const summary = settlementHeaderSummary(rules);
	if (summary === "none") return null;

	if (summary === "all_paid") {
		return (
			<Badge
				variant="secondary"
				className="gap-1.5 border-border bg-secondary/90 text-secondary-foreground shadow-none"
			>
				<CheckCircleIcon className="size-3.5 text-secondary" weight="fill" />
				All payouts sent
			</Badge>
		);
	}

	if (summary === "failed") {
		return (
			<Badge variant="destructive" className="gap-1.5 shadow-none">
				<WarningIcon className="size-3.5" weight="fill" />
				Payout problem
			</Badge>
		);
	}

	return (
		<Badge
			variant="secondary"
			className="gap-1.5 border-border bg-secondary/90 text-secondary-foreground shadow-none"
		>
			<ClockIcon className="size-3.5 text-muted-foreground" />
			Payout waiting
		</Badge>
	);
}
