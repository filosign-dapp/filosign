import { createFileRoute } from "@tanstack/react-router";
import {
	AdminInvitesPage,
	zAdminInvitesSearch,
} from "@/src/lib/domains/admin/pages/invites";

export const Route = createFileRoute("/admin/invites/")({
	validateSearch: zAdminInvitesSearch,
	component: AdminInvitesPage,
});
