import type {
	EntitlementsSnapshot,
	UpgradePlanLimitReason,
} from "@filosign/react/billing";
import { useEntitlements } from "@filosign/react/billing";
import {
	canUseAdvancedRouting,
	canUseBasicSettlements,
	canUseSupplementaryAttachments,
} from "@filosign/react/files";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";
import {
	COMPOSE_SECTION_DELAYS,
	composeSectionMotion,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/compose-section-motion";

function composeUpgradeReason(
	entitlements: EntitlementsSnapshot,
): UpgradePlanLimitReason | null {
	if (!canUseBasicSettlements(entitlements)) {
		return "features.settlement.basic";
	}
	if (!canUseSupplementaryAttachments(entitlements)) {
		return "features.supplementary_attachments";
	}
	if (!canUseAdvancedRouting(entitlements)) {
		return "features.routing.advanced";
	}
	return null;
}

function composeUpgradeCopy(reason: UpgradePlanLimitReason): {
	title: string;
	body: string;
	cta: string;
} {
	switch (reason) {
		case "features.settlement.basic":
			return {
				title: "More on higher plans:",
				body: "Upgrade to attach payments and extra documents to this envelope. Both go out when signing is complete.",
				cta: "See plans",
			};
		case "features.supplementary_attachments":
			return {
				title: "More on higher plans:",
				body: "Upgrade to attach extra documents recipients can open after signing.",
				cta: "Upgrade",
			};
		case "features.routing.advanced":
			return {
				title: "More on higher plans:",
				body: "Choose who signs first and how many signatures you need before payments or files go out.",
				cta: "Upgrade to Teams Pro",
			};
		default:
			return {
				title: "More on higher plans:",
				body: "Add payments, extra files, and signing rules when your plan includes them.",
				cta: "Upgrade",
			};
	}
}

export function ComposeUpgradeFeaturesHint() {
	const { data: entitlements, isPending } = useEntitlements();
	const promptPlanUpgrade = usePromptPlanUpgrade();

	if (isPending || !entitlements) return null;

	const reason = composeUpgradeReason(entitlements);
	if (!reason) return null;

	const copy = composeUpgradeCopy(reason);

	return (
		<motion.section
			className="rounded-xl border border-border/60 bg-muted/5 p-4"
			{...composeSectionMotion(COMPOSE_SECTION_DELAYS.upgradeHint)}
		>
			<p className="text-sm text-muted-foreground">
				<span className="font-medium text-foreground">{copy.title}</span>{" "}
				{copy.body}{" "}
				<Button
					type="button"
					variant="link"
					className="h-auto p-0 text-sm font-medium"
					onClick={() => promptPlanUpgrade(reason)}
				>
					{copy.cta}
				</Button>
			</p>
		</motion.section>
	);
}
