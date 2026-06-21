import { MotionReveal } from "@filosign/motion";
import { useEntitlements } from "@filosign/react/billing";
import { canUseSharedTemplates } from "@filosign/react/files";
import {
	useActiveOrganization,
	useActiveOrgId,
	useDeleteOrgTemplate,
	useOrganizationGet,
} from "@filosign/react/orgs";
import { FileTextIcon } from "@phosphor-icons/react";
import {
	createFileRoute,
	getRouteApi,
	useNavigate,
} from "@tanstack/react-router";
import { useRef, useState } from "react";
import { z } from "zod";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { Button } from "@/src/lib/components/ui/button";
import { Tabs } from "@/src/lib/components/ui/tabs";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { PLAN_LIMIT_COPY } from "@/src/lib/domains/entitlements/plan-limit-copy";
import { UpgradePlanDialog } from "@/src/lib/domains/entitlements/upgrade-plan-dialog";
import { useBootstrapTemplateFromPdfUpload } from "@/src/lib/domains/templates/hooks/use-bootstrap-template-from-pdf";
import {
	canManageTemplates,
	canUseTemplates,
} from "@/src/lib/domains/templates/template-composer";
import { useTemplateUseFlow } from "@/src/lib/domains/templates/use-template-use-flow";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { TemplatesContent } from "@/src/routes/dashboard/_shell/templates/-components/templates-content";
import { TemplatesLibraryContent } from "@/src/routes/dashboard/_shell/templates/-components/templates-library-content";
import { TemplatesPageSkeleton } from "@/src/routes/dashboard/_shell/templates/-components/templates-page-skeleton";
import { TemplatesPageToolbar } from "@/src/routes/dashboard/_shell/templates/-components/templates-page-toolbar";
import { useTemplatesListController } from "@/src/routes/dashboard/_shell/templates/-lib/hooks/use-templates-list-controller";
import {
	parseTemplatesTab,
	type TemplatesTab,
} from "@/src/routes/dashboard/_shell/templates/-lib/templates-tab";

const templatesRouteSearchSchema = z.object({
	tab: z.enum(["yours", "library"]).optional(),
});

const templatesRouteApi = getRouteApi("/dashboard/_shell/templates/");

export const Route = createFileRoute("/dashboard/_shell/templates/")({
	validateSearch: templatesRouteSearchSchema,
	component: TemplatesIndexPage,
});

