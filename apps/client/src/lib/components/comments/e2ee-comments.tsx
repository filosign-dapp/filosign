import {
	ChatCircleIcon,
	PaperPlaneRightIcon,
	PencilSimpleIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/src/lib/components/ui/context-menu";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@/src/lib/components/ui/input-group";
import { cn } from "@/src/lib/utils/utils";

const COMMENT_GROUP_MS = 5 * 60 * 1000;

const commentClockFormatter = new Intl.DateTimeFormat(undefined, {
	hour: "numeric",
	minute: "2-digit",
});

function commentDayOrdinal(day: number): string {
	if (day % 10 === 1 && day !== 11) return `${day}st`;
	if (day % 10 === 2 && day !== 12) return `${day}nd`;
	if (day % 10 === 3 && day !== 13) return `${day}rd`;
	return `${day}th`;
}

function formatCommentDayLabel(date: Date): string {
	const weekday = new Intl.DateTimeFormat(undefined, {
		weekday: "long",
	}).format(date);
	const month = new Intl.DateTimeFormat(undefined, { month: "long" }).format(
		date,
	);
	return `${weekday}, ${month} ${commentDayOrdinal(date.getDate())}`;
}

function commentDayKey(iso: string): string {
	return new Date(iso).toDateString();
}

function isSameCommentAuthor(a: E2eeCommentRow, b: E2eeCommentRow): boolean {
	if (a.authorWallet && b.authorWallet) {
		return a.authorWallet.toLowerCase() === b.authorWallet.toLowerCase();
	}
	return commentAuthorLabel(a) === commentAuthorLabel(b);
}

function isCompactCommentGroup(
	prev: E2eeCommentRow,
	current: E2eeCommentRow,
): boolean {
	if (!isSameCommentAuthor(prev, current)) return false;
	const elapsed =
		new Date(current.createdAt).getTime() - new Date(prev.createdAt).getTime();
	return elapsed >= 0 && elapsed <= COMMENT_GROUP_MS;
}

type CommentThreadItem =
	| { kind: "date"; id: string; label: string }
	| { kind: "message"; id: string; comment: E2eeCommentRow; compact: boolean };

function buildCommentThreadItems(
	comments: E2eeCommentRow[],
): CommentThreadItem[] {
	const items: CommentThreadItem[] = [];
	let previous: E2eeCommentRow | undefined;
	let previousDayKey = "";

	for (const comment of comments) {
		const dayKey = commentDayKey(comment.createdAt);
		if (dayKey !== previousDayKey) {
			items.push({
				kind: "date",
				id: `date-${dayKey}`,
				label: formatCommentDayLabel(new Date(comment.createdAt)),
			});
			previousDayKey = dayKey;
			previous = undefined;
		}

		items.push({
			kind: "message",
			id: comment.id,
			comment,
			compact: previous ? isCompactCommentGroup(previous, comment) : false,
		});
		previous = comment;
	}

	return items;
}

export type E2eeCommentRow = {
	id: string;
	body: string;
	authorWallet: string | null | undefined;
	authorDisplayName?: string;
	authorEmail?: string;
	createdAt: string;
};

function sortCommentsOldestFirst(items: E2eeCommentRow[]) {
	return [...items].sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	);
}

function commentAuthorLabel(row: E2eeCommentRow): string {
	const name = row.authorDisplayName?.trim();
	if (name) return name;
	const email = row.authorEmail?.trim();
	if (email) return email;
	return "Team member";
}

function commentAuthorInitials(row: E2eeCommentRow): string {
	const name = row.authorDisplayName?.trim();
	if (name) {
		const parts = name.split(/\s+/).filter(Boolean);
		if (parts.length >= 2) {
			return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
		}
		return name.slice(0, 2).toUpperCase();
	}
	const email = row.authorEmail?.trim();
	if (email) return email.slice(0, 2).toUpperCase();
	return "TM";
}

export type E2eeCommentsQuery = {
	data: E2eeCommentRow[] | undefined;
	isLoading: boolean;
	isPending: boolean;
	isError: boolean;
	error: unknown;
};

