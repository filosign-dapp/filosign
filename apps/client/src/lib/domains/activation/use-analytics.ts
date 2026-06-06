import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import type { ActivationStepId } from "@filosign/shared";
import { useEffect, useRef } from "react";
import { useActivationAnalyticsBase } from "./use-activation-analytics-base";

/** Tracks checklist visibility once per mount. */
export function useActivationChecklistAnalytics(visible: boolean) {
	const captureAppEvent = useCaptureAppEvent();
	const { analyticsBase } = useActivationAnalyticsBase();
	const trackedRef = useRef(false);

	useEffect(() => {
		if (!visible || !analyticsBase || trackedRef.current) return;
		trackedRef.current = true;
		captureAppEvent(
			CLIENT_ANALYTICS_EVENTS.activationChecklistViewed,
			analyticsBase,
		);
	}, [analyticsBase, captureAppEvent, visible]);
}

/** Tracks completion next-steps card visibility once per mount. */
export function useActivationNextStepsAnalytics(visible: boolean) {
	const captureAppEvent = useCaptureAppEvent();
	const { analyticsBase } = useActivationAnalyticsBase();
	const trackedRef = useRef(false);

	useEffect(() => {
		if (!visible || !analyticsBase || trackedRef.current) return;
		trackedRef.current = true;
		captureAppEvent(
			CLIENT_ANALYTICS_EVENTS.activationNextStepsViewed,
			analyticsBase,
		);
	}, [analyticsBase, captureAppEvent, visible]);
}

export function useActivationChecklistActions() {
	const captureAppEvent = useCaptureAppEvent();
	const { analyticsBase, analyticsForStep, analyticsForMilestone } =
		useActivationAnalyticsBase();

	const trackStepClick = (stepId: ActivationStepId) => {
		if (!analyticsBase) return;
		captureAppEvent(
			CLIENT_ANALYTICS_EVENTS.activationChecklistStepClicked,
			analyticsForStep(stepId),
		);
	};

	const trackDismiss = () => {
		if (!analyticsBase) return;
		captureAppEvent(
			CLIENT_ANALYTICS_EVENTS.activationChecklistDismissed,
			analyticsBase,
		);
	};

	const trackRestore = () => {
		if (!analyticsBase) return;
		captureAppEvent(
			CLIENT_ANALYTICS_EVENTS.activationChecklistRestored,
			analyticsBase,
		);
	};

	const trackMilestoneMarked = (
		milestone: Parameters<typeof analyticsForMilestone>[0],
	) => {
		if (!analyticsBase) return;
		captureAppEvent(
			CLIENT_ANALYTICS_EVENTS.activationMilestoneMarked,
			analyticsForMilestone(milestone),
		);
	};

	const trackNextStepsDismiss = () => {
		if (!analyticsBase) return;
		captureAppEvent(
			CLIENT_ANALYTICS_EVENTS.activationNextStepsDismissed,
			analyticsBase,
		);
	};

	return {
		trackStepClick,
		trackDismiss,
		trackRestore,
		trackMilestoneMarked,
		trackNextStepsDismiss,
	};
}
