import type { SystemTemplateMeta } from "@filosign/shared";
import { PlacementWorkspaceContextRail } from "@/src/lib/domains/placement";
import { TemplatePreviewContextRailContent } from "@/src/routes/dashboard/templates/-components/editor/template-preview-context-rail-content";
import { CatalogMetaBlock } from "./catalog-meta-block";

type Props = {
	meta: SystemTemplateMeta;
	catalogVersionLabel: string;
	newerVersionAvailable: boolean;
};

export function CatalogPreviewContextRail({
	meta,
	catalogVersionLabel,
	newerVersionAvailable,
}: Props) {
	return (
		<PlacementWorkspaceContextRail>
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
				<div className="mb-6">
					<CatalogMetaBlock
						meta={meta}
						catalogVersionLabel={catalogVersionLabel}
						newerVersionAvailable={newerVersionAvailable}
					/>
				</div>
				<TemplatePreviewContextRailContent />
			</div>
		</PlacementWorkspaceContextRail>
	);
}

export { CatalogMetaBlock } from "./catalog-meta-block";
