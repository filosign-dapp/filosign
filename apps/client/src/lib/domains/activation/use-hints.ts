import { useActivationProgress } from "@filosign/react/users";
import {
	type ActivationHintId,
	type ActivationMilestoneId,
	evaluateActivationHints,
} from "@filosign/shared";
import { useMemo } from "react";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { resolveActivationHintHref } from "./resolve-step-href";
import { useActivationAnalyticsBase } from "./use-activation-analytics-base";

export type UseActivationHintsArgs = {
	pathname: string;
	currentPieceCid?: string | null;
};

export function useActivationHints(args: UseActivationHintsArgs) {
	const { activationQuery, entitlementsQuery, evaluated } =
		useActivationProgress();
	const dismissedHintIds = useStorePersist(
		(s) => s.activationUi.dismissedHintIds,
	);
	const setActivationUi = useStorePersist((s) => s.setActivationUi);

	const hints = useMemo(() => {
		const activation = activationQuery.data;
		if (!activation || !evaluated) return [];

		const billingPlanId = entitlementsQuery.data?.planId ?? ("free" as const);
		const milestones = new Set<ActivationMilestoneId>(activation.milestones);
		const dismissed = new Set(dismissedHintIds);

		return evaluateActivationHints({
			pathname: args.pathname,
			deployment: activation.deployment,
			billingPlanId,
			milestones,
			dismissedHintIds: dismissed,
			practicePieceCid: activation.practicePieceCid,
			currentPieceCid: args.currentPieceCid,
			coreComplete: evaluated.coreComplete,
		}).map((hint) => ({
			...hint,
			resolvedHref: resolveActivationHintHref(hint),
		}));
	}, [
		activationQuery.data,
		args.currentPieceCid,
		args.pathname,
		dismissedHintIds,
		entitlementsQuery.data?.planId,
		evaluated,
	]);

	const {
		analyticsBase,
		analyticsForStep,
		analyticsForHint,
		analyticsForMilestone,
	} = useActivationAnalyticsBase();

	const dismissHint = (hintId: ActivationHintId) => {
		setActivationUi({
			dismissedHintIds: [...new Set([...dismissedHintIds, hintId])],
		});
	};

	return {
		hints,
		dismissHint,
		evaluated,
		isLoading: activationQuery.isLoading || entitlementsQuery.isLoading,
		analyticsBase,
		analyticsForStep,
		analyticsForHint,
		analyticsForMilestone,
	};
}
