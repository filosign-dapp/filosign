import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useCatalogList(args?: {
	category?: string;
	enabled?: boolean;
}) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	return useQuery({
		...rpcQuery.catalog.list.queryOptions({
			input: args?.category ? { category: args.category } : {},
		}),
		enabled: isAuthed && (args?.enabled ?? true),
	});
}
