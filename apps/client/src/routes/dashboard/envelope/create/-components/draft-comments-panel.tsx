import { useDraftCommentAppend } from "@filosign/react/drafts";
import {
	E2eeCommentsComposer,
	E2eeCommentsPanel,
	E2eeCommentsThread,
} from "@/src/lib/components/comments/e2ee-comments";
import { useDraftCommentsContext } from "@/src/lib/domains/drafts";
import { suppressGlobalErrorToast } from "@/src/lib/errors";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export function DraftCommentsThread(props: { className?: string }) {
	const comments = useDraftCommentsContext();
	return (
		<E2eeCommentsThread
			comments={comments}
			className={props.className}
			emptyMessage="No comments yet. Leave encrypted notes for your team while you prepare this envelope."
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
	const textareaId = `draft-comment-${draftId}`;

	return (
		<E2eeCommentsComposer
			textareaId={textareaId}
			placeholder="Add an encrypted note for your team…"
			isPending={append.isPending}
			className={props.className}
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
			onPosted={props.onPosted}
		/>
	);
}

export function DraftCommentsPanel(props: { className?: string }) {
	const comments = useDraftCommentsContext();
	return (
		<E2eeCommentsPanel
			comments={comments}
			className={props.className}
			emptyMessage="No comments yet. Leave encrypted notes for your team while you prepare this envelope."
		/>
	);
}
