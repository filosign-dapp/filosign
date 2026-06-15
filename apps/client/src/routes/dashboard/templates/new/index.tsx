import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef } from "react";
import { z } from "zod";
import { useTemplateEditorController } from "@/src/lib/domains/templates/use-template-editor-controller";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { TemplateEditorPage } from "../-components/editor/page";

function TemplateCreateEditorRoutePage() {
	const { templateName } = Route.useSearch();
	const templateIdRef = useRef(crypto.randomUUID());
	const createForm = useStorePersist((s) => s.createForm);
	const displayName = useMemo(
		() =>
			templateName?.trim() ||
			createForm?.emailSubject?.trim() ||
			createForm?.documents[0]?.name.replace(/\.pdf$/i, "") ||
			"New template",
		[createForm, templateName],
	);
	const controller = useTemplateEditorController({
		mode: "create",
		templateId: templateIdRef.current,
	});

	return (
		<TemplateEditorPage
			controller={controller}
			mode="create"
			templateId={templateIdRef.current}
			templateName={displayName}
		/>
	);
}

export const Route = createFileRoute("/dashboard/templates/new/")({
	validateSearch: z.object({
		templateName: z.string().trim().min(1).max(120).optional(),
	}),
	component: TemplateCreateEditorRoutePage,
});
