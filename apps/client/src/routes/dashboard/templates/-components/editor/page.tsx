import {
	PlacementWorkspaceProvider,
	PlacementWorkspaceRow,
	PlacementWorkspaceShell,
	PlacementWorkspaceSidebar,
	PlacementWorkspaceViewer,
} from "@/src/lib/domains/placement";
import {
	type TemplateEditorMode,
	TemplateEditorModeProvider,
} from "@/src/lib/domains/templates/template-editor-mode";
import type { TemplateEditorController } from "@/src/lib/domains/templates/use-template-editor-controller";
import { TemplateEditorHeader } from "./header";
import { TemplateEditorMobileToolbar } from "./mobile-toolbar";
import { TemplateEditorSidebar } from "./sidebar";
import { TemplateContextRail } from "./template-context-rail";

type Props = {
	controller: TemplateEditorController;
	mode: TemplateEditorMode;
	templateId: string;
	templateName: string;
	onUseTemplate?: () => void;
	useTemplatePending?: boolean;
};

export function TemplateEditorPage({
	controller,
	mode,
	templateId,
	templateName,
	onUseTemplate,
	useTemplatePending,
}: Props) {
	return (
		<TemplateEditorModeProvider mode={mode}>
			<PlacementWorkspaceProvider controller={controller}>
				<PlacementWorkspaceShell>
					<TemplateEditorHeader
						templateId={templateId}
						templateName={templateName}
						onUseTemplate={onUseTemplate}
						useTemplatePending={useTemplatePending}
					/>
					<PlacementWorkspaceRow>
						<PlacementWorkspaceSidebar>
							<TemplateEditorSidebar />
						</PlacementWorkspaceSidebar>
						<PlacementWorkspaceViewer />
						<TemplateContextRail />
					</PlacementWorkspaceRow>
					<TemplateEditorMobileToolbar />
				</PlacementWorkspaceShell>
			</PlacementWorkspaceProvider>
		</TemplateEditorModeProvider>
	);
}
