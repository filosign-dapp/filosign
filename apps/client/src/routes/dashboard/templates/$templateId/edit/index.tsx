import { useEntitlements } from "@filosign/react/billing";
import { canUseSharedTemplates } from "@filosign/react/files";
import { useActiveOrganization, useActiveOrgId } from "@filosign/react/orgs";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { canManageTemplates } from "@/src/lib/domains/templates/template-composer";
import { useTemplateEditorController } from "@/src/lib/domains/templates/use-template-editor-controller";
import { useTemplateName } from "@/src/lib/domains/templates/use-template-name";
import { TemplateEditorPage } from "../../-components/editor/page";

function TemplateEditEditorRoutePage() {
	const navigate = useNavigate();
	const { templateId } = Route.useParams();
	const activeOrgId = useActiveOrgId();
	const activeOrg = useActiveOrganization();
	const templateName = useTemplateName(templateId, activeOrgId ?? undefined);
	const { data: entitlements, isLoading: entitlementsLoading } =
		useEntitlements();

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
