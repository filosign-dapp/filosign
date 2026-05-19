/**
 * TanStack Query keys for non-oRPC state (wallet, on-chain reads, session seed).
 * API procedures use `rpcQuery.*.key()` / `queryKey()` from `useFilosignContext().rpcQuery`.
 */
export const filosignKeys = {
	authedApi: (address: string | undefined) =>
		["fsQ-authed-api", address] as const,

	/** useCanSendTo / useCanReceiveFrom — dependency first (recipient or sender), then wallet. */
	isApprovedDependentFirst: (dependent: string, wallet: string | undefined) =>
		["fsQ-is-approved", dependent, wallet] as const,

	/** useApproveSender / useRevokeSender refetch — wallet first, then counterparty address. */
	isApprovedWalletFirst: (wallet: string | undefined, counterparty: string) =>
		["fsQ-is-approved", wallet, counterparty] as const,

	isRegistered: (address: string | undefined) =>
		["fsQ-is-registered", address] as const,

	storedKeygenData: (address: string | undefined) =>
		["fsQ-stored-keygen-data", address] as const,

	isLoggedIn: (address: string | undefined) =>
		["fsQ-is-logged-in", address] as const,
};
