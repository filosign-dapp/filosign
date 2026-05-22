import type { ReactNode } from "react";
import { AutoConnect, ThirdwebProvider } from "thirdweb/react";
import { filosignInAppWallet, thirdwebClient } from "@/src/lib/web3/config";

/** thirdweb in-app wallet (AutoConnect on reload). */
export function Web3Provider({ children }: { children: ReactNode }) {
	return (
		<ThirdwebProvider>
			<AutoConnect client={thirdwebClient} wallets={[filosignInAppWallet]} />
			{children}
		</ThirdwebProvider>
	);
}
