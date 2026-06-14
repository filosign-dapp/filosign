import { useEffect, useMemo, useState } from "react";
import { useStartHereController } from "@/src/lib/domains/activation/use-start-here-controller";
import {
	canShowFeedbackInvite,
	FEEDBACK_PREFS_CHANGED_EVENT,
} from "@/src/lib/feedback/prefs-storage";

export function useStartHereSlotVisible() {
	const { isLoading, evaluated, showFloatingCard, checklistDismissed } =
		useStartHereController();

	if (isLoading || !evaluated) return false;

	return (
		showFloatingCard ||
		(checklistDismissed && !evaluated.basicOnboardingComplete)
	);
}

export function useFeedbackPromptHost(args: { startHereActive: boolean }) {
	const [prefsVersion, setPrefsVersion] = useState(0);

	useEffect(() => {
		const onPrefsChanged = () => setPrefsVersion((value) => value + 1);
		window.addEventListener(FEEDBACK_PREFS_CHANGED_EVENT, onPrefsChanged);
		return () =>
			window.removeEventListener(FEEDBACK_PREFS_CHANGED_EVENT, onPrefsChanged);
	}, []);

	const showFeedbackInvite = useMemo(() => {
		void prefsVersion;
		return canShowFeedbackInvite({ startHereActive: args.startHereActive });
	}, [args.startHereActive, prefsVersion]);

	return { showFeedbackInvite };
}
