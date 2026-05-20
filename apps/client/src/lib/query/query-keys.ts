/**
 * Central query-key entry point for the client app.
 *
 * - **oRPC:** `rpcQuery.*.key()` from `useFilosignContext()` (or helpers in `@filosign/react/invalidate-queries`).
 * - **Non-oRPC / derived:** `filosignKeys` from the React SDK (wallet, on-chain, session, UI caches).
 */
export {
	FILOSIGN_RPC_ROOT,
	filosignKeys,
	filosignNonRpcRoots,
	filosignQueryRoots,
	queryKeyHasNonRpcRoot,
	queryKeyStartsWith,
} from "@filosign/react/query-keys";
