import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
	useIdentifyAnalyticsWallet,
} from "@filosign/react/analytics";
import { useCallback, useMemo } from "react";
import { useActiveAccount, useConnectModal } from "thirdweb/react";
import { useConnect, useConnectors } from "wagmi";
import { logger } from "@/src/lib/utils/logger";
import { connectWagmiInAppWallet } from "@/src/lib/web3/config/connect-wagmi-in-app";
import { thirdwebConnectModalOptions } from "@/src/lib/web3/config/wallet-modal-options";

const IN_APP_WALLET_CONNECTOR_ID = "in-app-wallet";

/** Opens thirdweb Connect modal; fires `wallet_signup` on first wallet connect in session. */
export function useThirdwebLogin() {
	const captureAppEvent = useCaptureAppEvent();
	const identifyAnalyticsWallet = useIdentifyAnalyticsWallet();
	const account = useActiveAccount();
	const { connect } = useConnectModal();
	const { connectAsync } = useConnect();
	const connectors = useConnectors();
	const inAppConnector = useMemo(
		() => connectors.find((c) => c.id === IN_APP_WALLET_CONNECTOR_ID),
		[connectors],
	);

	const login = useCallback(async () => {
		const hadAccount = Boolean(account?.address);
		const wallet = await connect(thirdwebConnectModalOptions);
		if (inAppConnector) {
			try {
				await connectWagmiInAppWallet(
					connectAsync as Parameters<typeof connectWagmiInAppWallet>[0],
					inAppConnector,
					wallet,
				);
			} catch (err) {
				logger.error("Wagmi connect after thirdweb modal:", err);
			}
		}
		const address = wallet.getAccount()?.address;
		if (!hadAccount && address) {
			captureAppEvent(CLIENT_ANALYTICS_EVENTS.walletSignup, {});
			identifyAnalyticsWallet(address);
		}
	}, [
		account?.address,
		captureAppEvent,
		connect,
		connectAsync,
		identifyAnalyticsWallet,
		inAppConnector,
	]);

	return { login };
}

export function useThirdwebLoginAction() {
	const { login } = useThirdwebLogin();
	return useCallback(() => login(), [login]);
}
