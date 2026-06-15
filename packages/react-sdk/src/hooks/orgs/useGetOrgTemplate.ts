import { useQuery } from "@tanstack/react-query";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";

export function useGetOrgTemplate(templateId: string | undefined) {
	const { rpcQuery, isAuthed } = useFilosignRpc();
	const trimmedTemplateId = templateId?.trim();

	return useQuery({
		queryKey: [...rpcQuery.orgs.key(), "template", trimmedTemplateId],
		enabled: isAuthed && Boolean(trimmedTemplateId),
		queryFn: () => {
			if (!trimmedTemplateId) {
				throw new Error("templateId required");
			}
			return rpcQuery.orgs.templates.get.call({
				templateId: trimmedTemplateId,
			});
		},
	});
}
