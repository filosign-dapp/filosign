import { PlacementWorkspaceContextRail } from "@/src/lib/domains/placement/workspace-ui";
import { TemplateContextRailDesktopContent } from "./template-context-rail-content";

export function TemplateContextRail() {
	return (
		<PlacementWorkspaceContextRail>
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
				<TemplateContextRailDesktopContent />
			</div>
		</PlacementWorkspaceContextRail>
	);
}
