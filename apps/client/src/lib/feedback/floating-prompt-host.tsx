import { useDashboardShellLayout } from "@/src/lib/components/app/suspense/dashboard-shell-layout";
import { StartHereFloating } from "@/src/lib/domains/activation/start-here-floating";
import { FeedbackInviteCard } from "@/src/lib/feedback/feedback-prompt-cards";
import {
	useFeedbackPromptHost,
	useStartHereSlotVisible,
} from "@/src/lib/feedback/use-feedback-prompt";

export function FloatingPromptHost() {
	const shellLayout = useDashboardShellLayout();
	const startHereVisible = useStartHereSlotVisible();
	const startHereActive = shellLayout && startHereVisible;
	const feedback = useFeedbackPromptHost({ startHereActive });

	if (startHereActive) {
		return <StartHereFloating />;
	}

	if (feedback.showFeedbackInvite) {
		return <FeedbackInviteCard />;
	}

	return null;
}
