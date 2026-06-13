import { useRouterState } from "@tanstack/react-router";
import { DashboardOutletSkeleton } from "@/src/lib/components/app/skeletons";
import { Loader } from "@/src/lib/components/ui/loader";

/** TanStack Router `pendingComponent` / `defaultPendingComponent`. */
export function RoutePendingFallback() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	if (pathname.startsWith("/dashboard")) {
		return <DashboardOutletSkeleton />;
	}

	return <Loader />;
}
