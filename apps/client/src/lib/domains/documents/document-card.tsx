import {
	DotsThreeVerticalIcon,
	FilePdfIcon,
	FileTextIcon,
	FolderOpenIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
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
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { formatFileSize } from "@/src/lib/utils/format-file-size";
import { cn } from "@/src/lib/utils/utils";

export type DocumentCardKind = "draft" | "sent" | "received" | "org";

export type DocumentCardProps = {
	kind: DocumentCardKind;
	variant?: "list" | "grid";
	title: string;
	subtitle: string;
	busy?: boolean;
	draftId?: string;
	onOpen: () => void;
	onDeleteDraft?: (draftId: string) => void;
	deleteDisabled?: boolean;
};

function CardIcon({ kind }: { kind: DocumentCardKind }) {
	if (kind === "draft") {
		return (
			<FileTextIcon className="size-8 text-destructive/70" weight="light" />
		);
	}
	return <FilePdfIcon className="size-8 text-red-500" />;
}

function OpenMenuAction(props: {
	menu: "context" | "dropdown";
	onOpen: () => void;
	disabled?: boolean;
}) {
	if (props.menu === "context") {
		return (
			<ContextMenuItem
				disabled={props.disabled}
				onClick={() => props.onOpen()}
				className="gap-2"
			>
				<FolderOpenIcon className="size-4" aria-hidden />
				Open
			</ContextMenuItem>
		);
	}
	return (
		<DropdownMenuItem
			disabled={props.disabled}
			className="gap-2"
			onClick={() => props.onOpen()}
		>
			<FolderOpenIcon className="size-4" aria-hidden />
			Open
		</DropdownMenuItem>
	);
}

function CardActions({
	kind,
	draftId,
	busy,
	onOpen,
	onDeleteDraft,
	deleteDisabled,
}: {
	kind: DocumentCardKind;
	draftId?: string;
	busy?: boolean;
	onOpen: () => void;
	onDeleteDraft?: (draftId: string) => void;
	deleteDisabled?: boolean;
}) {
	const canDelete =
		kind === "draft" && Boolean(draftId) && Boolean(onDeleteDraft);
	const actionsDisabled = busy || deleteDisabled;

	if (busy) {
		return (
			<div className="shrink-0 flex items-center justify-center size-8">
				<InlineLoader size="sm" />
				<span className="sr-only">Opening…</span>
			</div>
		);
	}

	return (
		<div className="flex shrink-0 items-center gap-0.5">
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground hover:text-foreground"
							aria-label="More actions"
							onClick={(e) => e.stopPropagation()}
							onKeyDown={(e) => e.stopPropagation()}
						/>
					}
				>
					<DotsThreeVerticalIcon className="size-4" aria-hidden />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-36">
					<OpenMenuAction
						menu="dropdown"
						onOpen={onOpen}
						disabled={actionsDisabled}
					/>
				</DropdownMenuContent>
			</DropdownMenu>

			{canDelete && draftId ? (
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="text-muted-foreground hover:text-destructive"
					aria-label="Delete draft"
					disabled={actionsDisabled}
					onClick={(e) => {
						e.stopPropagation();
						onDeleteDraft?.(draftId);
					}}
					onKeyDown={(e) => e.stopPropagation()}
				>
					<TrashIcon className="size-4" aria-hidden />
				</Button>
			) : null}
		</div>
	);
}

function DocumentCardShell(props: {
	busy?: boolean;
	onOpen: () => void;
	className: string;
	children: ReactNode;
}) {
	const handleOpen = () => {
		if (props.busy) return;
		props.onOpen();
	};

	return (
		<div
			role="button"
			tabIndex={props.busy ? -1 : 0}
			aria-busy={props.busy}
			className={props.className}
			onClick={handleOpen}
			onKeyDown={(e) => {
				if (props.busy) return;
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					handleOpen();
				}
			}}
		>
			{props.children}
		</div>
	);
}

function DocumentCardList(props: DocumentCardProps) {
	const handleOpen = () => {
		if (props.busy) return;
		props.onOpen();
	};

	return (
		<DocumentCardShell
			busy={props.busy}
			onOpen={props.onOpen}
			className={cn(
				"group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
				props.busy
					? "cursor-wait opacity-70"
					: "cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
			)}
		>
			<div className="flex size-10 shrink-0 items-center justify-center">
				<CardIcon kind={props.kind} />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium">{props.title}</p>
				<p className="text-sm text-muted-foreground">{props.subtitle}</p>
			</div>
			<CardActions
				kind={props.kind}
				draftId={props.draftId}
				busy={props.busy}
				onOpen={handleOpen}
				onDeleteDraft={props.onDeleteDraft}
				deleteDisabled={props.deleteDisabled}
			/>
		</DocumentCardShell>
	);
}

function DocumentCardGrid(props: DocumentCardProps) {
	const handleOpen = () => {
		if (props.busy) return;
		props.onOpen();
	};

	return (
		<DocumentCardShell
			busy={props.busy}
			onOpen={props.onOpen}
			className={cn(
				"group relative rounded-lg border bg-background p-2 text-left transition-colors",
				props.busy
					? "cursor-wait opacity-70"
					: "cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
			)}
		>
			<div className="absolute top-1.5 right-1.5 z-10">
				<CardActions
					kind={props.kind}
					draftId={props.draftId}
					busy={props.busy}
					onOpen={handleOpen}
					onDeleteDraft={props.onDeleteDraft}
					deleteDisabled={props.deleteDisabled}
				/>
			</div>
			<div className="mb-2 flex aspect-4/3 items-center justify-center rounded-md bg-muted">
				{props.busy ? (
					<InlineLoader size="sm" />
				) : (
					<CardIcon kind={props.kind} />
				)}
			</div>
			<div className="space-y-1 pr-1">
				<p className="truncate text-sm font-medium" title={props.title}>
					{props.title}
				</p>
				<p className="text-xs text-muted-foreground">{props.subtitle}</p>
			</div>
		</DocumentCardShell>
	);
}

export function DocumentCard(props: DocumentCardProps) {
	const handleOpen = () => {
		if (props.busy) return;
		props.onOpen();
	};

	const card =
		props.variant === "grid" ? (
			<DocumentCardGrid {...props} />
		) : (
			<DocumentCardList {...props} />
		);

	return (
		<ContextMenu>
			<ContextMenuTrigger className="block w-full">{card}</ContextMenuTrigger>
			<ContextMenuContent className="min-w-36">
				<OpenMenuAction
					menu="context"
					onOpen={handleOpen}
					disabled={props.busy}
				/>
			</ContextMenuContent>
		</ContextMenu>
	);
}

export function formatDocumentCardDate(date: Date) {
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function formatFileSubtitle(args: { sizeBytes: number; date: Date }) {
	return `${formatFileSize(args.sizeBytes)} · ${formatDocumentCardDate(args.date)}`;
}
