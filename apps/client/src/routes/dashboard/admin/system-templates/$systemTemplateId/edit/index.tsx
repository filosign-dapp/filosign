import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/dashboard/admin/system-templates/$systemTemplateId/edit/",
)({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/admin/system-templates/$systemTemplateId/edit",
			params,
		});
	},
});
