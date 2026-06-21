import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useCatalogGet(args: {
	systemTemplateId: string;
	enabled?: boolean;
}) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	return useQuery({
		...rpcQuery.catalog.get.queryOptions({
			input: { systemTemplateId: args.systemTemplateId },
		}),
		enabled:
			isAuthed && (args.enabled ?? true) && args.systemTemplateId.length > 0,
	});
}
