import { useDraftCommentsList } from "@filosign/react/drafts";

/** Encrypted comment count for badges — avoids decrypting every comment. */
export function useDraftCommentCount(draftId: string | undefined) {
	const list = useDraftCommentsList(draftId);
	return list.data?.comments.length ?? 0;
}
