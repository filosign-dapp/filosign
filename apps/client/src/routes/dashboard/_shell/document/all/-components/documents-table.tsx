import { useEntitlements } from "@filosign/react/billing";
import type { DocumentListRow } from "@filosign/react/documents";
import { canUseMetadataTags } from "@filosign/react/files";
import {
	FolderOpenIcon,
	PencilSimpleIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/src/lib/components/ui/context-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/src/lib/components/ui/table";
import {
	documentRowPartySubtitle,
	documentRowSizeLabel,
	documentRowUpdatedLabel,
} from "@/src/lib/domains/documents/document-list-format";
import {
	DocumentRowStatusBadge,
	resolveDocumentRowStatus,
	rowAccentClass,
} from "@/src/lib/domains/documents/document-row-status";
import { cn } from "@/src/lib/utils/index";

function MetadataChips(props: { metadata: Record<string, string> }) {
	const entries = Object.entries(props.metadata).slice(0, 3);
	if (entries.length === 0) return null;
	return (
		<div className="mt-1 flex flex-wrap gap-1">
			{entries.map(([key, value]) => (
				<Badge key={key} variant="outline" className="text-[10px] font-normal">
					{key}: {value}
				</Badge>
			))}
		</div>
	);
}

function DraftContextMenuContent(props: {
	row: Extract<DocumentListRow, { kind: "draft" }>;
	onOpen: () => void;
	onRenameDraft?: (draftId: string, currentTitle: string) => void;
	onDeleteDraft?: (draftId: string) => void;
	renameDisabled?: boolean;
	deleteDisabled?: boolean;
}) {
	return (
		<ContextMenuContent className="min-w-36">
			<ContextMenuItem className="gap-2" onClick={props.onOpen}>
				<FolderOpenIcon className="size-4" aria-hidden />
				Open
			</ContextMenuItem>
			{props.onRenameDraft ? (
				<ContextMenuItem
					className="gap-2"
					disabled={props.renameDisabled}
					onClick={() => props.onRenameDraft?.(props.row.id, props.row.title)}
				>
					<PencilSimpleIcon className="size-4" aria-hidden />
					Rename
				</ContextMenuItem>
			) : null}
			{props.onDeleteDraft ? (
				<ContextMenuItem
					variant="destructive"
					className="gap-2"
					disabled={props.deleteDisabled}
					onClick={() => props.onDeleteDraft?.(props.row.id)}
				>
					<TrashIcon className="size-4" aria-hidden />
					Delete
				</ContextMenuItem>
			) : null}
		</ContextMenuContent>
	);
}

function DraftActionButtons(props: {
	row: Extract<DocumentListRow, { kind: "draft" }>;
	onRenameDraft?: (draftId: string, currentTitle: string) => void;
	onDeleteDraft?: (draftId: string) => void;
	renameDisabled?: boolean;
	deleteDisabled?: boolean;
}) {
	return (
		<div className="flex items-center justify-end gap-0.5">
			{props.onRenameDraft ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="text-muted-foreground hover:text-foreground"
					aria-label="Rename draft"
					disabled={props.renameDisabled}
					onClick={(e) => {
						e.stopPropagation();
						props.onRenameDraft?.(props.row.id, props.row.title);
					}}
				>
					<PencilSimpleIcon className="size-4" aria-hidden />
				</Button>
			) : null}
			{props.onDeleteDraft ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="text-muted-foreground hover:text-destructive"
					aria-label="Delete draft"
					disabled={props.deleteDisabled}
					onClick={(e) => {
						e.stopPropagation();
						props.onDeleteDraft?.(props.row.id);
					}}
				>
					<TrashIcon className="size-4" aria-hidden />
				</Button>
			) : null}
		</div>
	);
}

const tableHeadClass =
	"h-9 px-4 text-xs font-normal text-muted-foreground first:pl-5 last:pr-5";
const tableCellClass = "px-4 py-3 first:pl-5 last:pr-5";
const tableRowClass =
	"cursor-pointer border-b border-border/40 last:border-0 hover:bg-muted/30";

