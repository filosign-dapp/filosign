import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useWorkspaceBillingContext } from "@filosign/react/billing";
import { useActiveOrgId } from "@filosign/react/orgs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	useStorePersist,
	useStorePersistHydrated,
} from "@/src/lib/filosign/use-store";

export function usePartnerTrialWelcome(options?: {
	skipCheckoutFlow?: boolean;
}) {
	const hydrated = useStorePersistHydrated();
	const activeOrgId = useActiveOrgId();
	const billingQuery = useWorkspaceBillingContext();
	const captureAppEvent = useCaptureAppEvent();
	const { activationUi, setActivationUi } = useStorePersist();

	const [open, setOpen] = useState(false);
	const shownForOrgRef = useRef<string | null>(null);

	const trial = billingQuery.data?.partnerInviteTrial ?? null;
	const dismissedOrgIds = activationUi.dismissedPartnerTrialWelcomeOrgIds;

	const isDismissed = useMemo(() => {
		if (!activeOrgId) return true;
		return dismissedOrgIds.includes(activeOrgId);
	}, [activeOrgId, dismissedOrgIds]);

	const shouldConsider =
		hydrated &&
		Boolean(activeOrgId) &&
		billingQuery.isSuccess &&
		trial?.active === true &&
		!isDismissed &&
		!options?.skipCheckoutFlow;

	useEffect(() => {
		if (!shouldConsider || !activeOrgId) return;
		if (shownForOrgRef.current === activeOrgId) return;

		shownForOrgRef.current = activeOrgId;
		setOpen(true);
		captureAppEvent(CLIENT_ANALYTICS_EVENTS.partnerTrialWelcomeShown, {
			plan_id: trial?.planId,
			trial_days: trial?.trialDays,
		});
	}, [
		shouldConsider,
		activeOrgId,
		captureAppEvent,
		trial?.planId,
		trial?.trialDays,
	]);

	const onOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen && activeOrgId && open) {
				if (!dismissedOrgIds.includes(activeOrgId)) {
					setActivationUi({
						dismissedPartnerTrialWelcomeOrgIds: [
							...dismissedOrgIds,
							activeOrgId,
						],
					});
					captureAppEvent(
						CLIENT_ANALYTICS_EVENTS.partnerTrialWelcomeDismissed,
						{
							plan_id: trial?.planId,
							trial_days: trial?.trialDays,
						},
					);
				}
			}
			setOpen(nextOpen);
		},
		[
			activeOrgId,
			captureAppEvent,
			dismissedOrgIds,
			open,
			setActivationUi,
			trial?.planId,
			trial?.trialDays,
		],
	);

	return {
		open,
		onOpenChange,
		trial,
	};
}
