import { useQuery } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { filosignKeys } from "../../lib/query-keys";
import type { AppRouterClient } from "../../orpc/app-router-types";
import type { FilosignSession } from "../../orpc/create-orpc-client";
import { useIsRegistered } from "./useIsRegistered";

export type FilosignAuthed = {
	rpc: AppRouterClient;
	session: FilosignSession;
};

export type UseAuthedApiOptions = {
	/** When false, skips the thirdweb session bootstrap query. Default true. */
	enabled?: boolean;
};

/**
 * Ensures thirdweb `useAuthToken()` is on the oRPC client before authenticated procedures run.
 */
export function useAuthedApi(options?: UseAuthedApiOptions) {
	const { rpc, session, wallet, thirdwebAuthToken } = useFilosignContext();
	const walletAddress = wallet?.account.address;
	const { data: isRegistered } = useIsRegistered();
	const authEnabled = options?.enabled ?? true;

	return useQuery({
		queryKey: filosignKeys.authedApi(walletAddress),
		queryFn: async (): Promise<FilosignAuthed> => {
			if (!wallet || !walletAddress) {
				throw new Error("unreachable");
			}

			session.bindWallet(walletAddress);
			const token = thirdwebAuthToken?.trim();
			if (!token) {
				throw new Error("Thirdweb auth token required");
			}
			session.setThirdwebAuthToken(token);

			if (isRegistered !== true) {
				throw new Error("Filosign registration required");
			}

			return { rpc, session };
		},
		enabled:
			authEnabled &&
			!!wallet &&
			!!thirdwebAuthToken?.trim() &&
			isRegistered === true,
		retry: false,
	});
}
