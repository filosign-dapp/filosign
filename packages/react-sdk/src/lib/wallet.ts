import type { Account, Chain, Transport, WalletClient } from "viem";

/** Connected viem client passed from the app (account + chain required for signing). */
export type FilosignWallet = WalletClient<Transport, Chain, Account>;
