import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type ShareRequestRow =
	InferClientOutputs<AppRouterClient>["sharing"]["receivedRequests"]["requests"][number];

export function useReceivedRequests(options?: { enabled?: boolean }) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const extraEnabled = options?.enabled ?? true;

	return useQuery({
		...rpcQuery.sharing.receivedRequests.queryOptions(),
		enabled: isAuthed && extraEnabled,
		select: (data) => data.requests,
	});
}
