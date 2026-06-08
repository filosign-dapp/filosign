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
	documentRowStatusLabel,
	documentRowTypeLabel,
	documentRowUpdatedLabel,
} from "@/src/lib/domains/documents/document-list-format";

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

	const openRow = (row: DocumentListRow) => {
		if (row.kind === "draft") {
			props.onOpenDraft(row.id);
			return;
		}
		props.onOpenEnvelope(row.id);
	};

	const renderCells = (row: DocumentListRow) => {
		const isDraft = row.kind === "draft";
		const partySubtitle = documentRowPartySubtitle(row);
		return (
			<>
				<TableCell className="max-w-[280px]">
					<div className="min-w-0">
						<p className="truncate font-medium">{row.title}</p>
						{partySubtitle ? (
							<p className="truncate text-xs text-muted-foreground">
								{partySubtitle}
							</p>
						) : null}
						{showMetadata &&
						row.kind === "envelope" &&
						row.metadata &&
						Object.keys(row.metadata).length > 0 ? (
							<MetadataChips metadata={row.metadata} />
						) : null}
					</div>
				</TableCell>
				<TableCell>{documentRowTypeLabel(row)}</TableCell>
				<TableCell>{documentRowUpdatedLabel(row)}</TableCell>
				<TableCell>{documentRowStatusLabel(row)}</TableCell>
				<TableCell>{documentRowSizeLabel(row)}</TableCell>
				<TableCell className="text-right">
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
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Type</TableHead>
					<TableHead>Updated</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Size</TableHead>
					<TableHead className="text-right">Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
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
											className="cursor-pointer"
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
							className="cursor-pointer"
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
