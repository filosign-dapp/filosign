import type { InferClientInputs, InferClientOutputs } from "@orpc/client";
import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";

export type DocumentsListTab = NonNullable<
	InferClientInputs<AppRouterClient>["documents"]["list"]["tab"]
>;
export type DocumentListRow =
	InferClientOutputs<AppRouterClient>["documents"]["list"]["items"][number];

export const DOCUMENTS_LIST_STALE_MS = 30_000;

export function useDocumentsList(args?: {
	tab?: DocumentsListTab;
	limit?: number;
	enabled?: boolean;
}) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const tab = args?.tab ?? "all";
	const limit = args?.limit ?? 50;

	return useQuery({
		...rpcQuery.documents.list.queryOptions({
			input: { tab, limit },
		}),
		enabled: (args?.enabled ?? true) && isAuthed,
		staleTime: DOCUMENTS_LIST_STALE_MS,
	});
}
