import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import {
	useActivationProgress,
	useMarkActivationMilestone,
} from "@filosign/react/users";
import { activationAnalyticsContext } from "@filosign/shared";
import { useCallback, useEffect, useRef } from "react";

/** Marks `first_envelope_started` once per session when the user opens compose. */
export function useMarkFirstEnvelopeStarted() {
	const markMilestone = useMarkActivationMilestone();
	const captureAppEvent = useCaptureAppEvent();
	const { evaluated, activationQuery, entitlementsQuery } =
		useActivationProgress();
	const inFlightRef = useRef(false);

	return useCallback(() => {
		const activation = activationQuery.data;
		if (!activation || inFlightRef.current) return;
		if (activation.milestones.includes("first_envelope_started")) return;

		inFlightRef.current = true;
		void markMilestone.mutateAsync("first_envelope_started").finally(() => {
			inFlightRef.current = false;
		});

		if (evaluated) {
			captureAppEvent(
				CLIENT_ANALYTICS_EVENTS.activationEnvelopeStarted,
				activationAnalyticsContext({
					deployment: activation.deployment,
					activationProfileId: evaluated.profileId,
					billingPlanId: entitlementsQuery.data?.planId ?? "free",
					catalogVersion: evaluated.catalogVersion,
					milestone: "first_envelope_started",
				}),
			);
		}
	}, [
		activationQuery.data,
		captureAppEvent,
		entitlementsQuery.data?.planId,
		evaluated,
		markMilestone,
	]);
}

/** Covers direct navigation to compose (not only the New Envelope CTA). */
export function useActivationEnvelopeStartedOnMount() {
	const markStarted = useMarkFirstEnvelopeStarted();
	const { activationQuery } = useActivationProgress();

	useEffect(() => {
		if (!activationQuery.data) return;
		markStarted();
	}, [activationQuery.data, markStarted]);
}
