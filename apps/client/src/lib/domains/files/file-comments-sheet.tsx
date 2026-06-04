import type { PieceFileDekSource } from "@filosign/react/files";
import { useFileCommentAppend } from "@filosign/react/files";
import { ChatCircleDotsIcon } from "@phosphor-icons/react";
import {
	E2eeCommentsComposer,
	E2eeCommentsPanel,
} from "@/src/lib/components/comments/e2ee-comments";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/src/lib/components/ui/sheet";
import {
	FileCommentsProvider,
	useFileCommentsContext,
} from "@/src/lib/domains/files/file-comments-context";
import { suppressGlobalErrorToast } from "@/src/lib/errors";

function FileCommentsSheetBody() {
	const comments = useFileCommentsContext();
	const { pieceCid, dekSource } = comments;
	const append = useFileCommentAppend();
	const textareaId = `file-comment-${pieceCid}`;

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<E2eeCommentsPanel
				comments={comments}
				emptyMessage="No comments yet. Coordinate signer changes or recall with encrypted notes visible to everyone who can open this envelope."
			/>
			<div className="shrink-0 border-t border-border px-4 py-3">
				<E2eeCommentsComposer
					textareaId={textareaId}
					placeholder="Add an encrypted note for participants…"
					isPending={append.isPending}
					onPost={async (body) => {
						await append.mutateAsync(
							{
								pieceCid,
								body,
								dekSource,
								organizationId: dekSource.organizationId,
							},
							suppressGlobalErrorToast(),
						);
					}}
				/>
			</div>
		</div>
	);
}

export function FileCommentsSheet(props: {
	pieceCid: string;
	dekSource: PieceFileDekSource;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	enabled?: boolean;
}) {
	const canDecrypt = Boolean(
		(props.dekSource.orgKemCiphertext && props.dekSource.organizationId) ||
			(props.dekSource.kemCiphertext && props.dekSource.encryptedEncryptionKey),
	);

	return (
		<Sheet open={props.open} onOpenChange={props.onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
			>
				<SheetHeader className="shrink-0 border-b border-border px-4 py-4 text-left">
					<SheetTitle className="flex items-center gap-2 text-base">
						<ChatCircleDotsIcon className="size-5" aria-hidden />
						Envelope comments
					</SheetTitle>
					<SheetDescription>
						End-to-end encrypted thread for amendment and recall coordination.
					</SheetDescription>
				</SheetHeader>
				{canDecrypt && props.enabled !== false ? (
					<FileCommentsProvider
						pieceCid={props.pieceCid}
						dekSource={props.dekSource}
						enabled={props.open}
					>
						<FileCommentsSheetBody />
					</FileCommentsProvider>
				) : (
					<p className="px-4 py-6 text-sm text-muted-foreground">
						Open and acknowledge this document before posting comments.
					</p>
				)}
			</SheetContent>
		</Sheet>
	);
}

export function FileCommentsTrigger(props: {
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={props.onClick}
			disabled={props.disabled}
			className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 disabled:opacity-50"
		>
			<ChatCircleDotsIcon className="size-4" aria-hidden />
			Comments
		</button>
	);
}
