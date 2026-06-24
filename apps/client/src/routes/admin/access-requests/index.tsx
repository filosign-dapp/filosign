import { createFileRoute } from "@tanstack/react-router";
import {
	AdminAccessRequestsPage,
	zAdminAccessRequestsSearch,
} from "@/src/lib/domains/admin/pages/access-requests";

export const Route = createFileRoute("/admin/access-requests/")({
	validateSearch: zAdminAccessRequestsSearch,
	component: AdminAccessRequestsPage,
});
