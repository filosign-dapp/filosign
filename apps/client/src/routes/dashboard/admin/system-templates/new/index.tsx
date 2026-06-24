import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/admin/system-templates/new/")({
	beforeLoad: ({ search }) => {
		throw redirect({ to: "/admin/system-templates/new", search });
	},
});
