import { createFileRoute } from "@tanstack/react-router";
import { AdminSystemTemplatesPage } from "@/src/lib/domains/admin/pages/system-templates";

export const Route = createFileRoute("/admin/system-templates/")({
	component: AdminSystemTemplatesPage,
});
