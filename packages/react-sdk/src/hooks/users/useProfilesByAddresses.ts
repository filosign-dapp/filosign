import type { InferClientOutputs } from "@orpc/client";
import { useQueries } from "@tanstack/react-query";
import type { Address } from "viem";
import { DAY } from "../../constants";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type ProfileByAddress =
	InferClientOutputs<AppRouterClient>["users"]["profile"]["lookup"];

export function useProfilesByAddresses(addresses: Address[] | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const addrs = addresses ?? [];

	const queries = useQueries({
		queries: addrs.map((address) => ({
			...rpcQuery.users.profile.lookup.queryOptions({
				input: { query: address },
			}),
			enabled: isAuthed && !!address,
			staleTime: 1 * DAY,
			retry: false,
			select: (profile: ProfileByAddress) => ({ address, profile }),
		})),
	});

	const map = new Map<Address, ProfileByAddress>();
	for (let i = 0; i < addrs.length; i++) {
		const q = queries[i];
		const addr = addrs[i];
		if (q?.data && addr) map.set(addr, q.data.profile);
	}

	return {
		data: map,
		isLoading: queries.some((q) => q.isLoading),
		isError: queries.some((q) => q.isError),
	};
}
