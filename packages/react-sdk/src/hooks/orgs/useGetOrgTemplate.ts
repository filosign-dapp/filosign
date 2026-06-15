import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useGetOrgTemplate(templateId: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useQuery({
		queryKey: [...rpcQuery.orgs.key(), "template", templateId],
		enabled: isAuthed && Boolean(templateId?.trim()),
		queryFn: () =>
			rpcQuery.orgs.templates.get.call({ templateId: templateId!.trim() }),
	});
}
