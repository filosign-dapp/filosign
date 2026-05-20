import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { DAY } from "../../constants";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type UserProfileLookup =
	InferClientOutputs<AppRouterClient>["users"]["profile"]["lookup"];

export function useUserProfileByQuery(query: {
	address?: Address | undefined;
	email?: string | undefined;
	username?: string | undefined;
}) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const q = query.address ?? query.username ?? query.email ?? "";
	const hasQuery = !!(query.address || query.username || query.email);

	return useQuery({
		...rpcQuery.users.profile.lookup.queryOptions({ input: { query: q } }),
		enabled: hasQuery && isAuthed,
		staleTime: 1 * DAY,
		retry: false,
	});
}
