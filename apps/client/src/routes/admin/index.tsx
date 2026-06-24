import { createFileRoute } from "@tanstack/react-router";
import { AdminOverviewPage } from "@/src/lib/domains/admin/pages/overview";

export const Route = createFileRoute("/admin/")({
	component: AdminOverviewPage,
});
