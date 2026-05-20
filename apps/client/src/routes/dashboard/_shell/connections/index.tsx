import { createFileRoute } from "@tanstack/react-router";
import { ConnectionsPage } from "./-components/page";
import { useConnectionsController } from "./-lib/hooks/use-connections-controller";

function ConnectionsRoutePage() {
	const controller = useConnectionsController();
	return <ConnectionsPage controller={controller} />;
}

export const Route = createFileRoute("/dashboard/_shell/connections/")({
	component: ConnectionsRoutePage,
});
