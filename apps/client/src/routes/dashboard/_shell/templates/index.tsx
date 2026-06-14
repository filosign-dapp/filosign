import { useFilosignContext } from "@filosign/react";
import { useEntitlements } from "@filosign/react/billing";
import { useDocumentsList } from "@filosign/react/documents";
import { canUseSharedTemplates } from "@filosign/react/files";
import {
	type OrgsTemplatesCloneOutput,
	useActiveOrgId,
	useCloneOrgTemplateToEnvelope,
	useCreateOrgTemplate,
	useDeleteOrgTemplate,
	useOrganizationGet,
} from "@filosign/react/orgs";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import {
	FileTextIcon,
	FolderOpenIcon,
	PlusIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { buildCreateForm, uploadedFromDataUrl } from "@/src/lib/domains/drafts";
import { PLAN_LIMIT_COPY } from "@/src/lib/domains/entitlements/plan-limit-copy";
import { ProFeatureMark } from "@/src/lib/domains/entitlements/pro-feature-mark";
import { UpgradePlanDialog } from "@/src/lib/domains/entitlements/upgrade-plan-dialog";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { TemplatesPageSkeleton } from "@/src/routes/dashboard/_shell/templates/-components/templates-page-skeleton";

export const Route = createFileRoute("/dashboard/_shell/templates/")({
	component: TemplatesIndexPage,
});

function TemplatesIndexPage() {
	const navigate = useNavigate();
	const activeOrgId = useActiveOrgId();
	const { rpc } = useFilosignContext();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);

	// Queries
	const { data: entitlements, isLoading: entitlementsLoading } =
		useEntitlements();
	const { data: orgDetail, isLoading: orgLoading } = useOrganizationGet(
		activeOrgId ?? undefined,
	);
	const { data: draftsData, isLoading: draftsLoading } = useDocumentsList({
		tab: "drafts",
	});

	// Mutations
	const cloneTemplate = useCloneOrgTemplateToEnvelope();
	const deleteTemplate = useDeleteOrgTemplate();
	const createTemplate = useCreateOrgTemplate();

	// Dialog & Alert State
	const [templatesUpgradeOpen, setTemplatesUpgradeOpen] = useState(true);
	const [createOpen, setCreateOpen] = useState(false);
	const [selectedDraftId, setSelectedDraftId] = useState("");
	const [newTemplateName, setNewTemplateName] = useState("");
	const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

	const templates = useMemo(() => orgDetail?.templates ?? [], [orgDetail]);
	const activeDrafts = useMemo(() => {
		return (draftsData?.items ?? []).filter((row) => row.kind === "draft");
	}, [draftsData]);

	const isTemplatesEnabled = canUseSharedTemplates(entitlements);

	// Handlers
	const handleUseTemplate = (templateId: string) => {
		const t = templates.find((x) => x.id === templateId);
		if (!t) return;

		toast.promise(cloneTemplate.mutateAsync({ templateId }), {
			loading: TOASTS.templates.cloning,
			success: (res: OrgsTemplatesCloneOutput) => {
				void (async () => {
					const docMeta = res.document;
					const signerEmails = res.placementManifest
						? [
								...new Set(
									res.placementManifest.fields.map((f) =>
										normalizePlacementRecipientEmail(f.assignedRecipientEmail),
									),
								),
							]
						: [];
					const draft = await buildCreateForm(
						{
							documents: [
								uploadedFromDataUrl(docMeta.dataUrl, {
									id: t.id,
									name: docMeta.name,
									type: "application/pdf",
								}),
							],
							recipients: signerEmails.map((email) => ({
								name: email,
								email,
								role: "signer" as const,
							})),
							emailMessage: "",
							emailSubject: "",
							settlementDrafts: [],
						},
						null,
					);
					setCreateForm(draft);
					void navigate({ to: "/dashboard/envelope/create/add-sign" });
				})().catch((e) => console.error("Use template error:", e));
				return TOASTS.templates.readyForUse;
			},
			error: TOASTS.templates.cloneFailed.title,
		});
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

	const handleCreateTemplate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedDraftId || !newTemplateName.trim()) {
			toastUser.error(TOASTS.templates.selectDraftAndName.title);
			return;
		}

		setIsCreatingTemplate(true);
		try {
			// Fetch full draft details to extract key wrap and snapshot
			const draftDetails = await rpc.drafts.get({ draftId: selectedDraftId });
			if (!draftDetails.documents || draftDetails.documents.length === 0) {
				throw new Error(
					"The selected draft has no PDF document. Please upload a file to the draft first.",
				);
			}
			if (!draftDetails.headDekWrappedOmk) {
				throw new Error(
					"This draft is not saved with encryption keys yet. Open it in the designer first.",
				);
			}

			const primaryDoc = draftDetails.documents[0];
			const placementManifest = {
				version: 1 as const,
				documents: [],
				fields: [],
			};

			await createTemplate.mutateAsync(
				{
					name: newTemplateName.trim(),
					s3Key: primaryDoc.s3Key,
					dekWrappedOmk: draftDetails.headDekWrappedOmk,
					placementManifest,
				},
				suppressGlobalErrorToast(),
			);

			toastUser.success(TOASTS.templates.created);
			setCreateOpen(false);
			setSelectedDraftId("");
			setNewTemplateName("");
		} catch (err) {
			showAppErrorToast(err);
		} finally {
			setIsCreatingTemplate(false);
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
							Reuse standard team documents for new envelopes.{" "}
							<DocsLink href={DOCS_LINKS.templates()}>
								Read the templates guide
							</DocsLink>
						</p>
					</div>
					<Button
						type="button"
						variant="primary"
						size="sm"
						className="gap-1.5"
						onClick={() => setCreateOpen(true)}
					>
						<PlusIcon className="size-4" weight="bold" />
						<span>New Template</span>
					</Button>
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
							description="Create reusable starting points for your team envelopes. Save an existing draft as a template to get started."
						>
							<Button
								type="button"
								variant="primary"
								className="gap-1.5"
								onClick={() => setCreateOpen(true)}
							>
								<PlusIcon className="size-4" weight="bold" />
								Create Template
							</Button>
						</AppEmptyState>
					) : (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{templates.map((t) => {
								const dateStr = new Date(t.createdAt).toLocaleDateString(
									undefined,
									{
										month: "short",
										day: "numeric",
										year: "numeric",
									},
								);
								return (
									<div
										key={t.id}
										className="group flex flex-col justify-between gap-4 rounded-xl border border-border/60 bg-linear-to-b from-card to-muted/15 p-4 shadow-xs transition hover:border-border hover:shadow-md"
									>
										<div className="flex items-start gap-3">
											<div className="size-9 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
												<FileTextIcon className="size-5" weight="duotone" />
											</div>
											<div className="min-w-0">
												<h3
													className="font-medium text-sm text-foreground truncate"
													title={t.name}
												>
													{t.name}
												</h3>
												<p className="text-xs text-muted-foreground mt-0.5">
													Created {dateStr}
												</p>
											</div>
										</div>
										<div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												disabled={
													deleteTemplate.isPending || cloneTemplate.isPending
												}
												onClick={() => setDeleteTargetId(t.id)}
												className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
											>
												<TrashIcon className="size-4" />
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												disabled={cloneTemplate.isPending}
												onClick={() => handleUseTemplate(t.id)}
												className="gap-1.5"
											>
												<FolderOpenIcon className="size-4" />
												<span>Use template</span>
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</motion.div>
			</div>

			{/* Create Dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Create template from draft</DialogTitle>
						<DialogDescription>
							Save one of your workspace drafts as a reusable shared template.
						</DialogDescription>
					</DialogHeader>
					<form
						onSubmit={(e) => void handleCreateTemplate(e)}
						className="space-y-4 pt-2"
					>
						<div className="space-y-2">
							<Label htmlFor="select-draft">Select Active Draft</Label>
							{draftsLoading ? (
								<div className="py-2 text-xs text-muted-foreground flex items-center gap-1.5">
									<InlineLoader size="sm" /> Loading drafts...
								</div>
							) : activeDrafts.length === 0 ? (
								<p className="text-xs text-warning bg-warning/10 border border-warning/20 px-3 py-2 rounded-md">
									No active drafts found. Please create a draft with a document
									first.
								</p>
							) : (
								<select
									id="select-draft"
									value={selectedDraftId}
									onChange={(e) => {
										const val = e.target.value;
										setSelectedDraftId(val);
										const d = activeDrafts.find((x) => x.id === val);
										if (d) setNewTemplateName(d.title);
									}}
									className="w-full bg-background border border-border/80 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
									required
								>
									<option value="">-- Choose a draft --</option>
									{activeDrafts.map((d) => (
										<option key={d.id} value={d.id}>
											{d.title} (Updated{" "}
											{new Date(d.updatedAt).toLocaleDateString()})
										</option>
									))}
								</select>
							)}
						</div>
						<div className="space-y-2">
							<Label htmlFor="template-name">Template Name</Label>
							<Input
								id="template-name"
								placeholder="E.g. NDAs, Standard Client Agreement"
								value={newTemplateName}
								onChange={(e) => setNewTemplateName(e.target.value)}
								required
								maxLength={120}
							/>
						</div>
						<DialogFooter className="pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setCreateOpen(false)}
								disabled={isCreatingTemplate}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								variant="primary"
								disabled={
									isCreatingTemplate ||
									!selectedDraftId ||
									!newTemplateName.trim()
								}
							>
								{isCreatingTemplate ? "Creating..." : "Create Template"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{/* Confirm Delete Alert */}
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
