import { useFilosignContext } from "../context/useFilosignContext";
import {
	type UseAuthedApiOptions,
	useAuthedApi,
} from "../hooks/auth/useAuthedApi";

export type UseFilosignRpcOptions = UseAuthedApiOptions;

/**
 * Filosign RPC client, oRPC TanStack helpers (`rpcQuery`), and JWT session gate.
 * Use `rpcQuery.*.queryOptions()` / `mutationOptions()` for API calls; gate with `isAuthed`.
 */
export function useFilosignRpc(options?: UseFilosignRpcOptions) {
	const { rpc, rpcQuery } = useFilosignContext();
	const authedQuery = useAuthedApi(options);

	return {
		rpc,
		rpcQuery,
		auth: authedQuery.data,
		isAuthed: !!authedQuery.data,
		authedQuery,
	};
}
