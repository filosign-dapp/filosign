/**
 * TanStack Query keys for non-oRPC state (wallet, on-chain reads, session, derived client queries).
 *
 * **oRPC procedures:** use `rpcQuery.<domain>.<procedure>.key()` from context — keys are
 * `["filosign", <domain>, …]` (see `filosignQueryRoots`). Invalidate with `.key()` or a parent
 * domain root; never hand-roll procedure strings.
 *
 * **Invalidation helpers:** `invalidate-queries.ts` (inbox, sharing, orgs, auth, profile).
 */
export const FILOSIGN_RPC_ROOT = ["filosign"] as const;

/** Static prefixes aligned with `createFilosignRpcQueryUtils` — use when `rpcQuery` is unavailable. */
export const filosignQueryRoots = {
	all: FILOSIGN_RPC_ROOT,
	runtime: [...FILOSIGN_RPC_ROOT, "runtime"] as const,
	auth: [...FILOSIGN_RPC_ROOT, "auth"] as const,
	files: [...FILOSIGN_RPC_ROOT, "files"] as const,
	sharing: [...FILOSIGN_RPC_ROOT, "sharing"] as const,
	users: [...FILOSIGN_RPC_ROOT, "users"] as const,
	orgs: [...FILOSIGN_RPC_ROOT, "orgs"] as const,
	billing: [...FILOSIGN_RPC_ROOT, "billing"] as const,
	settlements: [...FILOSIGN_RPC_ROOT, "settlements"] as const,
} as const;

/** First segment of non-oRPC keys (for `refetchQueries` predicates). */
export const filosignNonRpcRoots = {
	authedApi: "fsQ-authed-api",
	isApproved: "fsQ-is-approved",
	keyRegistrySnapshot: "fsQ-key-registry-snapshot",
	isLoggedIn: "fsQ-is-logged-in",
	decryptedFileMetadata: "fsQ-decrypted-file-metadata",
} as const;

export const filosignKeys = {
	authedApi: (address: string | undefined) =>
		[filosignNonRpcRoots.authedApi, address] as const,

	/** useCanSendTo / useCanReceiveFrom — dependency first (recipient or sender), then wallet. */
	isApprovedDependentFirst: (dependent: string, wallet: string | undefined) =>
		[filosignNonRpcRoots.isApproved, dependent, wallet] as const,

	/** useApproveSender / useRevokeSender refetch — wallet first, then counterparty address. */
	isApprovedWalletFirst: (wallet: string | undefined, counterparty: string) =>
		[filosignNonRpcRoots.isApproved, wallet, counterparty] as const,

	/** Single on-chain read: isRegistered + keygenData (parallel eth_call). */
	keyRegistrySnapshot: (address: string | undefined) =>
		[filosignNonRpcRoots.keyRegistrySnapshot, address] as const,

	isLoggedIn: (address: string | undefined) =>
		[filosignNonRpcRoots.isLoggedIn, address] as const,

	/**
	 * Derived contact list (profiles for accepted sent requests).
	 * Invalidate via `filosignQueryRoots.sharing` or `rpcQuery.sharing.key()`.
	 */
	acceptedPeople: (recipientWallets: readonly string[]) =>
		[
			...filosignQueryRoots.sharing,
			"accepted-people",
			...recipientWallets,
		] as const,

	/** Decrypted preview metadata cache on document cards (client-only). */
	decryptedFileMetadata: (pieceCid: string, orgDecryptEligible: boolean) =>
		[
			filosignNonRpcRoots.decryptedFileMetadata,
			pieceCid,
			orgDecryptEligible,
		] as const,
} as const;

/** True when `queryKey` is an array whose leading segments match `prefix`. */
export function queryKeyStartsWith(
	queryKey: unknown,
	prefix: readonly unknown[],
): boolean {
	if (!Array.isArray(queryKey) || queryKey.length < prefix.length) {
		return false;
	}
	return prefix.every((segment, index) => queryKey[index] === segment);
}

/** True when the first segment of `queryKey` matches a non-oRPC root string. */
export function queryKeyHasNonRpcRoot(
	queryKey: unknown,
	root: (typeof filosignNonRpcRoots)[keyof typeof filosignNonRpcRoots],
): boolean {
	return Array.isArray(queryKey) && queryKey[0] === root;
}
