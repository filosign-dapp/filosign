import { useDraftCommentAppend } from "@filosign/react/drafts";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { useDraftCommentsContext } from "@/src/lib/domains/drafts/draft-comments-context";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { cn, truncateAddress } from "@/src/lib/utils/utils";

const commentTimeFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
});

type DraftComment = {
	id: string;
	body: string;
	authorWallet: string | null | undefined;
	createdAt: string;
};

function sortCommentsOldestFirst(items: DraftComment[]) {
	return [...items].sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	);
}

export function DraftCommentsThread(props: { className?: string }) {
	const comments = useDraftCommentsContext();

	const sorted = useMemo(
		() => sortCommentsOldestFirst(comments.data ?? []),
		[comments.data],
	);

	const showLoading =
		comments.isLoading || (comments.isPending && comments.data == null);
	const errorMessage =
		comments.error instanceof Error
			? comments.error.message
			: comments.isError
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
				<div className="px-1 py-6 text-center text-sm text-muted-foreground">
					<p className="text-pretty">
						No comments yet. Leave encrypted notes for your team while you
						prepare this envelope.
					</p>
				</div>
			) : (
				<ul className="space-y-3">
					{sorted.map((c) => (
						<li
							key={c.id}
							className="rounded-md border border-border/50 bg-muted/30 px-3 py-2.5"
						>
							<div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-2">
								<span className="truncate text-xs font-medium text-foreground">
									{c.authorWallet
										? truncateAddress(c.authorWallet)
										: "Team member"}
								</span>
								<time
									className="shrink-0 text-xs tabular-nums text-muted-foreground"
									dateTime={c.createdAt}
								>
									{commentTimeFormatter.format(new Date(c.createdAt))}
								</time>
							</div>
							<p className="min-w-0 text-sm wrap-break-word text-foreground">
								{c.body}
							</p>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function DraftCommentsComposer(props: {
	onPosted?: () => void;
	className?: string;
}) {
	const { draftId } = useDraftCommentsContext();
	const activeOrgId = useStorePersist((s) => s.activeOrgId);
	const append = useDraftCommentAppend();
	const [body, setBody] = useState("");
	const textareaId = `draft-comment-${draftId}`;

	return (
		<div className={cn("space-y-3", props.className)}>
			<div className="space-y-2">
				<Label htmlFor={textareaId}>New comment</Label>
				<Textarea
					id={textareaId}
					value={body}
					onChange={(e) => setBody(e.target.value)}
					placeholder="Add an encrypted note for your team…"
					rows={3}
					className="resize-none"
				/>
			</div>
			<Button
				type="button"
				variant="primary"
				size="sm"
				className="w-full sm:w-auto"
				disabled={append.isPending || !body.trim()}
				onClick={() => {
					const trimmed = body.trim();
					if (!trimmed) return;
					void append
						.mutateAsync({
							draftId,
							body: trimmed,
							organizationId: activeOrgId,
						})
						.then(() => {
							setBody("");
							props.onPosted?.();
							toast.success("Comment added");
						})
						.catch((err) =>
							toast.error(
								err instanceof Error ? err.message : "Failed to comment",
							),
						);
				}}
			>
				{append.isPending ? "Posting…" : "Post Comment"}
			</Button>
		</div>
	);
}

/** Scrollable thread region for use inside a sheet or other container. */
export function DraftCommentsPanel(props: { className?: string }) {
	return (
		<div
			className={cn("flex min-h-0 flex-1 flex-col px-4 py-3", props.className)}
		>
			<DraftCommentsThread className="flex-1" />
		</div>
	);
}
