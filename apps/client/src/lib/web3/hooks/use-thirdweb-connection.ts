import { useActiveWalletConnectionStatus } from "thirdweb/react";

/** Lightweight wallet connection state (no connect/disconnect subscriptions). */
export function useThirdwebConnection() {
	const status = useActiveWalletConnectionStatus();
	return {
		ready: status !== "connecting",
		authenticated: status === "connected",
		isConnecting: status === "connecting",
	} as const;
}
