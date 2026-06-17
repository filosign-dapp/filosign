import type { UpgradePlanLimitReason } from "@filosign/react/billing";
import { Button } from "@/src/lib/components/ui/button";
import { PLAN_LIMIT_COPY } from "@/src/lib/domains/entitlements/plan-limit-copy";
import { useEntitlementUpgrade } from "@/src/lib/domains/entitlements/use-entitlement-upgrade";

type Props = {
	reason: UpgradePlanLimitReason;
	title?: string;
	description?: string;
	className?: string;
};

export function PlanFeatureTeaser({
	reason,
	title,
	description,
	className,
}: Props) {
	const { promptPlanUpgrade } = useEntitlementUpgrade();
	const copy = PLAN_LIMIT_COPY[reason];
	const displayTitle = title ?? copy.title;
	const displayDescription = description ?? copy.description;

	return (
		<p className={className ?? "text-sm text-muted-foreground"}>
			<span className="font-medium text-foreground">{displayTitle}</span>
			{": "}
			{displayDescription}{" "}
			<Button
				type="button"
				variant="link"
				className="h-auto p-0 text-sm font-medium"
				onClick={() => promptPlanUpgrade(reason)}
			>
				Upgrade
			</Button>
		</p>
	);
}
