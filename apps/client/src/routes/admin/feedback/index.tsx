import { createFileRoute } from "@tanstack/react-router";
import {
	AdminFeedbackPage,
	zAdminFeedbackSearch,
} from "@/src/lib/domains/admin/pages/feedback";

export const Route = createFileRoute("/admin/feedback/")({
	validateSearch: zAdminFeedbackSearch,
	component: AdminFeedbackPage,
});
