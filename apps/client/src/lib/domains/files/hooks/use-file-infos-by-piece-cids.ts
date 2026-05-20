import { useFilosignContext } from "@filosign/react";
import { useAuthedApi } from "@filosign/react/auth";
import type { FileInfo } from "@filosign/react/files";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

/** Batch piece detail lookups (dedupes TanStack Query per pieceCid). */
export function useFileInfosByPieceCids(pieceCids: string[]) {
	const { rpcQuery } = useFilosignContext();
	const { data: auth } = useAuthedApi();
	const isAuthed = !!auth;

	const uniqueCids = useMemo(
		() => [...new Set(pieceCids.filter((id) => id.trim().length > 0))],
		[pieceCids],
	);

	const queries = useQueries({
		queries: uniqueCids.map((pieceCid) => ({
			...rpcQuery.files.piece.detail.queryOptions({
				input: { pieceCid },
			}),
			enabled: isAuthed && !!pieceCid,
		})),
	});

	const map = useMemo(() => {
		const next = new Map<string, FileInfo>();
		for (let i = 0; i < uniqueCids.length; i++) {
			const cid = uniqueCids[i];
			const data = queries[i]?.data;
			if (cid && data) next.set(cid, data);
		}
		return next;
	}, [uniqueCids, queries]);

	return {
		byPieceCid: map,
		isLoading: queries.some((q) => q.isLoading),
		isError: queries.some((q) => q.isError),
	};
}
