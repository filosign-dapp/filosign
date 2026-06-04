import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { showAppErrorToast } from "@/src/lib/errors";
import { cn, truncateAddress } from "@/src/lib/utils/utils";

const commentTimeFormatter = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	hour: "numeric",
	minute: "2-digit",
});

export type E2eeCommentRow = {
	id: string;
	body: string;
	authorWallet: string | null | undefined;
	createdAt: string;
};

function sortCommentsOldestFirst(items: E2eeCommentRow[]) {
	return [...items].sort(
		(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	);
}

export type E2eeCommentsQuery = {
	data: E2eeCommentRow[] | undefined;
	isLoading: boolean;
	isPending: boolean;
	isError: boolean;
	error: unknown;
};

export function E2eeCommentsThread(props: {
	comments: E2eeCommentsQuery;
	className?: string;
	emptyMessage: string;
}) {
	const sorted = useMemo(
		() => sortCommentsOldestFirst(props.comments.data ?? []),
		[props.comments.data],
	);

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
				<div className="px-1 py-6 text-center text-sm text-muted-foreground">
					<p className="text-pretty">{props.emptyMessage}</p>
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
										: "Participant"}
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

export function E2eeCommentsComposer(props: {
	textareaId: string;
	placeholder: string;
	isPending: boolean;
	onPost: (body: string) => Promise<void>;
	onPosted?: () => void;
	className?: string;
}) {
	const [body, setBody] = useState("");

	return (
		<div className={cn("space-y-3", props.className)}>
			<div className="space-y-2">
				<Label htmlFor={props.textareaId}>New comment</Label>
				<Textarea
					id={props.textareaId}
					value={body}
					onChange={(e) => setBody(e.target.value)}
					placeholder={props.placeholder}
					rows={3}
					className="resize-none"
				/>
			</div>
			<Button
				type="button"
				variant="primary"
				size="sm"
				className="w-full sm:w-auto"
				disabled={props.isPending || !body.trim()}
				onClick={() => {
					const trimmed = body.trim();
					if (!trimmed) return;
					void props
						.onPost(trimmed)
						.then(() => {
							setBody("");
							props.onPosted?.();
							toast.success("Comment added");
						})
						.catch((err) => showAppErrorToast(err));
				}}
			>
				{props.isPending ? "Posting…" : "Post Comment"}
			</Button>
		</div>
	);
}

export function E2eeCommentsPanel(props: {
	comments: E2eeCommentsQuery;
	className?: string;
	emptyMessage: string;
}) {
	return (
		<div
			className={cn("flex min-h-0 flex-1 flex-col px-4 py-3", props.className)}
		>
			<E2eeCommentsThread
				comments={props.comments}
				className="flex-1"
				emptyMessage={props.emptyMessage}
			/>
		</div>
	);
}
