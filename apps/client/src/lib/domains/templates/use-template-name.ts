import { useOrganizationGet } from "@filosign/react/orgs";
import { useMemo } from "react";

export function useTemplateName(
	templateId: string,
	organizationId: string | undefined,
): string {
	const { data: orgDetail } = useOrganizationGet(organizationId);
	return useMemo(() => {
		const row = orgDetail?.templates.find((t) => t.id === templateId);
		return row?.name ?? "Template";
	}, [orgDetail?.templates, templateId]);
}
