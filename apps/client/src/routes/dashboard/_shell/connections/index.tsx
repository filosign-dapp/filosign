import { createFileRoute } from "@tanstack/react-router";
import { ConnectionsPageContent } from "./-components/page";
import { ConnectionsProvider } from "./-lib/context/context";
import { useConnectionsController } from "./-lib/hooks/use-connections-controller";

function ConnectionsRoutePage() {
	const controller = useConnectionsController();
	return (
		<ConnectionsProvider value={controller}>
			<ConnectionsPageContent />
		</ConnectionsProvider>
	);
}

export const Route = createFileRoute("/dashboard/_shell/connections/")({
	component: ConnectionsRoutePage,
});
