import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Pathless route group for shell pages; layout chrome mounts in `dashboard/route.tsx`. */
export const Route = createFileRoute("/dashboard/_shell")({
	component: Outlet,
});
