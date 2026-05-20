import { useEffect, useMemo, useRef } from "react";
import {
	useActiveWallet,
	useConnect,
	useIsAutoConnecting,
} from "thirdweb/react";
import {
	useAccount,
	useConnectors,
	useConnect as useWagmiConnect,
} from "wagmi";
import {
	hydrationMark,
	hydrationMarkAsyncEnd,
	hydrationMarkNow,
} from "@/src/lib/utils/hydration-lifecycle";
import { logger } from "@/src/lib/utils/logger";
import { defaultThirdwebChain } from "@/src/lib/web3/config/chains";
import { thirdwebClient } from "@/src/lib/web3/config/client";
import { connectWagmiInAppWallet } from "@/src/lib/web3/config/connect-wagmi-in-app";
import { filosignInAppWallet } from "@/src/lib/web3/config/in-app-wallet";
import { useThirdwebConnection } from "@/src/lib/web3/hooks/use-thirdweb-connection";

const IN_APP_WALLET_CONNECTOR_ID = "in-app-wallet";

function hasStoredWalletToken(clientId: string): boolean {
	if (typeof window === "undefined") return false;
	try {
		const value = localStorage.getItem(`walletToken-${clientId}`);
		return Boolean(value && value.length > 0);
	} catch {
		return false;
	}
}

/**
 * Keeps wagmi in sync when thirdweb Connect UI authenticated the in-app wallet
 * without going through wagmi's `connect()` (otherwise `useWalletClient` stays empty).
 *
 * Also re-hydrates thirdweb after refresh when wagmi reconnects from storage but the
 * connection manager is still disconnected (Safari).
 */
export function useSyncWagmiWithThirdweb() {
	const { authenticated } = useThirdwebConnection();
	const isAutoConnecting = useIsAutoConnecting();
	const activeWallet = useActiveWallet();
	const { address: wagmiAddress, isConnecting: wagmiConnecting } = useAccount();
	const { connectAsync } = useWagmiConnect();
	const { connect: connectThirdweb } = useConnect({ client: thirdwebClient });
	const connectors = useConnectors();
	const syncStartedRef = useRef(false);
	const reverseSyncStartedRef = useRef(false);

	const inAppConnector = useMemo(
		() => connectors.find((c) => c.id === IN_APP_WALLET_CONNECTOR_ID),
		[connectors],
	);

	const clientId = thirdwebClient.clientId;

	useEffect(() => {
		hydrationMark("wagmi-thirdweb-sync:connection", {
			authenticated,
			wagmiAddress: wagmiAddress?.slice(0, 10),
			wagmiConnecting,
			isAutoConnecting,
			hasActiveWallet: Boolean(activeWallet),
			hasStoredToken: hasStoredWalletToken(clientId),
		});
	}, [
		authenticated,
		wagmiAddress,
		wagmiConnecting,
		isAutoConnecting,
		activeWallet,
		clientId,
	]);

	useEffect(() => {
		syncStartedRef.current = false;
	}, [authenticated, wagmiAddress]);

	useEffect(() => {
		reverseSyncStartedRef.current = false;
	}, [authenticated, wagmiAddress]);

	// thirdweb → wagmi
	useEffect(() => {
		if (!authenticated || wagmiAddress || wagmiConnecting || !inAppConnector) {
			return;
		}
		if (!activeWallet) {
			return;
		}
		if (syncStartedRef.current) {
			return;
		}
		syncStartedRef.current = true;
		const started = hydrationMarkNow();
		hydrationMark("wagmi-thirdweb-sync:thirdweb-to-wagmi-start");

		void connectWagmiInAppWallet(
			connectAsync as Parameters<typeof connectWagmiInAppWallet>[0],
			inAppConnector,
			activeWallet,
		)
			.then(() => {
				hydrationMarkAsyncEnd(
					"wagmi-thirdweb-sync:thirdweb-to-wagmi-done",
					started,
				);
			})
			.catch((err) => {
				syncStartedRef.current = false;
				hydrationMarkAsyncEnd(
					"wagmi-thirdweb-sync:thirdweb-to-wagmi-failed",
					started,
					{
						error: err instanceof Error ? err.message : "unknown",
					},
				);
				logger.error("Wagmi sync after thirdweb connect:", err);
			});
	}, [
		authenticated,
		wagmiAddress,
		wagmiConnecting,
		inAppConnector,
		activeWallet,
		connectAsync,
	]);

	// wagmi → thirdweb (refresh: wagmi.store reconnects before thirdweb AutoConnect attaches manager)
	useEffect(() => {
		if (authenticated || isAutoConnecting || wagmiConnecting) {
			return;
		}
		if (!wagmiAddress || !inAppConnector) {
			return;
		}
		if (!hasStoredWalletToken(clientId)) {
			return;
		}
		if (reverseSyncStartedRef.current) {
			return;
		}
		reverseSyncStartedRef.current = true;
		const started = hydrationMarkNow();
		hydrationMark("wagmi-thirdweb-sync:wagmi-to-thirdweb-start");

		void (async () => {
			try {
				await connectThirdweb(async () => {
					await filosignInAppWallet.autoConnect({
						client: thirdwebClient,
						chain: defaultThirdwebChain,
					});
					return filosignInAppWallet;
				});
				hydrationMarkAsyncEnd(
					"wagmi-thirdweb-sync:wagmi-to-thirdweb-done",
					started,
				);
			} catch (err) {
				reverseSyncStartedRef.current = false;
				hydrationMarkAsyncEnd(
					"wagmi-thirdweb-sync:wagmi-to-thirdweb-failed",
					started,
					{
						error: err instanceof Error ? err.message : "unknown",
					},
				);
				logger.error("Thirdweb sync after wagmi reconnect:", err);
			}
		})();
	}, [
		authenticated,
		isAutoConnecting,
		wagmiConnecting,
		wagmiAddress,
		inAppConnector,
		connectThirdweb,
		clientId,
	]);
}
