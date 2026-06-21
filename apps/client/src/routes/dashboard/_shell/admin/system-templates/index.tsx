import { useFilosignContext } from "@filosign/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ConfirmAlertDialog } from "@/src/lib/components/app/confirm-alert-dialog";
import { AdminSectionEmpty } from "@/src/lib/components/app/empty-state";
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
import { useBootstrapTemplateFromPdfUpload } from "@/src/lib/domains/templates/hooks/use-bootstrap-template-from-pdf";
import {
	templatesTableCellClass,
	templatesTableHeadClass,
	templatesTableRowClass,
} from "@/src/lib/domains/templates/utils/templates-table-styles";
import { showAppErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn } from "@/src/lib/utils/index";

const tableHeadClass = templatesTableHeadClass;
const tableCellClass = templatesTableCellClass;
const tableRowClass = templatesTableRowClass;

export const Route = createFileRoute(
	"/dashboard/_shell/admin/system-templates/",
)({
	component: AdminSystemTemplatesPage,
});

type SystemTemplateStatusFilter = "all" | "draft" | "published" | "archived";

type ConfirmAction = "publish" | "archive" | "delete";

function AdminSystemTemplatesPage() {
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
	});

	const publishMutation = useMutation({
		mutationFn: (systemTemplateId: string) =>
			rpc.platformAdmin.systemTemplates.publish({ systemTemplateId }),
		onSuccess: () => {
			toastUser.success("System template published.");
			void queryClient.invalidateQueries({
				queryKey: rpcQuery.platformAdmin.systemTemplates.list.queryKey(),
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
				queryKey: rpcQuery.platformAdmin.systemTemplates.list.queryKey(),
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
				queryKey: rpcQuery.platformAdmin.systemTemplates.list.queryKey(),
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
			navigateTo: { to: "/dashboard/admin/system-templates/new" },
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

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
			<div className="flex items-center justify-between gap-4">
				<div>
					<Link
						to="/dashboard/admin"
						className="text-sm text-muted-foreground hover:text-foreground"
					>
						Back to admin
					</Link>
					<h1 className="mt-1 text-xl font-medium">System templates</h1>
					<p className="text-sm text-muted-foreground">
						Manage Filosign catalog templates for workspace installs.
					</p>
				</div>
				<Button type="button" onClick={() => uploadInputRef.current?.click()}>
					New system template
				</Button>
			</div>

			<input
				ref={uploadInputRef}
				type="file"
				accept="application/pdf"
				multiple
				className="hidden"
				onChange={(event) => void handleUpload(event)}
			/>

			<Tabs
				value={statusFilter}
				onValueChange={(value) =>
					setStatusFilter(value as SystemTemplateStatusFilter)
				}
			>
				<TabsList>
					<TabsTrigger value="all">All</TabsTrigger>
					<TabsTrigger value="draft">Draft</TabsTrigger>
					<TabsTrigger value="published">Published</TabsTrigger>
					<TabsTrigger value="archived">Archived</TabsTrigger>
				</TabsList>
			</Tabs>

			{listQuery.isLoading ? (
				<p className="text-sm text-muted-foreground">Loading…</p>
			) : templates.length === 0 ? (
				<AdminSectionEmpty
					title={
						statusFilter === "all"
							? "No system templates"
							: `No ${statusFilter} system templates`
					}
					description="Upload a PDF and place fields to create the first catalog entry."
				/>
			) : (
				<Table>
					<TableHeader className="border-b border-border/60 bg-muted/15 [&_tr]:border-0">
						<TableRow className="hover:bg-transparent">
							<TableHead className={tableHeadClass}>Name</TableHead>
							<TableHead className={tableHeadClass}>Status</TableHead>
							<TableHead className={tableHeadClass}>Version</TableHead>
							<TableHead className={tableHeadClass}>Category</TableHead>
							<TableHead className={tableHeadClass}>Tags</TableHead>
							<TableHead className={cn(tableHeadClass, "text-right")}>
								Actions
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className="[&_tr:last-child]:border-0">
						{templates.map((template) => (
							<TableRow
								key={template.id}
								className={tableRowClass}
								onClick={() =>
									void navigate({
										to: "/dashboard/admin/system-templates/$systemTemplateId/edit",
										params: { systemTemplateId: template.id },
									})
								}
							>
								<TableCell className={cn(tableCellClass, "font-medium")}>
									{template.name}
								</TableCell>
								<TableCell className={tableCellClass}>
									<Badge variant="secondary">{template.status}</Badge>
								</TableCell>
								<TableCell className={tableCellClass}>
									{template.catalogVersionLabel}
								</TableCell>
								<TableCell className={cn(tableCellClass, "capitalize")}>
									{template.meta.category}
								</TableCell>
								<TableCell className={tableCellClass}>
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
									className={cn(tableCellClass, "space-x-2 text-right")}
									onClick={(event) => event.stopPropagation()}
								>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() =>
											void navigate({
												to: "/dashboard/admin/system-templates/$systemTemplateId/edit",
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
			)}
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
		</div>
	);
}
