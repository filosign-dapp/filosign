import { createFileRoute } from "@tanstack/react-router";
import {
	AdminUsersPage,
	zAdminUsersSearch,
} from "@/src/lib/domains/admin/pages/users";

export const Route = createFileRoute("/admin/users/")({
	validateSearch: zAdminUsersSearch,
	component: AdminUsersPage,
});
