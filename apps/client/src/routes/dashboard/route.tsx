import {
	createFileRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import DashboardProtector from "@/src/lib/auth/dashboard-protector";
import { TermsReacceptanceGate } from "@/src/lib/auth/terms-reacceptance-gate";
import { useDashboardShellLayout } from "@/src/lib/components/app/suspense/dashboard-shell-layout";
import { EntitlementUpgradeProvider } from "@/src/lib/domains/entitlements/upgrade-context";
import { FeedbackDialogMount } from "@/src/lib/feedback/feedback-dialog";
import { FeedbackProvider } from "@/src/lib/feedback/feedback-provider";
import { FloatingPromptHost } from "@/src/lib/feedback/floating-prompt-host";
import DashboardLayout from "@/src/routes/dashboard/_shell/-components/DashboardLayout";

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

function DashboardRoute() {
	const shellLayout = useDashboardShellLayout();
	const outlet = <Outlet />;

	return (
		<DashboardProtector>
			<EntitlementUpgradeProvider>
				<FeedbackProvider>
					<TermsReacceptanceGate>
						{shellLayout ? <DashboardLayout>{outlet}</DashboardLayout> : outlet}
					</TermsReacceptanceGate>
					<DashboardFeedbackMount />
				</FeedbackProvider>
			</EntitlementUpgradeProvider>
		</DashboardProtector>
	);
}

export const Route = createFileRoute("/dashboard")({
	component: DashboardRoute,
});