export function DocumentsTable(props: {
	items: DocumentListRow[];
	onOpenEnvelope: (pieceCid: string) => void;
	onOpenDraft: (draftId: string) => void;
	onDeleteDraft?: (draftId: string) => void;
	onRenameDraft?: (draftId: string, currentTitle: string) => void;
	deleteDisabled?: boolean;
	renameDisabled?: boolean;
}) {
	const { data: entitlements } = useEntitlements();
	const showMetadata = canUseMetadataTags(entitlements);
	const hasDraftRows = props.items.some((row) => row.kind === "draft");

	const openRow = (row: DocumentListRow) => {
		if (row.kind === "draft") {
			props.onOpenDraft(row.id);
			return;
		}
		props.onOpenEnvelope(row.id);
	};

	const rowAccent = (row: DocumentListRow) =>
		cn(
			tableRowClass,
			"border-l-2",
			rowAccentClass[resolveDocumentRowStatus(row).tone],
		);

	const renderCells = (row: DocumentListRow) => {
		const isDraft = row.kind === "draft";
		const partySubtitle = documentRowPartySubtitle(row);
		const updatedLabel = documentRowUpdatedLabel(row);
		return (
			<>
				<TableCell
					className={cn(tableCellClass, "max-w-[320px] whitespace-normal")}
				>
					<div className="min-w-0">
						<p className="truncate font-medium">{row.title}</p>
						<p className="truncate text-xs text-muted-foreground">
							{partySubtitle
								? `${partySubtitle} · Updated ${updatedLabel}`
								: `Updated ${updatedLabel}`}
						</p>
						{showMetadata &&
						row.kind === "envelope" &&
						row.metadata &&
						Object.keys(row.metadata).length > 0 ? (
							<MetadataChips metadata={row.metadata} />
						) : null}
					</div>
				</TableCell>
				<TableCell className={cn(tableCellClass, "whitespace-normal")}>
					<DocumentRowStatusBadge row={row} />
				</TableCell>
				<TableCell className={tableCellClass}>
					{documentRowSizeLabel(row)}
				</TableCell>
				<TableCell className={cn(tableCellClass, "text-right")}>
					{isDraft ? (
						<DraftActionButtons
							row={row}
							onRenameDraft={props.onRenameDraft}
							onDeleteDraft={props.onDeleteDraft}
							renameDisabled={props.renameDisabled}
							deleteDisabled={props.deleteDisabled}
						/>
					) : null}
				</TableCell>
			</>
		);
	};

	return (
		<Table>
			<TableHeader className="border-b border-border/60 bg-muted/15 [&_tr]:border-0">
				<TableRow className="hover:bg-transparent">
					<TableHead className={tableHeadClass}>Name</TableHead>
					<TableHead className={tableHeadClass}>Status</TableHead>
					<TableHead className={tableHeadClass}>Size</TableHead>
					<TableHead className={cn(tableHeadClass, "text-right")}>
						{hasDraftRows ? (
							"Actions"
						) : (
							<span className="sr-only">Actions</span>
						)}
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody className="[&_tr:last-child]:border-0">
				{props.items.map((row) => {
					const isDraft = row.kind === "draft";
					const hasDraftContextMenu =
						isDraft &&
						(Boolean(props.onRenameDraft) || Boolean(props.onDeleteDraft));

					if (hasDraftContextMenu) {
						return (
							<ContextMenu key={row.id}>
								<ContextMenuTrigger
									render={
										<TableRow
											className={rowAccent(row)}
											onClick={() => openRow(row)}
										/>
									}
								>
									{renderCells(row)}
								</ContextMenuTrigger>
								<DraftContextMenuContent
									row={row}
									onOpen={() => openRow(row)}
									onRenameDraft={props.onRenameDraft}
									onDeleteDraft={props.onDeleteDraft}
									renameDisabled={props.renameDisabled}
									deleteDisabled={props.deleteDisabled}
								/>
							</ContextMenu>
						);
					}

					return (
						<TableRow
							key={row.id}
							className={rowAccent(row)}
							onClick={() => openRow(row)}
						>
							{renderCells(row)}
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
