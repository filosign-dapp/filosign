import { useActiveOrganization } from "@filosign/react/orgs";
import { createFileRoute } from "@tanstack/react-router";
import { canUseTemplates } from "@/src/lib/domains/templates/template-composer";
import { useTemplateEditorController } from "@/src/lib/domains/templates/use-template-editor-controller";
import { useTemplateName } from "@/src/lib/domains/templates/use-template-name";
import { useTemplateUseFlow } from "@/src/lib/domains/templates/use-template-use-flow";
import { TemplateEditorPage } from "../-components/editor/page";

function TemplatePreviewRoutePage() {
	const { templateId } = Route.useParams();
	const activeOrg = useActiveOrganization();
	const templateName = useTemplateName(templateId, activeOrg?.id);

	const controller = useTemplateEditorController({
		mode: "preview",
		templateId,
	});

	const { startUseTemplate, clonePending } = useTemplateUseFlow();

	const canUse = canUseTemplates(activeOrg?.role);

	return (
		<TemplateEditorPage
			controller={controller}
			mode="preview"
			templateId={templateId}
			templateName={templateName}
			onUseTemplate={
				canUse ? () => startUseTemplate(templateId, templateName) : undefined
			}
			useTemplatePending={clonePending}
		/>
	);
}

export const Route = createFileRoute("/dashboard/templates/$templateId/")({
	component: TemplatePreviewRoutePage,
});
