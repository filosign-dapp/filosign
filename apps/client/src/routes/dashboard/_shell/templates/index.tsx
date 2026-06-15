import { MotionReveal } from "@filosign/motion";
import { useFilosignContext } from "@filosign/react";
import { useEntitlements } from "@filosign/react/billing";
import { canUseSharedTemplates } from "@filosign/react/files";
import {
	type OrgsTemplatesCloneOutput,
	useActiveOrganization,
	useActiveOrgId,
	useCloneOrgTemplateToEnvelope,
	useDeleteOrgTemplate,
	useOrganizationGet,
} from "@filosign/react/orgs";
import {
	fetchCloneTemplatePayload,
	walletAccountAddress,
} from "@filosign/react/utils";
import {
	createTemplateRoleId,
	TEMPLATE_LIMITS,
	templateRolePlaceholderEmail,
} from "@filosign/shared";
import { FileTextIcon } from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { Button } from "@/src/lib/components/ui/button";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { buildCreateForm } from "@/src/lib/domains/drafts";
import { PLAN_LIMIT_COPY } from "@/src/lib/domains/entitlements/plan-limit-copy";
import { UpgradePlanDialog } from "@/src/lib/domains/entitlements/upgrade-plan-dialog";
import {
	canManageTemplates,
	canUseTemplates,
	hydrateCreateFormFromTemplate,
} from "@/src/lib/domains/templates/template-composer";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { TemplateDetailSheet } from "@/src/routes/dashboard/_shell/templates/-components/template-detail-sheet";
import { TemplateRoleAssignmentDialog } from "@/src/routes/dashboard/_shell/templates/-components/template-role-assignment-dialog";
import { TemplatesContent } from "@/src/routes/dashboard/_shell/templates/-components/templates-content";
import { TemplatesPageSkeleton } from "@/src/routes/dashboard/_shell/templates/-components/templates-page-skeleton";
import { TemplatesPageToolbar } from "@/src/routes/dashboard/_shell/templates/-components/templates-page-toolbar";
import { useTemplatesListController } from "@/src/routes/dashboard/_shell/templates/-lib/hooks/use-templates-list-controller";

export const Route = createFileRoute("/dashboard/_shell/templates/")({
	component: TemplatesIndexPage,
});

