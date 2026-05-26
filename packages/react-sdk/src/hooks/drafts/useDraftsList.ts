import type { InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type DraftSummaryRow =
	InferClientOutputs<AppRouterClient>["drafts"]["list"]["drafts"][number];

export function useDraftsList() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		queryKey: rpcQuery.drafts.list.key(),
		queryFn: () => rpcQuery.drafts.list.call(),
		enabled: isAuthed,
	});
}
