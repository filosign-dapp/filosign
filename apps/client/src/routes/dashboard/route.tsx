import {
	createFileRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import DashboardProtector from "@/src/lib/auth/dashboard-protector";
import { TermsReacceptanceGate } from "@/src/lib/auth/terms-reacceptance-gate";
import { EntitlementUpgradeProvider } from "@/src/lib/domains/entitlements/upgrade-context";
import { FeedbackDialogMount } from "@/src/lib/feedback/feedback-dialog";
import { FeedbackProvider } from "@/src/lib/feedback/feedback-provider";
import { FloatingPromptHost } from "@/src/lib/feedback/floating-prompt-host";

function DashboardFeedbackMount() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	if (!pathname.startsWith("/dashboard")) return null;

	return (
		<>
			<FloatingPromptHost />
			<FeedbackDialogMount />
		</>
	);
}

export const Route = createFileRoute("/dashboard")({
	component: () => (
		<DashboardProtector>
			<EntitlementUpgradeProvider>
				<FeedbackProvider>
					<TermsReacceptanceGate>
						<Outlet />
					</TermsReacceptanceGate>
					<DashboardFeedbackMount />
				</FeedbackProvider>
			</EntitlementUpgradeProvider>
		</DashboardProtector>
	),
});