function TemplatesIndexPage() {
	const navigate = useNavigate();
	const activeOrgId = useActiveOrgId();
	const activeOrg = useActiveOrganization();
	const { rpcQuery, wallet } = useFilosignContext();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const uploadInputRef = useRef<HTMLInputElement>(null);

	const { data: entitlements, isLoading: entitlementsLoading } =
		useEntitlements();
	const { data: orgDetail, isLoading: orgLoading } = useOrganizationGet(
		activeOrgId ?? undefined,
	);

	const cloneTemplate = useCloneOrgTemplateToEnvelope();
	const deleteTemplate = useDeleteOrgTemplate();

	const [templatesUpgradeOpen, setTemplatesUpgradeOpen] = useState(true);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
	const [detailTemplateId, setDetailTemplateId] = useState<string | null>(null);
	const [roleAssignment, setRoleAssignment] = useState<{
		templateId: string;
		templateName: string;
		clone: OrgsTemplatesCloneOutput;
	} | null>(null);

	const templates = useMemo(() => orgDetail?.templates ?? [], [orgDetail]);
	const { searchInput, setSearchInput, filteredTemplates, hasSearchQuery } =
		useTemplatesListController(templates);

	const manageTemplates = canManageTemplates(activeOrg?.role);
	const useTemplates = canUseTemplates(activeOrg?.role);
	const isTemplatesEnabled = canUseSharedTemplates(entitlements);
	const actionsBusy = cloneTemplate.isPending || deleteTemplate.isPending;

	const handleUploadTemplatePdf = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (files.length === 0) return;

		const invalid = files.find((file) => file.type !== "application/pdf");
		if (invalid) {
			toastUser.error("Upload PDF files only.");
			return;
		}

		if (files.length > TEMPLATE_LIMITS.MAX_TEMPLATE_DOCUMENTS) {
			toastUser.error(
				`You can upload a maximum of ${TEMPLATE_LIMITS.MAX_TEMPLATE_DOCUMENTS} documents.`,
			);
			return;
		}

		const oversized = files.filter(
			(file) => file.size > TEMPLATE_LIMITS.MAX_FILE_SIZE,
		);
		if (oversized.length > 0) {
			toastUser.error(
				`Documents exceed the maximum file size of ${TEMPLATE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB: ${oversized.map((f) => f.name).join(", ")}`,
			);
			return;
		}

		const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
		if (totalBytes > TEMPLATE_LIMITS.MAX_TEMPLATE_TOTAL_BYTES) {
			toastUser.error(
				`Total size of documents exceeds the limit of ${TEMPLATE_LIMITS.MAX_TEMPLATE_TOTAL_BYTES / (1024 * 1024)}MB.`,
			);
			return;
		}

		const roleId = createTemplateRoleId();
		const defaultName = files[0].name.replace(/\.pdf$/i, "");
		const draft = await buildCreateForm(
			{
				documents: files.map((file) => ({
					id: crypto.randomUUID(),
					file,
					name: file.name,
					size: file.size,
					type: file.type,
				})),
				recipients: [
					{
						clientRowId: roleId,
						name: "Signer 1",
						email: templateRolePlaceholderEmail(roleId),
						role: "signer",
					},
				],
				emailMessage: "",
				emailSubject: defaultName,
				settlementDrafts: [],
			},
			null,
		);
		setCreateForm(draft);
		void navigate({
			to: "/dashboard/templates/new",
			search: { templateName: defaultName },
		});
	};

	const handleUseTemplate = (templateId: string) => {
		const template = templates.find((row) => row.id === templateId);
		if (!template) return;

		toast.promise(cloneTemplate.mutateAsync({ templateId }), {
			loading: TOASTS.templates.cloning,
			success: (clone) => {
				setRoleAssignment({
					templateId,
					templateName: template.name,
					clone,
				});
				return TOASTS.templates.readyForUse;
			},
			error: TOASTS.templates.cloneFailed.title,
		});
	};

	const handleConfirmRoleAssignment = async (
		assignments: Record<string, { name: string; email: string }>,
	) => {
		if (!roleAssignment || !wallet?.account || !activeOrgId) return;
		try {
			const walletAddress = walletAccountAddress(wallet.account);
			const myWrap = await rpcQuery.orgs.keys.wrapForMine.call({
				organizationId: activeOrgId,
			});
			const payload = await fetchCloneTemplatePayload({
				templateId: roleAssignment.clone.templateId,
				headDekWrappedOmk: roleAssignment.clone.headDekWrappedOmk,
				headOmkKemCiphertext: roleAssignment.clone.headOmkKemCiphertext,
				snapshotJson: roleAssignment.clone.snapshotJson,
				wallet: walletAddress,
				myOrgWrap: myWrap,
				documents: roleAssignment.clone.documents,
			});
			const draft = await hydrateCreateFormFromTemplate({
				snapshot: payload.snapshotJson,
				documents: payload.documents,
				assignments,
			});
			setCreateForm(draft);
			setRoleAssignment(null);
			void navigate({ to: "/dashboard/envelope/create/add-sign" });
		} catch (err) {
			showAppErrorToast(err);
		}
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
		<div className="flex min-h-0 flex-1 flex-col bg-background @container">
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
			/>
			<TemplatesContent
				templates={filteredTemplates}
				hasAnyTemplates={templates.length > 0}
				hasSearchQuery={hasSearchQuery}
				canManage={manageTemplates}
				canUse={useTemplates}
				actionsBusy={actionsBusy}
				onClearSearch={() => setSearchInput("")}
				onOpenTemplate={setDetailTemplateId}
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

			<TemplateDetailSheet
				templateId={detailTemplateId}
				open={detailTemplateId !== null}
				onOpenChange={(open) => {
					if (!open) setDetailTemplateId(null);
				}}
			/>

			{roleAssignment ? (
				<TemplateRoleAssignmentDialog
					open
					onOpenChange={(open) => {
						if (!open) setRoleAssignment(null);
					}}
					templateName={roleAssignment.templateName}
					snapshot={roleAssignment.clone.snapshotJson}
					docCount={roleAssignment.clone.documents.length}
					fieldCount={roleAssignment.clone.snapshotJson.fields.length}
					pending={cloneTemplate.isPending}
					onConfirm={handleConfirmRoleAssignment}
				/>
			) : null}

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
		</div>
	);
}
