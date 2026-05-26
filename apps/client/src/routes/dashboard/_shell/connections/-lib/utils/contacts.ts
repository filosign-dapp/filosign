import type { FilosignRpcQueryUtils } from "@filosign/react";
import { invalidateSharingQueries } from "@filosign/react/invalidate-queries";
import type { QueryClient } from "@tanstack/react-query";

export function invalidateSharingQueriesForConnections(
	queryClient: QueryClient,
	rpcQuery: FilosignRpcQueryUtils,
) {
	return invalidateSharingQueries(queryClient, rpcQuery);
}
