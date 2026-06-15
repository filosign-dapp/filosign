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
import { createTemplateRoleId } from "@filosign/shared";
import {
	FileTextIcon,
	FolderOpenIcon,
	PencilSimpleIcon,
	PlusIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { Button } from "@/src/lib/components/ui/button";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { buildCreateForm } from "@/src/lib/domains/drafts";
import { PLAN_LIMIT_COPY } from "@/src/lib/domains/entitlements/plan-limit-copy";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import { UpgradePlanDialog } from "@/src/lib/domains/entitlements/upgrade-plan-dialog";
import {
	canManageTemplates,
	canUseTemplates,
	hydrateCreateFormFromTemplate,
	templateRoleEmail,
} from "@/src/lib/domains/templates/template-composer";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { TemplateDetailSheet } from "@/src/routes/dashboard/_shell/templates/-components/template-detail-sheet";
import { TemplateRoleAssignmentDialog } from "@/src/routes/dashboard/_shell/templates/-components/template-role-assignment-dialog";
import { TemplatesPageSkeleton } from "@/src/routes/dashboard/_shell/templates/-components/templates-page-skeleton";

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
	const manageTemplates = canManageTemplates(activeOrg?.role);
	const useTemplates = canUseTemplates(activeOrg?.role);
	const isTemplatesEnabled = canUseSharedTemplates(entitlements);

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
						email: templateRoleEmail(roleId),
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
			<div className="flex min-h-0 flex-1 flex-col">
				<motion.div
					className="flex items-center justify-between px-8 py-4 border-b border-border/40"
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2 }}
				>
					<div className="space-y-0.5">
						<h2 className="inline-flex items-center gap-2 text-lg font-medium text-foreground">
							Shared Templates
							<ProFeatureMark size="xs" />
						</h2>
						<p className="text-xs text-muted-foreground hidden sm:block">
							Reusable team blueprints with roles and field placement.{" "}
							<DocsLink href={DOCS_LINKS.templates()}>
								Read the templates guide
							</DocsLink>
						</p>
					</div>
					{manageTemplates ? (
						<Button
							type="button"
							variant="primary"
							size="sm"
							className="gap-1.5"
							onClick={() => uploadInputRef.current?.click()}
						>
							<PlusIcon className="size-4" weight="bold" />
							<span>New Template</span>
						</Button>
					) : null}
				</motion.div>

				<motion.div
					className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8 space-y-6"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2, delay: 0.1 }}
				>
					{templates.length === 0 ? (
						<AppEmptyState
							preset="page"
							icon={FileTextIcon}
							title="No templates found"
							description="Upload PDFs, define roles, place fields once, and let the team reuse the blueprint for every new envelope."
						>
							{manageTemplates ? (
								<Button
									type="button"
									variant="primary"
									className="gap-1.5"
									onClick={() => uploadInputRef.current?.click()}
								>
									<PlusIcon className="size-4" weight="bold" />
									Create Template
								</Button>
							) : null}
						</AppEmptyState>
					) : (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{templates.map((template) => {
								const dateStr = new Date(template.updatedAt).toLocaleDateString(
									undefined,
									{
										month: "short",
										day: "numeric",
										year: "numeric",
									},
								);
								return (
									<div
										key={template.id}
										className="group flex flex-col justify-between gap-4 rounded-xl border border-border/60 bg-linear-to-b from-card to-muted/15 p-4 shadow-xs transition hover:border-border hover:shadow-md"
									>
										<div className="flex items-start gap-3">
											<div className="size-9 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
												<FileTextIcon className="size-5" weight="duotone" />
											</div>
											<div className="min-w-0">
												<button
													type="button"
													className="font-medium text-sm text-foreground truncate text-left hover:underline"
													title={template.name}
													onClick={() => setDetailTemplateId(template.id)}
												>
													{template.name}
												</button>
												<p className="text-xs text-muted-foreground mt-0.5">
													Updated {dateStr}
												</p>
												<p className="text-xs text-muted-foreground mt-1">
													{template.roleCount} roles · {template.fieldCount}{" "}
													fields · {template.docCount} docs
												</p>
											</div>
										</div>
										<div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
											{manageTemplates ? (
												<>
													<Button
														type="button"
														variant="ghost"
														size="icon-sm"
														disabled={
															deleteTemplate.isPending ||
															cloneTemplate.isPending
														}
														onClick={() => setDeleteTargetId(template.id)}
														className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
													>
														<TrashIcon className="size-4" />
													</Button>
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() =>
															void navigate({
																to: "/dashboard/templates/$templateId/edit",
																params: { templateId: template.id },
															})
														}
														className="gap-1.5"
													>
														<PencilSimpleIcon className="size-4" />
														<span>Edit</span>
													</Button>
												</>
											) : null}
											{useTemplates ? (
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={cloneTemplate.isPending}
													onClick={() => handleUseTemplate(template.id)}
													className="gap-1.5"
												>
													<FolderOpenIcon className="size-4" />
													<span>Use template</span>
												</Button>
											) : null}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</motion.div>
			</div>

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
