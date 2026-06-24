import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/_shell/admin/")({
	beforeLoad: () => {
		throw redirect({ to: "/admin" });
	},
});
