import { createFileRoute } from "@tanstack/react-router";
import {
	AdminPayoutAccessPage,
	zAdminPayoutAccessSearch,
} from "@/src/lib/domains/admin/pages/payout-access";

export const Route = createFileRoute("/admin/payout-access/")({
	validateSearch: zAdminPayoutAccessSearch,
	component: AdminPayoutAccessPage,
});
