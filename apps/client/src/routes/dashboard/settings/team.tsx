import { createFileRoute } from "@tanstack/react-router";
import TeamSettingsPage from "@/src/pages/dashboard/settings/team";

export const Route = createFileRoute("/dashboard/settings/team")({
	component: TeamSettingsPage,
});
