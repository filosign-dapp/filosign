import { inAppWalletConnector } from "@thirdweb-dev/wagmi-adapter";
import { AutoConnect } from "thirdweb/react";
import { createConfig, http, WagmiProvider as WagmiProviderBase } from "wagmi";
import { wagmiChains } from "@/src/constants";
import { WagmiThirdwebSync } from "@/src/lib/web3/bridge/wagmi-thirdweb-sync";
import { thirdwebClient } from "@/src/lib/web3/config/client";
import {
	filosignInAppWallet,
	filosignInAppWalletOptions,
} from "@/src/lib/web3/config/in-app-wallet";
export const wagmiConfig = createConfig({
	chains: wagmiChains,
	connectors: [
		inAppWalletConnector({
			client: thirdwebClient,
			...filosignInAppWalletOptions,
		}),
	],
	transports: wagmiChains.reduce(
		(acc, chain) => {
			acc[chain.id] = http();
			return acc;
		},
		{} as Record<number, ReturnType<typeof http>>,
	),
});

declare module "wagmi" {
	interface Register {
		config: typeof wagmiConfig;
	}
}

export function WagmiProvider({ children }: { children: React.ReactNode }) {
	return (
		<WagmiProviderBase config={wagmiConfig}>
			<AutoConnect client={thirdwebClient} wallets={[filosignInAppWallet]} />
			<WagmiThirdwebSync />
			{children}
		</WagmiProviderBase>
	);
}
