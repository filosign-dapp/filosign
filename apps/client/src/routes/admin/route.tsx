import { createFileRoute } from "@tanstack/react-router";
import { SessionProtector } from "@/src/lib/auth/session-protector";
import { AdminShell } from "@/src/lib/domains/admin/shell";

function AdminRouteLayout() {
	return (
		<SessionProtector>
			<AdminShell />
		</SessionProtector>
	);
}

export const Route = createFileRoute("/admin")({
	component: AdminRouteLayout,
});
