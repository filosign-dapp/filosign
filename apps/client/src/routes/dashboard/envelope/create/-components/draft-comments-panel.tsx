import { useFilosignContext } from "@filosign/react";
import {
	useDraftCommentAppend,
	useDraftCommentDelete,
	useDraftCommentUpdate,
} from "@filosign/react/drafts";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { getAddress } from "viem";
import {
	type E2eeCommentRow,
	E2eeCommentsComposer,
	E2eeCommentsPanel,
	E2eeCommentsThread,
	type E2eeCommentThreadActions,
} from "@/src/lib/components/comments/e2ee-comments";
import { useDraftCommentsContext } from "@/src/lib/domains/drafts";
import { suppressGlobalErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";

type EditingComment = { id: string; body: string } | null;

type DraftCommentsEditContextValue = {
	editingComment: EditingComment;
	setEditingComment: (value: EditingComment) => void;
	threadActions: E2eeCommentThreadActions;
	isMutating: boolean;
};

const DraftCommentsEditContext =
	createContext<DraftCommentsEditContextValue | null>(null);

function useDraftCommentsEditContext() {
	const ctx = useContext(DraftCommentsEditContext);
	if (!ctx) {
		throw new Error(
			"useDraftCommentsEditContext must be used within DraftCommentsEditProvider",
		);
	}
	return ctx;
}

export function DraftCommentsEditProvider(props: { children: ReactNode }) {
	const { draftId } = useDraftCommentsContext();
	const { wallet } = useFilosignContext();
	const [editingComment, setEditingComment] = useState<EditingComment>(null);
	const append = useDraftCommentAppend();
	const update = useDraftCommentUpdate();
	const remove = useDraftCommentDelete();

	const walletAddress = wallet?.account
		? getAddress(wallet.account.address)
		: undefined;

	const canManageComment = useCallback(
		(row: E2eeCommentRow) => {
			if (!walletAddress || !row.authorWallet) return false;
			return row.authorWallet.toLowerCase() === walletAddress.toLowerCase();
		},
		[walletAddress],
	);

	const threadActions = useMemo<E2eeCommentThreadActions>(
		() => ({
			canManageComment,
			onEditComment: (row) => {
				setEditingComment({ id: row.id, body: row.body });
			},
			onDeleteComment: (row) => {
				if (editingComment?.id === row.id) {
					setEditingComment(null);
				}
				void remove.mutateAsync(
					{ draftId, commentId: row.id },
					suppressGlobalErrorToast(),
				);
			},
		}),
		[canManageComment, draftId, editingComment?.id, remove],
	);

	const value = useMemo(
		() => ({
			editingComment,
			setEditingComment,
			threadActions,
			isMutating: append.isPending || update.isPending || remove.isPending,
		}),
		[
			editingComment,
			threadActions,
			append.isPending,
			update.isPending,
			remove.isPending,
		],
	);

	return (
		<DraftCommentsEditContext.Provider value={value}>
			{props.children}
		</DraftCommentsEditContext.Provider>
	);
}

export function DraftCommentsThread(props: { className?: string }) {
	const comments = useDraftCommentsContext();
	const { threadActions } = useDraftCommentsEditContext();
	return (
		<E2eeCommentsThread
			comments={comments}
			className={props.className}
			emptyMessage="No comments yet. Leave encrypted notes for your team while you prepare this envelope."
			actions={threadActions}
		/>
	);
}

export function DraftCommentsComposer(props: {
	onPosted?: () => void;
	className?: string;
}) {
	const { draftId } = useDraftCommentsContext();
	const activeOrgId = useStorePersist((s) => s.activeOrgId);
	const append = useDraftCommentAppend();
	const update = useDraftCommentUpdate();
	const { editingComment, setEditingComment, isMutating } =
		useDraftCommentsEditContext();
	const textareaId = `draft-comment-${draftId}`;

	return (
		<E2eeCommentsComposer
			textareaId={textareaId}
			placeholder="Add an encrypted note for your team…"
			isPending={isMutating}
			className={props.className}
			editingComment={editingComment}
			onCancelEdit={() => setEditingComment(null)}
			onPost={async (body) => {
				await append.mutateAsync(
					{
						draftId,
						body,
						organizationId: activeOrgId,
					},
					suppressGlobalErrorToast(),
				);
			}}
			onUpdate={
				editingComment
					? async (body) => {
							await update.mutateAsync(
								{
									draftId,
									commentId: editingComment.id,
									body,
								},
								suppressGlobalErrorToast(),
							);
						}
					: undefined
			}
			onPosted={props.onPosted}
		/>
	);
}

export function DraftCommentsPanel(props: { className?: string }) {
	const comments = useDraftCommentsContext();
	const { threadActions } = useDraftCommentsEditContext();
	return (
		<E2eeCommentsPanel
			comments={comments}
			className={props.className}
			emptyMessage="No comments yet. Leave encrypted notes for your team while you prepare this envelope."
			actions={threadActions}
		/>
	);
}
