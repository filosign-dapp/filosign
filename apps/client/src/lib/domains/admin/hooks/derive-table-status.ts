import type { UseQueryResult } from "@tanstack/react-query";

export type AdminTableStatus = "loading" | "error" | "empty" | "ready";

export function deriveAdminTableStatus<TData>(
	query: Pick<
		UseQueryResult<TData | undefined>,
		"isPending" | "isError" | "data"
	>,
	getItems: (data: TData) => unknown[] | undefined,
): AdminTableStatus {
	if (query.isPending && !query.data) return "loading";
	if (query.isError) return "error";
	if (!getItems(query.data as TData)?.length) return "empty";
	return "ready";
}
