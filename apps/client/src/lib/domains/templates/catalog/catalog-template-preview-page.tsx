import {
	useCatalogGet,
	useInstallCatalogTemplate,
} from "@filosign/react/catalog";
import { useActiveOrganization } from "@filosign/react/orgs";
import type { SystemTemplateMeta } from "@filosign/shared";
import { resolveCatalogInstallName } from "@filosign/shared";
import { GearSixIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/src/lib/components/ui/sheet";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import {
	PlacementWorkspaceProvider,
	PlacementWorkspaceRow,
	PlacementWorkspaceShell,
	PlacementWorkspaceSidebar,
	PlacementWorkspaceViewer,
} from "@/src/lib/domains/placement";
import {
	CatalogMetaBlock,
	CatalogPreviewContextRail,
	CatalogPreviewHeader,
	useCatalogTemplatePreviewController,
	useCatalogTemplatePreviewHydrate,
} from "@/src/lib/domains/templates/catalog";
import { canManageTemplates } from "@/src/lib/domains/templates/template-composer";
import { TemplateEditorModeProvider } from "@/src/lib/domains/templates/template-editor-mode";
import { showAppErrorToast } from "@/src/lib/errors";
import { TemplateEditorSidebar } from "@/src/routes/dashboard/templates/-components/editor/sidebar";
import { TemplatePreviewContextRailContent } from "@/src/routes/dashboard/templates/-components/editor/template-preview-context-rail-content";

type Props = {
	systemTemplateId: string;
};

function CatalogPreviewMobileToolbar({
	meta,
	catalogVersionLabel,
	newerVersionAvailable,
}: {
	meta: SystemTemplateMeta;
	catalogVersionLabel: string;
	newerVersionAvailable: boolean;
}) {
	const [sheetOpen, setSheetOpen] = useState(false);

	return (
		<div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-4 z-50 lg:hidden">
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetTrigger
					render={
						<Button
							type="button"
							variant="outline"
							size="icon-lg"
							className="rounded-full shadow-lg"
							aria-label="Template details"
						/>
					}
				>
					<GearSixIcon className="size-5" weight="bold" />
				</SheetTrigger>
				<SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
					<SheetHeader>
						<SheetTitle>Template details</SheetTitle>
					</SheetHeader>
					<div className="mt-4 space-y-4">
						<CatalogMetaBlock
							meta={meta}
							catalogVersionLabel={catalogVersionLabel}
							newerVersionAvailable={newerVersionAvailable}
						/>
						<TemplatePreviewContextRailContent />
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}

export function CatalogTemplatePreviewPage({ systemTemplateId }: Props) {
	const activeOrg = useActiveOrganization();
	const {
		data: catalogData,
		isLoading: catalogLoading,
		isError: catalogError,
	} = useCatalogGet({ systemTemplateId });
	const { catalogPreviewLoadState } = useCatalogTemplatePreviewHydrate({
		systemTemplateId,
	});
	const controller = useCatalogTemplatePreviewController({
		catalogPreviewLoadState,
	});
	const { installCatalogTemplateToWorkspace, isInstalling } =
		useInstallCatalogTemplate();

	const template = catalogData?.template;
	const canManage = canManageTemplates(activeOrg?.role);
	const previewLoading =
		catalogLoading || catalogPreviewLoadState === "loading";

	const handleAddToWorkspace = async () => {
		if (!template || !canManage || template.alreadyInstalledInWorkspace) return;
		const defaultName = resolveCatalogInstallName({
			name: template.name,
			catalogVersionLabel: template.catalogVersionLabel,
			appendVersionLabel: template.newerVersionAvailable,
		});
		try {
			await installCatalogTemplateToWorkspace({
				systemTemplateId: template.id,
				name: defaultName,
			});
			toastUser.success(TOASTS.templates.catalogInstalled);
		} catch (err) {
			showAppErrorToast(err);
		}
	};

	if (catalogError) {
		return (
			<div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
				<p className="text-sm text-muted-foreground">
					This Library template could not be loaded.
				</p>
				<Button
					type="button"
					variant="outline"
					render={
						<Link to="/dashboard/templates" search={{ tab: "library" }} />
					}
				>
					Back to Library
				</Button>
			</div>
		);
	}

	if (previewLoading || !template) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center px-6">
				<p className="text-sm text-muted-foreground">Loading preview…</p>
			</div>
		);
	}

	return (
		<TemplateEditorModeProvider mode="preview">
			<PlacementWorkspaceProvider controller={controller}>
				<PlacementWorkspaceShell>
					<CatalogPreviewHeader
						templateName={template.name}
						catalogVersionLabel={template.catalogVersionLabel}
						category={template.meta.category}
						newerVersionAvailable={template.newerVersionAvailable}
						alreadyInstalledInWorkspace={template.alreadyInstalledInWorkspace}
						canManage={canManage}
						onAddToWorkspace={() => void handleAddToWorkspace()}
						addPending={isInstalling(systemTemplateId)}
					/>
					<PlacementWorkspaceRow>
						<PlacementWorkspaceSidebar>
							<TemplateEditorSidebar />
						</PlacementWorkspaceSidebar>
						<PlacementWorkspaceViewer />
						<CatalogPreviewContextRail
							meta={template.meta}
							catalogVersionLabel={template.catalogVersionLabel}
							newerVersionAvailable={template.newerVersionAvailable}
						/>
					</PlacementWorkspaceRow>
					<CatalogPreviewMobileToolbar
						meta={template.meta}
						catalogVersionLabel={template.catalogVersionLabel}
						newerVersionAvailable={template.newerVersionAvailable}
					/>
				</PlacementWorkspaceShell>
			</PlacementWorkspaceProvider>
		</TemplateEditorModeProvider>
	);
}
