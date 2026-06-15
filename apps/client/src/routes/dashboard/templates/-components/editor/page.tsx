import {
	PlacementWorkspaceProvider,
	PlacementWorkspaceRow,
	PlacementWorkspaceShell,
	PlacementWorkspaceSidebar,
	PlacementWorkspaceThumbnails,
	PlacementWorkspaceViewer,
} from "@/src/lib/domains/placement";
import type { TemplateEditorController } from "@/src/lib/domains/templates/use-template-editor-controller";
import { TemplateEditorHeader } from "./header";
import { TemplateEditorMobileToolbar } from "./mobile-toolbar";
import { TemplateEditorSidebar } from "./sidebar";

type Props = {
	controller: TemplateEditorController;
	mode: "create" | "edit";
	templateId: string;
	templateName: string;
};

export function TemplateEditorPage({
	controller,
	mode,
	templateId,
	templateName,
}: Props) {
	return (
		<PlacementWorkspaceProvider controller={controller}>
			<PlacementWorkspaceShell>
				<TemplateEditorHeader
					mode={mode}
					templateId={templateId}
					templateName={templateName}
				/>
				<PlacementWorkspaceRow>
					<PlacementWorkspaceSidebar>
						<TemplateEditorSidebar />
					</PlacementWorkspaceSidebar>
					<PlacementWorkspaceViewer />
					<PlacementWorkspaceThumbnails />
				</PlacementWorkspaceRow>
				<TemplateEditorMobileToolbar />
			</PlacementWorkspaceShell>
		</PlacementWorkspaceProvider>
	);
}
