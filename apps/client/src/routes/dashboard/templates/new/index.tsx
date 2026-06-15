import { useEntitlements } from "@filosign/react/billing";
import { canUseSharedTemplates } from "@filosign/react/files";
import { useActiveOrganization } from "@filosign/react/orgs";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { z } from "zod";
import { toastUser } from "@/src/lib/copy/toast";
import { hasDraftContent } from "@/src/lib/domains/drafts";
import { canManageTemplates } from "@/src/lib/domains/templates/template-composer";
import { useTemplateEditorController } from "@/src/lib/domains/templates/use-template-editor-controller";
import { deriveTemplateDisplayName } from "@/src/lib/domains/templates/utils/display-name";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { TemplateEditorPage } from "../-components/editor/page";

function TemplateCreateEditorRoutePage() {
	const navigate = useNavigate();
	const { templateName } = Route.useSearch();
	const templateIdRef = useRef(crypto.randomUUID());
	const createForm = useStorePersist((s) => s.createForm);
	const clearCreateForm = useStorePersist((s) => s.clearCreateForm);
	const { data: entitlements, isLoading: entitlementsLoading } =
		useEntitlements();
	const activeOrg = useActiveOrganization();

	const templateId =
		createForm?.templateContext?.mode === "create"
			? createForm.templateContext.templateId
			: templateIdRef.current;

	useEffect(() => {
		if (entitlementsLoading) return;
		const allowed =
			canUseSharedTemplates(entitlements) &&
			canManageTemplates(activeOrg?.role);
		if (!allowed) {
			toastUser.error("Templates are not available on your current plan.");
			void navigate({ to: "/dashboard/templates", replace: true });
		}
	}, [activeOrg?.role, entitlements, entitlementsLoading, navigate]);

	useEffect(() => {
		const draft = useStorePersist.getState().createForm;
		if (draft && hasDraftContent(draft) && !draft.templateContext) {
			clearCreateForm();
		}
	}, [clearCreateForm]);

	const displayName = useMemo(
		() =>
			deriveTemplateDisplayName(
				templateName?.trim() ||
					createForm?.emailSubject?.trim() ||
					createForm?.documents[0]?.name,
			),
		[createForm, templateName],
	);

	const controller = useTemplateEditorController({
		mode: "create",
		templateId,
	});

	return (
		<TemplateEditorPage
			controller={controller}
			mode="create"
			templateId={templateId}
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
