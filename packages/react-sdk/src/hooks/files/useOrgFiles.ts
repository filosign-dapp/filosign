import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { useActiveOrgId } from "../orgs/useOrganizations";

export function useOrgFiles() {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const activeOrgId = useActiveOrgId();
	return useQuery({
		...rpcQuery.files.list.org.queryOptions(),
		enabled: isAuthed && Boolean(activeOrgId),
		select: (data) => {
			const files = (data as { files?: unknown[] })?.files ?? [];
			return files;
		},
	});
}
