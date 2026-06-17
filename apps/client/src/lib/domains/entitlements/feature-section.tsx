import type { UpgradePlanLimitReason } from "@filosign/react/billing";
import type { ReactNode } from "react";
import { PlanFeatureTeaser } from "@/src/lib/domains/entitlements/plan-feature-teaser";
import { resolveFeatureAccess } from "@/src/lib/domains/entitlements/resolve-feature-access";

type Props = {
	reason: UpgradePlanLimitReason;
	enabled: boolean;
	hidden?: boolean;
	title?: string;
	teaserDescription?: string;
	sectionClassName?: string;
	children: ReactNode;
};

export function EntitlementFeatureSection({
	reason,
	enabled,
	hidden,
	title,
	teaserDescription,
	sectionClassName,
	children,
}: Props) {
	const access = resolveFeatureAccess({ enabled, hidden });

	if (access === "hidden") return null;

	if (access === "teaser") {
		return (
			<PlanFeatureTeaser
				reason={reason}
				title={title}
				description={teaserDescription}
			/>
		);
	}

	return (
		<section className={sectionClassName ?? "space-y-3"}>{children}</section>
	);
}
