import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useUserSignatures() {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.users.signatures.list.queryOptions(),
		enabled: isAuthed,
	});
}