export type E2eeCommentThreadActions = {
	canManageComment?: (row: E2eeCommentRow) => boolean;
	onEditComment?: (row: E2eeCommentRow) => void;
	onDeleteComment?: (row: E2eeCommentRow) => void;
};

function E2eeCommentMessageRow(props: {
	comment: E2eeCommentRow;
	compact: boolean;
	actions?: E2eeCommentThreadActions;
}) {
	const c = props.comment;
	const label = commentAuthorLabel(c);
	const timestamp = commentClockFormatter.format(new Date(c.createdAt));
	const canManage = props.actions?.canManageComment?.(c) ?? false;

	const row = (
		<div
			className={cn(
				"flex w-full gap-2.5 px-0.5 hover:bg-muted/40",
				props.compact ? "py-0.5" : "py-2",
			)}
		>
			{props.compact ? (
				<div className="size-9 shrink-0" aria-hidden />
			) : (
				<div
					className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
					aria-hidden
				>
					{commentAuthorInitials(c)}
				</div>
			)}
			<div className="min-w-0 flex-1 pt-0.5">
				{props.compact ? null : (
					<div className="mb-0.5 flex min-w-0 items-baseline gap-2">
						<p className="text-sm font-bold text-foreground">{label}</p>
						<time
							className="text-xs tabular-nums text-muted-foreground"
							dateTime={c.createdAt}
						>
							{timestamp}
						</time>
					</div>
				)}
				<p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word text-foreground">
					{c.body}
				</p>
			</div>
		</div>
	);

	if (!canManage) {
		return row;
	}

	return (
		<ContextMenu>
			<ContextMenuTrigger className="block w-full">{row}</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem
					className="gap-2"
					onClick={() => props.actions?.onEditComment?.(c)}
				>
					<PencilSimpleIcon className="size-4" aria-hidden />
					Edit
				</ContextMenuItem>
				<ContextMenuItem
					variant="destructive"
					className="gap-2"
					onClick={() => props.actions?.onDeleteComment?.(c)}
				>
					<TrashIcon className="size-4" aria-hidden />
					Delete
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

export function E2eeCommentsThread(props: {
	comments: E2eeCommentsQuery;
	className?: string;
	emptyMessage: string;
	actions?: E2eeCommentThreadActions;
}) {
	const sorted = useMemo(
		() => sortCommentsOldestFirst(props.comments.data ?? []),
		[props.comments.data],
	);
	const threadItems = useMemo(() => buildCommentThreadItems(sorted), [sorted]);

	const showLoading =
		props.comments.isLoading ||
		(props.comments.isPending && props.comments.data == null);
	const errorMessage =
		props.comments.error instanceof Error
			? props.comments.error.message
			: props.comments.isError
				? "Failed to load comments"
				: null;

	return (
		<div
			className={cn(
				"min-h-0 flex-1 overflow-y-auto overscroll-contain",
				props.className,
			)}
			aria-live="polite"
			aria-busy={showLoading}
		>
			{showLoading ? (
				<div className="flex justify-center py-8">
					<InlineLoader size="md" />
					<span className="sr-only">Loading comments…</span>
				</div>
			) : errorMessage ? (
				<div className="px-1 py-6 text-center text-sm text-destructive">
					<p className="text-pretty">{errorMessage}</p>
				</div>
			) : sorted.length === 0 ? (
				<AppEmptyState
					preset="inline"
					variant="muted"
					icon={ChatCircleIcon}
					description={props.emptyMessage}
					className="border-transparent py-6"
				/>
			) : (
				<ul>
					{threadItems.map((item) => {
						if (item.kind === "date") {
							return (
								<li
									key={item.id}
									className="relative flex items-center py-4"
									aria-label={item.label}
								>
									<div className="h-px flex-1 bg-border" aria-hidden />
									<span className="mx-3 shrink-0 rounded-full border border-border bg-background px-3 py-0.5 text-xs font-medium text-muted-foreground">
										{item.label}
									</span>
									<div className="h-px flex-1 bg-border" aria-hidden />
								</li>
							);
						}

						return (
							<li key={item.id}>
								<E2eeCommentMessageRow
									comment={item.comment}
									compact={item.compact}
									actions={props.actions}
								/>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

export function E2eeCommentsComposer(props: {
	textareaId: string;
	placeholder: string;
	isPending: boolean;
	onPost: (body: string) => Promise<void>;
	onUpdate?: (body: string) => Promise<void>;
	editingComment?: { id: string; body: string } | null;
	onCancelEdit?: () => void;
	onPosted?: () => void;
	className?: string;
}) {
	const [body, setBody] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const submittingRef = useRef(false);
	const isEditing = Boolean(props.editingComment);
	const isBusy = props.isPending || isSubmitting;

	useEffect(() => {
		if (props.editingComment) {
			setBody(props.editingComment.body);
		}
	}, [props.editingComment]);

	const handleSubmit = useCallback(() => {
		const trimmed = body.trim();
		if (!trimmed || isBusy || submittingRef.current) return;
		const submit = isEditing ? props.onUpdate : props.onPost;
		if (!submit) return;

		submittingRef.current = true;
		setIsSubmitting(true);
		void submit(trimmed)
			.then(() => {
				setBody("");
				props.onCancelEdit?.();
				props.onPosted?.();
			})
			.catch(() => undefined)
			.finally(() => {
				submittingRef.current = false;
				setIsSubmitting(false);
			});
	}, [
		body,
		isBusy,
		isEditing,
		props.onPost,
		props.onUpdate,
		props.onCancelEdit,
		props.onPosted,
	]);

	const canSubmit = Boolean(body.trim()) && !isBusy;

	return (
		<div className={cn("space-y-1.5", props.className)}>
			{isEditing ? (
				<div className="flex items-center justify-between gap-2">
					<p className="text-xs font-medium text-foreground">Editing comment</p>
					<button
						type="button"
						className="text-xs text-muted-foreground hover:text-foreground"
						onClick={() => {
							setBody("");
							props.onCancelEdit?.();
						}}
					>
						Cancel
					</button>
				</div>
			) : null}
			<InputGroup className="min-h-20 has-[>textarea]:min-h-20">
				<InputGroupTextarea
					id={props.textareaId}
					value={body}
					onChange={(e) => setBody(e.target.value)}
					onKeyDown={(e) => {
						if (e.key !== "Enter" || (!e.metaKey && !e.ctrlKey)) return;
						e.preventDefault();
						if (!isBusy && !submittingRef.current) handleSubmit();
					}}
					placeholder={props.placeholder}
					rows={3}
					disabled={isBusy}
					className="field-sizing-fixed min-h-16"
				/>
				<InputGroupAddon
					align="block-end"
					className="justify-end pb-1.5 pr-1.5"
				>
					<InputGroupButton
						size="icon-xs"
						variant={canSubmit ? "secondary" : "ghost"}
						disabled={!canSubmit}
						onClick={handleSubmit}
						aria-label={isEditing ? "Save comment" : "Send comment"}
					>
						{isBusy ? (
							<InlineLoader size="sm" />
						) : (
							<PaperPlaneRightIcon className="size-4" weight="fill" />
						)}
					</InputGroupButton>
				</InputGroupAddon>
			</InputGroup>
			<p className="text-xs text-muted-foreground">
				Enter for a new line. ⌘ or Ctrl+Enter to {isEditing ? "save" : "send"}.
			</p>
		</div>
	);
}

export function E2eeCommentsPanel(props: {
	comments: E2eeCommentsQuery;
	className?: string;
	emptyMessage: string;
	actions?: E2eeCommentThreadActions;
}) {
	return (
		<div
			className={cn("flex min-h-0 flex-1 flex-col px-4 pb-3", props.className)}
		>
			<E2eeCommentsThread
				comments={props.comments}
				className="flex-1"
				emptyMessage={props.emptyMessage}
				actions={props.actions}
			/>
		</div>
	);
}
