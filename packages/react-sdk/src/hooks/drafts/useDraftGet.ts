import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useDraftGet(draftId: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const id = draftId?.trim();

	return useQuery({
		queryKey: rpcQuery.drafts.get.key({ input: { draftId: id ?? "" } }),
		queryFn: () => {
			if (!id) throw new Error("draftId required");
			return rpcQuery.drafts.get.call({ draftId: id });
		},
		enabled: isAuthed && Boolean(id),
	});
}
