import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useSettlementsListByFile(pieceCid: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	return useQuery({
		...rpcQuery.settlements.listByFile.queryOptions({
			input: { pieceCid: pieceCid ?? "" },
		}),
		enabled: isAuthed && Boolean(pieceCid),
	});
}
