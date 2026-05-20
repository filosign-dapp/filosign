import { createFileRoute } from "@tanstack/react-router";
import { TeamSettingsPage } from "./-components/page";
import { TeamSettingsProvider } from "./-lib/context/context";
import { useTeamSettingsController } from "./-lib/hooks/use-team-controller";

function TeamSettingsRoutePage() {
	const controller = useTeamSettingsController();
	return (
		<TeamSettingsProvider value={controller}>
			<TeamSettingsPage />
		</TeamSettingsProvider>
	);
}

export const Route = createFileRoute("/dashboard/_shell/settings/team/")({
	component: TeamSettingsRoutePage,
});
