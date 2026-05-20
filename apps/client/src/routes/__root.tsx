import { createRootRoute, Outlet } from "@tanstack/react-router";
import { NotFound } from "@/src/lib/components/app/errors/not-found";

export const Route = createRootRoute({
	component: () => <Outlet />,
	notFoundComponent: () => <NotFound />,
});
