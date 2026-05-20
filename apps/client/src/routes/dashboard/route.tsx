import { createFileRoute, Outlet } from "@tanstack/react-router";
import DashboardProtector from "@/src/lib/auth/dashboard-protector";

export const Route = createFileRoute("/dashboard")({
	component: () => (
		<DashboardProtector>
			<Outlet />
		</DashboardProtector>
	),
});
