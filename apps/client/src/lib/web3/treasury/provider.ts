import { getTreasuryAppKit } from "@/src/lib/web3/treasury/appkit";
import type { TreasuryEip1193Provider } from "@/src/lib/web3/treasury/types";

export async function treasuryEip1193Provider(): Promise<TreasuryEip1193Provider> {
	const { modal } = getTreasuryAppKit();
	const provider = modal.getProvider<TreasuryEip1193Provider>("eip155");
	if (!provider) {
		throw new Error("Treasury wallet provider is not available.");
	}
	return provider;
}
