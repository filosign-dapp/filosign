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
import { TemplateRenameDialog } from "@/src/lib/domains/templates/template-rename-dialog";
import type { TemplateEditorController } from "@/src/lib/domains/templates/use-template-editor-controller";
import { useTemplateRename } from "@/src/lib/domains/templates/use-template-rename";
import { TemplateEditorHeader } from "./header";
import { TemplateEditorMobileToolbar } from "./mobile-toolbar";
import { TemplateEditorSidebar } from "./sidebar";
import { TemplateContextRail } from "./template-context-rail";

type Props = {
	controller: TemplateEditorController;
	mode: TemplateEditorMode;
	templateId: string;
	templateName: string;
	canManage?: boolean;
	onUseTemplate?: () => void;
	useTemplatePending?: boolean;
	previewRailPrefix?: React.ReactNode;
	systemTemplateMeta?: {
		category?: string;
		documentVersion?: string;
		tags?: string[];
	};
};

export function TemplateEditorPage({
	controller,
	mode,
	templateId,
	templateName,
	canManage = false,
	onUseTemplate,
	useTemplatePending,
	previewRailPrefix,
	systemTemplateMeta,
}: Props) {
	const renameEnabled = canManage && !systemTemplateMeta;
	const {
		displayName,
		renameOpen,
		closeRename,
		requestRename,
		confirmRename,
		renamePending,
	} = useTemplateRename({
		templateId,
		templateName,
	});

	return (
		<TemplateEditorModeProvider mode={mode}>
			<PlacementWorkspaceProvider controller={controller}>
				<PlacementWorkspaceShell>
					<TemplateEditorHeader
						templateId={templateId}
						templateName={displayName}
						canManage={renameEnabled}
						onRename={renameEnabled ? requestRename : undefined}
						onUseTemplate={onUseTemplate}
						useTemplatePending={useTemplatePending}
						systemTemplateMeta={systemTemplateMeta}
					/>
					<PlacementWorkspaceRow>
						<PlacementWorkspaceSidebar>
							<TemplateEditorSidebar />
						</PlacementWorkspaceSidebar>
						<PlacementWorkspaceViewer />
						<TemplateContextRail previewRailPrefix={previewRailPrefix} />
					</PlacementWorkspaceRow>
					<TemplateEditorMobileToolbar previewRailPrefix={previewRailPrefix} />
				</PlacementWorkspaceShell>
				{renameEnabled ? (
					<TemplateRenameDialog
						open={renameOpen}
						onOpenChange={closeRename}
						defaultName={displayName}
						onConfirm={confirmRename}
						pending={renamePending}
					/>
				) : null}
			</PlacementWorkspaceProvider>
		</TemplateEditorModeProvider>
	);
}