function TemplatesIndexPage() {
	const navigate = useNavigate();
	const { tab: tabSearch } = templatesRouteApi.useSearch();
	const activeTab: TemplatesTab = parseTemplatesTab(tabSearch ?? "") ?? "yours";
	const activeOrgId = useActiveOrgId();
	const activeOrg = useActiveOrganization();
	const uploadInputRef = useRef<HTMLInputElement>(null);
	const { bootstrapFromPdfFiles } = useBootstrapTemplateFromPdfUpload();

	const { data: entitlements, isLoading: entitlementsLoading } =
		useEntitlements();
	const { data: orgDetail, isLoading: orgLoading } = useOrganizationGet(
		activeOrgId ?? undefined,
	);

	const deleteTemplate = useDeleteOrgTemplate();
	const { startUseTemplate, clonePending } = useTemplateUseFlow();

	const [templatesUpgradeOpen, setTemplatesUpgradeOpen] = useState(true);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

	const setActiveTab = (tab: TemplatesTab) => {
		setSearchInput("");
		void navigate({
			to: "/dashboard/templates",
			search: tab === "yours" ? {} : { tab },
			replace: true,
		});
	};

	const templates = orgDetail?.templates ?? [];
	const { searchInput, setSearchInput, filteredTemplates, hasSearchQuery } =
		useTemplatesListController(templates);

	const manageTemplates = canManageTemplates(activeOrg?.role);
	const useTemplates = canUseTemplates(activeOrg?.role);
	const isTemplatesEnabled = canUseSharedTemplates(entitlements);
	const actionsBusy = clonePending || deleteTemplate.isPending;

	const handleUploadTemplatePdf = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (files.length === 0) return;

		const templateId = crypto.randomUUID();
		await bootstrapFromPdfFiles({
			files,
			templateId,
			navigateTo: { to: "/dashboard/templates/new" },
			templateContext: { templateId, mode: "create" },
		});
	};

	const handleOpenTemplate = (templateId: string) => {
		void navigate({
			to: "/dashboard/templates/$templateId",
			params: { templateId },
		});
	};

	const handleUseTemplate = (templateId: string) => {
		const template = templates.find((row) => row.id === templateId);
		if (!template) return;
		startUseTemplate(templateId, template.name);
	};

	const handleDeleteTemplate = async () => {
		if (!deleteTargetId) return;
		try {
			await deleteTemplate.mutateAsync(
				{ templateId: deleteTargetId },
				suppressGlobalErrorToast(),
			);
			toastUser.success(TOASTS.templates.deleted);
		} catch (err) {
			showAppErrorToast(err);
		} finally {
			setDeleteTargetId(null);
		}
	};

	if (entitlementsLoading || orgLoading) {
		return <TemplatesPageSkeleton />;
	}

	if (!isTemplatesEnabled) {
		const upgradeCopy = PLAN_LIMIT_COPY["features.shared_templates"];

		return (
			<div className="flex min-h-0 flex-1 flex-col bg-background @container">
				<MotionReveal
					preset="smooth"
					delay={0.2}
					className="flex min-h-0 flex-1 flex-col"
				>
					<AppEmptyState
						preset="page"
						icon={FileTextIcon}
						title={upgradeCopy.title}
						description={upgradeCopy.description}
					>
						<Button
							type="button"
							variant="primary"
							onClick={() => setTemplatesUpgradeOpen(true)}
						>
							Upgrade plan
						</Button>
					</AppEmptyState>
				</MotionReveal>

				<UpgradePlanDialog
					open={templatesUpgradeOpen}
					onOpenChange={setTemplatesUpgradeOpen}
					reason="features.shared_templates"
				/>
			</div>
		);
	}

	return (
		<Tabs
			value={activeTab}
			onValueChange={(val) => {
				const tab = parseTemplatesTab(val);
				if (tab) setActiveTab(tab);
			}}
			className="flex min-h-0 flex-1 flex-col bg-background @container"
		>
			<input
				ref={uploadInputRef}
				type="file"
				accept="application/pdf"
				multiple
				className="hidden"
				onChange={(event) => void handleUploadTemplatePdf(event)}
			/>
			<TemplatesPageToolbar
				searchInput={searchInput}
				onSearchChange={setSearchInput}
				canManage={manageTemplates}
				onNewTemplate={() => uploadInputRef.current?.click()}
				activeTab={activeTab}
			/>
			{activeTab === "library" ? (
				<TemplatesLibraryContent searchQuery={searchInput} />
			) : (
				<TemplatesContent
					templates={filteredTemplates}
					hasAnyTemplates={templates.length > 0}
					hasSearchQuery={hasSearchQuery}
					canManage={manageTemplates}
					canUse={useTemplates}
					actionsBusy={actionsBusy}
					onClearSearch={() => setSearchInput("")}
					onOpenTemplate={handleOpenTemplate}
					onUseTemplate={handleUseTemplate}
					onEditTemplate={(templateId) =>
						void navigate({
							to: "/dashboard/templates/$templateId/edit",
							params: { templateId },
						})
					}
					onDeleteTemplate={setDeleteTargetId}
					onCreateTemplate={() => uploadInputRef.current?.click()}
				/>
			)}

			<ConfirmAlertDialog
				open={deleteTargetId !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteTargetId(null);
				}}
				title="Delete template?"
				description="This removes the template for all workspace members. You cannot undo this action."
				confirmLabel="Delete Template"
				destructive
				pending={deleteTemplate.isPending}
				onConfirm={() => void handleDeleteTemplate()}
			/>
		</Tabs>
	);
}
