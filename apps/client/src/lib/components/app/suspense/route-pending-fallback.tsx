import { useRouterState } from "@tanstack/react-router";
import { DashboardOutletSkeleton } from "@/src/lib/components/app/skeletons";
import { isDashboardShellLayoutRoute } from "@/src/lib/components/app/suspense/dashboard-shell-layout";
import { Loader } from "@/src/lib/components/ui/loader";

/** TanStack Router `pendingComponent` / `defaultPendingComponent`. */
export function RoutePendingFallback() {
	const { pathname, shellLayout } = useRouterState({
		select: (state) => ({
			pathname: state.location.pathname,
			shellLayout: isDashboardShellLayoutRoute(state.matches),
		}),
	});

	if (pathname.startsWith("/dashboard")) {
		return shellLayout ? <DashboardOutletSkeleton /> : <Loader />;
	}

	return <Loader />;
}
