import { createFileRoute } from "@tanstack/react-router";
import { AdminMetricsPage } from "@/src/lib/domains/admin/pages/metrics";

export const Route = createFileRoute("/admin/metrics/")({
	component: AdminMetricsPage,
});
