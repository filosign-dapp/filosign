import { createRouter } from "@tanstack/react-router";
import { RouteErrorFallback } from "@/src/lib/components/app/errors/route-error-fallback";
import { RoutePendingFallback } from "@/src/lib/components/app/suspense";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
	routeTree,
	defaultPendingComponent: RoutePendingFallback,
	defaultErrorComponent: RouteErrorFallback,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

export default router;
