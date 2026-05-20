import { createFileRoute, Outlet } from "@tanstack/react-router";
import DashboardLayout from "./-layout";

export const Route = createFileRoute("/dashboard/_shell")({
	component: DashboardShellLayout,
});

function DashboardShellLayout() {
	return (
		<DashboardLayout>
			<Outlet />
		</DashboardLayout>
	);
}
