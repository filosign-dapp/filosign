import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { DAY } from "../../constants";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type UserProfile =
	InferClientOutputs<AppRouterClient>["users"]["profile"]["me"];

export async function fetchUserProfile(
	rpc: AppRouterClient,
): Promise<UserProfile> {
	return rpc.users.profile.me();
}

export type UseUserProfileOptions = {
	/** When false, skips JWT bootstrap and the profile query. Default true. */
	enabled?: boolean;
};

export function useUserProfile(options?: UseUserProfileOptions) {
	const gate = options?.enabled ?? true;
	const { rpcQuery, isAuthed } = useFilosignRpc({ enabled: gate });
	const { wallet } = useFilosignContext();
	const walletAddress = wallet?.account.address;

	return useQuery({
		...rpcQuery.users.profile.me.queryOptions(),
		queryKey: [...rpcQuery.users.profile.me.key(), walletAddress ?? null],
		enabled: gate && isAuthed && Boolean(walletAddress),
		staleTime: 1 * DAY,
	});
}
