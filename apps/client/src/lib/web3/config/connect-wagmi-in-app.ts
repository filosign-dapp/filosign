import type { Wallet } from "thirdweb/wallets";
import type { Connector } from "wagmi";
import { defaultChain, type wagmiChains } from "@/src/constants";

type WagmiChainId = (typeof wagmiChains)[number]["id"];

/** Attach the thirdweb in-app wallet wagmi already authenticated via Connect UI. */
export async function connectWagmiInAppWallet(
	connectAsync: (variables: {
		connector: Connector;
		wallet: Wallet;
		chainId: WagmiChainId;
	}) => Promise<unknown>,
	connector: Connector,
	wallet: Wallet,
) {
	await connectAsync({
		connector,
		wallet,
		chainId: defaultChain.id as WagmiChainId,
	});
}
