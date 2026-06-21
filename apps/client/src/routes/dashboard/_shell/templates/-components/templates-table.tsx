import {
	DotsThreeVerticalIcon,
	FileTextIcon,
	FolderOpenIcon,
	PencilSimpleIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/src/lib/components/ui/context-menu";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/src/lib/components/ui/table";
import { formatDocumentCardDate } from "@/src/lib/domains/documents/document-card";
import {
	templateMetaSubtitle,
	templatesTableCellClass,
	templatesTableHeadClass,
	templatesTableRowClass,
} from "@/src/lib/domains/templates/utils/templates-table-styles";
import { cn } from "@/src/lib/utils/utils";
import type { TemplateListItem } from "@/src/routes/dashboard/_shell/templates/-lib/hooks/use-templates-list-controller";

type Props = {
	templates: TemplateListItem[];
	busy?: boolean;
	canUse: boolean;
	canManage: boolean;
	onOpen: (templateId: string) => void;
	onUse: (templateId: string) => void;
	onEdit: (templateId: string) => void;
	onDelete: (templateId: string) => void;
};

const tableHeadClass = templatesTableHeadClass;
const tableCellClass = templatesTableCellClass;
const tableRowClass = templatesTableRowClass;

function templateMeta(template: TemplateListItem) {
	return templateMetaSubtitle(template);
}

function templateVersionLabel(template: TemplateListItem) {
	return template.catalogVersionLabel ?? "—";
}

function TemplateRowActions({
	busy,
	canUse,
	canManage,
	onOpen,
	onUse,
	onEdit,
	onDelete,
}: {
	busy?: boolean;
	canUse: boolean;
	canManage: boolean;
	onOpen: () => void;
	onUse: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const hasMenu = canUse || canManage;
	if (!hasMenu) return null;

	return (
		<div className="flex items-center justify-end gap-0.5">
			{canUse ? (
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="hidden h-8 gap-1.5 sm:inline-flex"
					disabled={busy}
					onClick={(e) => {
						e.stopPropagation();
						onUse();
					}}
				>
					<FolderOpenIcon className="size-4" aria-hidden />
					Use
				</Button>
			) : null}
			{canManage ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
					disabled={busy}
					aria-label="Edit template"
					onClick={(e) => {
						e.stopPropagation();
						onEdit();
					}}
				>
					<PencilSimpleIcon className="size-4" aria-hidden />
				</Button>
			) : null}
			{canManage ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="hidden text-muted-foreground hover:text-destructive sm:inline-flex"
					disabled={busy}
					aria-label="Delete template"
					onClick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
				>
					<TrashIcon className="size-4" aria-hidden />
				</Button>
			) : null}
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground hover:text-foreground sm:hidden"
							aria-label="More actions"
							disabled={busy}
							onClick={(e) => e.stopPropagation()}
							onKeyDown={(e) => e.stopPropagation()}
						/>
					}
				>
					<DotsThreeVerticalIcon className="size-4" aria-hidden />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-36">
					<DropdownMenuItem className="gap-2" disabled={busy} onClick={onOpen}>
						<FileTextIcon className="size-4" aria-hidden />
						Preview
					</DropdownMenuItem>
					{canUse ? (
						<DropdownMenuItem className="gap-2" disabled={busy} onClick={onUse}>
							<FolderOpenIcon className="size-4" aria-hidden />
							Use template
						</DropdownMenuItem>
					) : null}
					{canManage ? (
						<DropdownMenuItem
							className="gap-2"
							disabled={busy}
							onClick={onEdit}
						>
							<PencilSimpleIcon className="size-4" aria-hidden />
							Edit
						</DropdownMenuItem>
					) : null}
					{canManage ? (
						<DropdownMenuItem
							variant="destructive"
							className="gap-2"
							disabled={busy}
							onClick={onDelete}
						>
							<TrashIcon className="size-4" aria-hidden />
							Delete
						</DropdownMenuItem>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function TemplateContextMenuContent({
	busy,
	canUse,
	canManage,
	onOpen,
	onUse,
	onEdit,
	onDelete,
}: {
	busy?: boolean;
	canUse: boolean;
	canManage: boolean;
	onOpen: () => void;
	onUse: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	return (
		<ContextMenuContent className="min-w-36">
			<ContextMenuItem className="gap-2" disabled={busy} onClick={onOpen}>
				<FileTextIcon className="size-4" aria-hidden />
				Preview
			</ContextMenuItem>
			{canUse ? (
				<ContextMenuItem className="gap-2" disabled={busy} onClick={onUse}>
					<FolderOpenIcon className="size-4" aria-hidden />
					Use template
				</ContextMenuItem>
			) : null}
			{canManage ? (
				<ContextMenuItem className="gap-2" disabled={busy} onClick={onEdit}>
					<PencilSimpleIcon className="size-4" aria-hidden />
					Edit
				</ContextMenuItem>
			) : null}
			{canManage ? (
				<ContextMenuItem
					variant="destructive"
					className="gap-2"
					disabled={busy}
					onClick={onDelete}
				>
					<TrashIcon className="size-4" aria-hidden />
					Delete
				</ContextMenuItem>
			) : null}
		</ContextMenuContent>
	);
}

export function TemplatesTable({
	templates,
	busy,
	canUse,
	canManage,
	onOpen,
	onUse,
	onEdit,
	onDelete,
}: Props) {
	const showActions = canUse || canManage;

	return (
		<Table>
			<TableHeader className="border-b border-border/60 bg-muted/15 [&_tr]:border-0">
				<TableRow className="hover:bg-transparent">
					<TableHead className={tableHeadClass}>Name</TableHead>
					<TableHead className={cn(tableHeadClass, "hidden sm:table-cell")}>
						Updated
					</TableHead>
					<TableHead className={cn(tableHeadClass, "hidden md:table-cell")}>
						Version
					</TableHead>
					<TableHead className={cn(tableHeadClass, "text-right")}>
						{showActions ? "Actions" : <span className="sr-only">Actions</span>}
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody className="[&_tr:last-child]:border-0">
				{templates.map((template) => {
					const updatedLabel = formatDocumentCardDate(
						new Date(template.updatedAt),
					);
					const open = () => onOpen(template.id);
					const use = () => onUse(template.id);
					const edit = () => onEdit(template.id);
					const remove = () => onDelete(template.id);

					return (
						<ContextMenu key={template.id}>
							<ContextMenuTrigger
								render={<TableRow className={tableRowClass} onClick={open} />}
							>
								<TableCell
									className={cn(
										tableCellClass,
										"max-w-[320px] whitespace-normal",
									)}
								>
									<div className="min-w-0 space-y-1">
										<p className="truncate font-medium">{template.name}</p>
										<p className="truncate text-xs text-muted-foreground">
											{templateMeta(template)}
											<span className="sm:hidden">
												{" "}
												· Updated {updatedLabel}
											</span>
										</p>
									</div>
								</TableCell>
								<TableCell
									className={cn(
										tableCellClass,
										"hidden whitespace-nowrap text-sm text-muted-foreground sm:table-cell",
									)}
								>
									{updatedLabel}
								</TableCell>
								<TableCell
									className={cn(
										tableCellClass,
										"hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell",
									)}
								>
									{templateVersionLabel(template)}
								</TableCell>
								<TableCell className={cn(tableCellClass, "text-right")}>
									<TemplateRowActions
										busy={busy}
										canUse={canUse}
										canManage={canManage}
										onOpen={open}
										onUse={use}
										onEdit={edit}
										onDelete={remove}
									/>
								</TableCell>
							</ContextMenuTrigger>
							<TemplateContextMenuContent
								busy={busy}
								canUse={canUse}
								canManage={canManage}
								onOpen={open}
								onUse={use}
								onEdit={edit}
								onDelete={remove}
							/>
						</ContextMenu>
					);
				})}
			</TableBody>
		</Table>
	);
}
