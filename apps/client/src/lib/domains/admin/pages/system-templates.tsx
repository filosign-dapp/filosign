import { useFilosignContext } from "@filosign/react";
import { PlusIcon } from "@phosphor-icons/react";
import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/src/lib/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/src/lib/components/ui/tabs";
import { toastUser } from "@/src/lib/copy/toast";
import { AdminListPage } from "@/src/lib/domains/admin/admin-list-page";
import { AdminListPageChrome } from "@/src/lib/domains/admin/admin-list-page-chrome";
import { AdminDataTable } from "@/src/lib/domains/admin/data-table";
import type { AdminTableStatus } from "@/src/lib/domains/admin/hooks/derive-table-status";
import { useBootstrapTemplateFromPdfUpload } from "@/src/lib/domains/templates/hooks/use-bootstrap-template-from-pdf";
import {
	templatesTableCellClass,
	templatesTableHeadClass,
	templatesTableRowClass,
} from "@/src/lib/domains/templates/utils/templates-table-styles";
import { showAppErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils";

type SystemTemplateStatusFilter = "all" | "draft" | "published" | "archived";
type ConfirmAction = "publish" | "archive" | "delete";

export function AdminSystemTemplatesPage() {
	const navigate = useNavigate();
	const { rpc, rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const uploadInputRef = useRef<HTMLInputElement>(null);
	const clearCreateForm = useStorePersist((s) => s.clearCreateForm);
	const { bootstrapFromPdfFiles } = useBootstrapTemplateFromPdfUpload();
	const [statusFilter, setStatusFilter] =
		useState<SystemTemplateStatusFilter>("all");
	const [confirmTarget, setConfirmTarget] = useState<{
		id: string;
		action: ConfirmAction;
	} | null>(null);

	const listQuery = useQuery({
		...rpcQuery.platformAdmin.systemTemplates.list.queryOptions({
			input: undefined,
		}),
		placeholderData: keepPreviousData,
	});

	const publishMutation = useMutation({
		mutationFn: (systemTemplateId: string) =>
			rpc.platformAdmin.systemTemplates.publish({ systemTemplateId }),
		onSuccess: () => {
			toastUser.success("System template published.");
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.systemTemplates.list.key(),
			});
		},
		onError: showAppErrorToast,
	});

	const archiveMutation = useMutation({
		mutationFn: (systemTemplateId: string) =>
			rpc.platformAdmin.systemTemplates.archive({ systemTemplateId }),
		onSuccess: () => {
			toastUser.success("System template archived.");
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.systemTemplates.list.key(),
			});
		},
		onError: showAppErrorToast,
	});

	const deleteMutation = useMutation({
		mutationFn: (systemTemplateId: string) =>
			rpc.platformAdmin.systemTemplates.delete({ systemTemplateId }),
		onSuccess: () => {
			toastUser.success("System template deleted.");
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.systemTemplates.list.key(),
			});
		},
		onError: showAppErrorToast,
	});

	const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);
		event.target.value = "";
		if (files.length === 0) return;

		const systemTemplateId = crypto.randomUUID();
		clearCreateForm();
		await bootstrapFromPdfFiles({
			files,
			templateId: systemTemplateId,
			navigateTo: { to: "/admin/system-templates/new" },
			templateContext: {
				templateId: systemTemplateId,
				systemTemplateId,
				mode: "system-create",
			},
		});
	};

	const handleConfirmAction = async () => {
		if (!confirmTarget) return;
		const { id, action } = confirmTarget;
		try {
			if (action === "publish") {
				await publishMutation.mutateAsync(id);
			} else if (action === "archive") {
				await archiveMutation.mutateAsync(id);
			} else {
				await deleteMutation.mutateAsync(id);
			}
		} finally {
			setConfirmTarget(null);
		}
	};

	const templates = useMemo(() => {
		const rows = listQuery.data?.templates ?? [];
		if (statusFilter === "all") return rows;
		return rows.filter((template) => template.status === statusFilter);
	}, [listQuery.data?.templates, statusFilter]);

	const tableStatus: AdminTableStatus = (() => {
		if (listQuery.isPending && !listQuery.data) return "loading";
		if (listQuery.isError) return "error";
		if (templates.length === 0) return "empty";
		return "ready";
	})();

	return (
		<AdminListPage>
			<AdminListPageChrome
				title="System templates"
				description="Manage Filosign catalog templates for workspace installs."
				actions={
					<Button
						type="button"
						variant="primary"
						size="sm"
						className="gap-2"
						onClick={() => uploadInputRef.current?.click()}
					>
						<PlusIcon className="size-4" weight="bold" />
						New system template
					</Button>
				}
			>
				<Tabs
					value={statusFilter}
					onValueChange={(value) =>
						setStatusFilter(value as SystemTemplateStatusFilter)
					}
				>
					<TabsList variant="line" className="h-10 w-full justify-start">
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="draft">Draft</TabsTrigger>
						<TabsTrigger value="published">Published</TabsTrigger>
						<TabsTrigger value="archived">Archived</TabsTrigger>
					</TabsList>
				</Tabs>
			</AdminListPageChrome>

			<input
				ref={uploadInputRef}
				type="file"
				accept="application/pdf"
				multiple
				className="hidden"
				onChange={(event) => void handleUpload(event)}
			/>

			<AdminListPage.Body>
				<AdminDataTable
					status={tableStatus}
					isFetching={listQuery.isFetching}
					emptyTitle={
						statusFilter === "all"
							? "No system templates"
							: `No ${statusFilter} system templates`
					}
					emptyDescription="Upload a PDF and place fields to create the first catalog entry."
				>
					<Table>
						<TableHeader className="border-b border-border/60 bg-muted/15 [&_tr]:border-0">
							<TableRow className="hover:bg-transparent">
								<TableHead className={templatesTableHeadClass}>Name</TableHead>
								<TableHead className={templatesTableHeadClass}>
									Status
								</TableHead>
								<TableHead className={templatesTableHeadClass}>
									Version
								</TableHead>
								<TableHead className={templatesTableHeadClass}>
									Category
								</TableHead>
								<TableHead className={templatesTableHeadClass}>Tags</TableHead>
								<TableHead
									className={cn(templatesTableHeadClass, "text-right")}
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="[&_tr:last-child]:border-0">
							{templates.map((template) => (
								<TableRow
									key={template.id}
									className={templatesTableRowClass}
									onClick={() =>
										void navigate({
											to: "/admin/system-templates/$systemTemplateId/edit",
											params: { systemTemplateId: template.id },
										})
									}
								>
									<TableCell
										className={cn(templatesTableCellClass, "font-medium")}
									>
										{template.name}
									</TableCell>
									<TableCell className={templatesTableCellClass}>
										<Badge variant="secondary">{template.status}</Badge>
									</TableCell>
									<TableCell className={templatesTableCellClass}>
										{template.catalogVersionLabel}
									</TableCell>
									<TableCell
										className={cn(templatesTableCellClass, "capitalize")}
									>
										{template.meta.category}
									</TableCell>
									<TableCell className={templatesTableCellClass}>
										{template.meta.tags.length > 0 ? (
											<div className="flex flex-wrap gap-1.5">
												{template.meta.tags.map((tag) => (
													<Badge key={tag} variant="secondary">
														{tag}
													</Badge>
												))}
											</div>
										) : (
											<span className="text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell
										className={cn(
											templatesTableCellClass,
											"space-x-2 text-right",
										)}
										onClick={(event) => event.stopPropagation()}
									>
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() =>
												void navigate({
													to: "/admin/system-templates/$systemTemplateId/edit",
													params: { systemTemplateId: template.id },
												})
											}
										>
											Edit
										</Button>
										{template.status === "draft" ? (
											<Button
												type="button"
												size="sm"
												disabled={publishMutation.isPending}
												isLoading={
													publishMutation.isPending &&
													publishMutation.variables === template.id
												}
												onClick={() =>
													setConfirmTarget({
														id: template.id,
														action: "publish",
													})
												}
											>
												Publish
											</Button>
										) : null}
										{template.status === "published" ? (
											<Button
												type="button"
												size="sm"
												variant="outline"
												disabled={archiveMutation.isPending}
												isLoading={
													archiveMutation.isPending &&
													archiveMutation.variables === template.id
												}
												onClick={() =>
													setConfirmTarget({
														id: template.id,
														action: "archive",
													})
												}
											>
												Archive
											</Button>
										) : null}
										{template.status !== "published" ? (
											<Button
												type="button"
												size="sm"
												variant="destructive"
												disabled={deleteMutation.isPending}
												isLoading={
													deleteMutation.isPending &&
													deleteMutation.variables === template.id
												}
												onClick={() =>
													setConfirmTarget({
														id: template.id,
														action: "delete",
													})
												}
											>
												Delete
											</Button>
										) : null}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</AdminDataTable>
			</AdminListPage.Body>

			<ConfirmAlertDialog
				open={confirmTarget !== null}
				onOpenChange={(open) => {
					if (!open) setConfirmTarget(null);
				}}
				title={
					confirmTarget?.action === "publish"
						? "Publish system template?"
						: confirmTarget?.action === "archive"
							? "Archive system template?"
							: "Delete system template?"
				}
				description={
					confirmTarget?.action === "publish"
						? "Workspace admins will be able to install this catalog version."
						: confirmTarget?.action === "archive"
							? "This removes the template from the Library. Existing workspace copies stay."
							: "This permanently deletes the draft and its documents."
				}
				confirmLabel={
					confirmTarget?.action === "publish"
						? "Publish"
						: confirmTarget?.action === "archive"
							? "Archive"
							: "Delete"
				}
				destructive={confirmTarget?.action === "delete"}
				pending={
					publishMutation.isPending ||
					archiveMutation.isPending ||
					deleteMutation.isPending
				}
				onConfirm={() => void handleConfirmAction()}
			/>
		</AdminListPage>
	);
}
