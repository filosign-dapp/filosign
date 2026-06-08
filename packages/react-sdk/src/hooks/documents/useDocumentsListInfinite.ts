import type { InferClientInputs } from "@orpc/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import type { AppRouterClient } from "../../orpc/app-router-types";
import {
	DOCUMENTS_LIST_STALE_MS,
	type DocumentsListTab,
} from "./useDocumentsList";

export type DocumentsListInfiniteInput = {
	tab?: DocumentsListTab;
	limit?: number;
	q?: string;
};

export function flattenDocumentsListPages<T>(
	pages: Array<{ items: T[] }> | undefined,
): T[] {
	return pages?.flatMap((page) => page.items) ?? [];
}

export function useDocumentsListInfinite(
	args?: DocumentsListInfiniteInput & { enabled?: boolean },
) {
	const { rpc, rpcQuery, isAuthed } = useFilosignRpc();
	const tab = args?.tab ?? "all";
	const limit = args?.limit ?? 50;
	const q = args?.q?.trim() || undefined;

	return useInfiniteQuery({
		queryKey: [
			...rpcQuery.documents.list.queryKey({ input: { tab, limit, q } }),
			"infinite",
		] as const,
		queryFn: ({ pageParam }) =>
			rpc.documents.list({
				tab,
				limit,
				q,
				cursor: pageParam as
					| NonNullable<
							InferClientInputs<AppRouterClient>["documents"]["list"]["cursor"]
					  >
					| undefined,
			}),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last) => last.nextCursor ?? undefined,
		enabled: (args?.enabled ?? true) && isAuthed,
		staleTime: DOCUMENTS_LIST_STALE_MS,
	});
}
