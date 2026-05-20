import { createContext, useContext } from "react";
import type { ConnectionsController } from "@/src/routes/dashboard/_shell/connections/-lib/hooks/use-connections-controller";

const ConnectionsContext = createContext<ConnectionsController | null>(null);

export function ConnectionsProvider({
	value,
	children,
}: {
	value: ConnectionsController;
	children: React.ReactNode;
}) {
	return (
		<ConnectionsContext.Provider value={value}>
			{children}
		</ConnectionsContext.Provider>
	);
}

export function useConnectionsContext(): ConnectionsController {
	const context = useContext(ConnectionsContext);
	if (!context) {
		throw new Error(
			"useConnectionsContext must be used within ConnectionsProvider",
		);
	}
	return context;
}
