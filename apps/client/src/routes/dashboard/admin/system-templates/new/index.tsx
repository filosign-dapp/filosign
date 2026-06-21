import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import { z } from "zod";
import { useSystemTemplateEditorController } from "@/src/lib/domains/templates/use-system-template-editor-controller";
import { deriveTemplateDisplayName } from "@/src/lib/domains/templates/utils/display-name";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { TemplateEditorPage } from "@/src/routes/dashboard/templates/-components/editor/page";

function SystemTemplateCreateEditorPage() {
	const { templateName } = Route.useSearch();
	const systemTemplateIdRef = useRef(crypto.randomUUID());
	const createForm = useStorePersist((s) => s.createForm);

	const systemTemplateId =
		createForm?.templateContext?.systemTemplateId ??
		systemTemplateIdRef.current;

	const displayName = useMemo(
		() =>
			deriveTemplateDisplayName(
				templateName?.trim() ||
					createForm?.emailSubject?.trim() ||
					createForm?.documents[0]?.name,
			),
		[createForm, templateName],
	);

	const controller = useSystemTemplateEditorController({
		mode: "system-create",
		systemTemplateId,
	});

	return (
		<TemplateEditorPage
			controller={controller}
			mode="system-create"
			templateId={systemTemplateId}
			templateName={displayName}
		/>
	);
}

export const Route = createFileRoute("/dashboard/admin/system-templates/new/")({
	validateSearch: z.object({
		templateName: z.string().trim().min(1).max(120).optional(),
	}),
	component: SystemTemplateCreateEditorPage,
});
