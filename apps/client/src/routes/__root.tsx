import { createRootRoute, Outlet } from "@tanstack/react-router";
import { NotFound } from "@/src/lib/components/shared/NotFound";

export const Route = createRootRoute({
	component: () => <Outlet />,
	notFoundComponent: () => <NotFound />,
});
