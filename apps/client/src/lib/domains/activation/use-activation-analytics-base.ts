import { useActivationProgress } from "@filosign/react/users";
import {
	type ActivationHintId,
	type ActivationMilestoneId,
	type ActivationStepId,
	activationAnalyticsContext,
} from "@filosign/shared";
import { useMemo } from "react";

export function useActivationAnalyticsBase() {
	const { activationQuery, entitlementsQuery, evaluated } =
		useActivationProgress();

	const analyticsBase = useMemo(() => {
		if (!activationQuery.data || !evaluated) return null;
		return activationAnalyticsContext({
			deployment: activationQuery.data.deployment,
			activationProfileId: evaluated.profileId,
			billingPlanId: entitlementsQuery.data?.planId ?? "free",
			catalogVersion: evaluated.catalogVersion,
		});
	}, [activationQuery.data, entitlementsQuery.data?.planId, evaluated]);

	const analyticsForStep = (stepId: ActivationStepId) =>
		analyticsBase && activationQuery.data && evaluated
			? activationAnalyticsContext({
					deployment: activationQuery.data.deployment,
					activationProfileId: evaluated.profileId,
					billingPlanId: entitlementsQuery.data?.planId ?? "free",
					catalogVersion: evaluated.catalogVersion,
					stepId,
				})
			: {};

	const analyticsForHint = (hintId: ActivationHintId) =>
		analyticsBase && activationQuery.data && evaluated
			? activationAnalyticsContext({
					deployment: activationQuery.data.deployment,
					activationProfileId: evaluated.profileId,
					billingPlanId: entitlementsQuery.data?.planId ?? "free",
					catalogVersion: evaluated.catalogVersion,
					hintId,
				})
			: {};

	const analyticsForMilestone = (milestone: ActivationMilestoneId) =>
		analyticsBase && activationQuery.data && evaluated
			? activationAnalyticsContext({
					deployment: activationQuery.data.deployment,
					activationProfileId: evaluated.profileId,
					billingPlanId: entitlementsQuery.data?.planId ?? "free",
					catalogVersion: evaluated.catalogVersion,
					milestone,
				})
			: {};

	return {
		analyticsBase,
		analyticsForStep,
		analyticsForHint,
		analyticsForMilestone,
	};
}
