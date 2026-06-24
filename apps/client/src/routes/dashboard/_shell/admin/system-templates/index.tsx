import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/dashboard/_shell/admin/system-templates/",
)({
	beforeLoad: () => {
		throw redirect({ to: "/admin/system-templates" });
	},
});
