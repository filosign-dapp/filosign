import { PlacementWorkspaceContextRail } from "@/src/lib/domains/placement/workspace-ui";
import {
	isTemplatePreviewMode,
	useTemplateEditorMode,
} from "@/src/lib/domains/templates/template-editor-mode";
import { TemplateContextRailDesktopContent } from "./template-context-rail-content";
import { TemplatePreviewContextRailContent } from "./template-preview-context-rail-content";

export function TemplateContextRail() {
	const mode = useTemplateEditorMode();

	return (
		<PlacementWorkspaceContextRail>
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
				{isTemplatePreviewMode(mode) ? (
					<TemplatePreviewContextRailContent />
				) : (
					<TemplateContextRailDesktopContent />
				)}
			</div>
		</PlacementWorkspaceContextRail>
	);
}
