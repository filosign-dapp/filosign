import type { Account, WalletClient } from "viem";

/** Hardhat viem wallet clients always have `account`; narrows for strict TS. */
export function walletAccount(client: WalletClient): Account {
	if (client.account == null) {
		throw new Error("WalletClient.account is required");
	}
	return client.account as Account;
}

export function walletClientAt(
	clients: readonly WalletClient[],
	index: number,
): WalletClient {
	const c = clients[index];
	if (c == null) {
		throw new Error(`Hardhat wallet missing at index ${index}`);
	}
	return c;
}
