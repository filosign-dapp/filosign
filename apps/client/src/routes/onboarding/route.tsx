import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Onboarding layout; per-route protectors handle registered-user redirects. */
export const Route = createFileRoute("/onboarding")({
	component: () => <Outlet />,
});
