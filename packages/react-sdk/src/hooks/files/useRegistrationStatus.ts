import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useRegistrationStatus(pieceCid: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		...rpcQuery.files.registrationStatus.queryOptions({
			input: { pieceCid: pieceCid ?? "" },
		}),
		enabled: isAuthed && !!pieceCid,
		refetchInterval: (query) => {
			const status = query.state.data?.registrationStatus;
			if (status === "queued" || status === "registering") {
				return 2_000;
			}
			return false;
		},
	});
}
