import type { FilosignWallet } from "@filosign/react";
import type { SettlementPayerWalletResolver } from "@filosign/react/files";
import { type Address, createWalletClient, custom, getAddress } from "viem";
import { treasuryChain } from "@/src/lib/web3/treasury/chain";
import { treasuryEip1193Provider } from "@/src/lib/web3/treasury/provider";
import {
	detectTreasuryWalletKind,
	treasurySafeServiceAvailable,
} from "@/src/lib/web3/treasury/safe-detect";
import { connectTreasuryWalletSession } from "@/src/lib/web3/treasury/session";

export async function connectTreasuryPayerWallet(
	payer: Address,
): Promise<FilosignWallet> {
	const kind = await detectTreasuryWalletKind(payer);
	if (kind === "safe") {
		if (!treasurySafeServiceAvailable(treasuryChain().id)) {
			throw new Error(
				"Treasury Safe allowance changes require Safe Transaction Service support on this network.",
			);
		}
		throw new Error(
			"This payout uses a treasury Safe. Adjust USDC approval from your Safe, then retry.",
		);
	}

	const session = await connectTreasuryWalletSession();
	try {
		if (
			getAddress(session.address).toLowerCase() !==
			getAddress(payer).toLowerCase()
		) {
			throw new Error(
				"Connected treasury wallet does not match the payout payer for this document.",
			);
		}

		const provider = await treasuryEip1193Provider();
		return createWalletClient({
			account: session.address,
			chain: treasuryChain(),
			transport: custom(provider),
		});
	} catch (error) {
		await session.disconnect();
		throw error;
	}
}

export function createTreasuryPayerWalletResolver(): SettlementPayerWalletResolver {
	return async ({ payer }) => connectTreasuryPayerWallet(payer);
}
