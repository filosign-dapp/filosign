import { useActiveOrgId, useOrganizationGet } from "@filosign/react/orgs";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTemplateEditorController } from "@/src/lib/domains/templates/use-template-editor-controller";
import { TemplateEditorPage } from "../../-components/editor/page";

function TemplateEditEditorRoutePage() {
	const { templateId } = Route.useParams();
	const activeOrgId = useActiveOrgId();
	const { data: orgDetail } = useOrganizationGet(activeOrgId ?? undefined);
	const templateName = useMemo(() => {
		const row = orgDetail?.templates.find((t) => t.id === templateId);
		return row?.name ?? "Template";
	}, [orgDetail?.templates, templateId]);

	const controller = useTemplateEditorController({
		mode: "edit",
		templateId,
	});

	return (
		<TemplateEditorPage
			controller={controller}
			mode="edit"
			templateId={templateId}
			templateName={templateName}
		/>
	);
}

export const Route = createFileRoute("/dashboard/templates/$templateId/edit/")({
	component: TemplateEditEditorRoutePage,
});
