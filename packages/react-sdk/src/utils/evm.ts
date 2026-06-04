import { parseEvmAddress } from "@filosign/shared";
import type { Address } from "viem";

/** Checksummed address from a connected wallet account. */
export function walletAccountAddress(account: { address: string }): Address {
	return parseEvmAddress(account.address);
}
