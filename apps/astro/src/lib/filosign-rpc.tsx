import {
	type AppRouterClient,
	createPublicFilosignOrpcClient,
} from "@filosign/react/orpc";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { env } from "../env";

const FilosignRpcContext = createContext<AppRouterClient | null>(null);

export function FilosignRpcProvider({
	serverUrl = env.PUBLIC_SERVER_URL,
	children,
}: {
	serverUrl?: string;
	children: ReactNode;
}) {
	const rpc = useMemo(
		() => createPublicFilosignOrpcClient(serverUrl),
		[serverUrl],
	);

	return (
		<FilosignRpcContext.Provider value={rpc}>
			{children}
		</FilosignRpcContext.Provider>
	);
}

export function useFilosignRpc(): AppRouterClient {
	const rpc = useContext(FilosignRpcContext);
	if (!rpc) {
		throw new Error("useFilosignRpc must be used within FilosignRpcProvider");
	}
	return rpc;
}
