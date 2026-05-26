import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSettingsPage } from "./-components/page";
import { WorkspaceSettingsProvider } from "./-lib/context/context";
import { useWorkspaceSettingsController } from "./-lib/hooks/use-workspace-controller";

function WorkspaceSettingsRoutePage() {
	const controller = useWorkspaceSettingsController();
	return (
		<WorkspaceSettingsProvider value={controller}>
			<WorkspaceSettingsPage />
		</WorkspaceSettingsProvider>
	);
}

export const Route = createFileRoute("/dashboard/_shell/settings/workspace/")({
	component: WorkspaceSettingsRoutePage,
});
