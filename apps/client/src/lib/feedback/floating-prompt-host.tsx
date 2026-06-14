import { useRouterState } from "@tanstack/react-router";
import { StartHereFloating } from "@/src/lib/domains/activation/start-here-floating";
import { isDashboardShellRoute } from "@/src/lib/feedback/feature-area";
import { FeedbackInviteCard } from "@/src/lib/feedback/feedback-prompt-cards";
import {
	useFeedbackPromptHost,
	useStartHereSlotVisible,
} from "@/src/lib/feedback/use-feedback-prompt";

export function FloatingPromptHost() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const startHereVisible = useStartHereSlotVisible();
	const startHereActive = isDashboardShellRoute(pathname) && startHereVisible;
	const feedback = useFeedbackPromptHost({ startHereActive });

	if (startHereActive) {
		return <StartHereFloating />;
	}

	if (feedback.showFeedbackInvite) {
		return <FeedbackInviteCard />;
	}

	return null;
}
