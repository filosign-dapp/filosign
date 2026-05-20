import { useSyncWagmiWithThirdweb } from "@/src/lib/web3/bridge/use-sync-wagmi-thirdweb";

/** Renders nothing; syncs wagmi ↔ thirdweb in-app wallet (including post-refresh recovery). */
export function WagmiThirdwebSync() {
	useSyncWagmiWithThirdweb();
	return null;
}
