import { useFilosignContext } from "@filosign/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useSystemTemplateEditorController } from "@/src/lib/domains/templates/use-system-template-editor-controller";
import { deriveTemplateDisplayName } from "@/src/lib/domains/templates/utils/display-name";
import { TemplateEditorPage } from "@/src/routes/dashboard/templates/-components/editor/page";

function SystemTemplateEditEditorPage() {
	const { systemTemplateId } = Route.useParams();
	const { rpcQuery } = useFilosignContext();

	const detailQuery = useQuery({
		...rpcQuery.platformAdmin.systemTemplates.get.queryOptions({
			input: { systemTemplateId },
		}),
	});

	const controller = useSystemTemplateEditorController({
		mode: "system-edit",
		systemTemplateId,
	});

	const templateName = deriveTemplateDisplayName(
		detailQuery.data?.template.name ?? "System template",
	);

	return (
		<TemplateEditorPage
			controller={controller}
			mode="system-edit"
			templateId={systemTemplateId}
			templateName={templateName}
			systemTemplateMeta={{
				category: detailQuery.data?.template.meta.category,
				documentVersion: detailQuery.data?.template.meta.documentVersion,
				tags: detailQuery.data?.template.meta.tags,
			}}
		/>
	);
}

export const Route = createFileRoute(
	"/dashboard/admin/system-templates/$systemTemplateId/edit/",
)({
	component: SystemTemplateEditEditorPage,
});
