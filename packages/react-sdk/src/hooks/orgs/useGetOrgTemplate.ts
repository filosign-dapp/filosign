import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useGetOrgTemplate(templateId: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const trimmedTemplateId = templateId?.trim();

	return useQuery({
		...rpcQuery.orgs.templates.get.queryOptions({
			input: { templateId: trimmedTemplateId ?? "" },
		}),
		enabled: isAuthed && Boolean(trimmedTemplateId),
	});
}
