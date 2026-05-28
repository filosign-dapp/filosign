import { useEntitlements } from "@filosign/react/billing";
import { useDraftCommentsList } from "@filosign/react/drafts";

/** Encrypted comment count for badges — avoids decrypting every comment. */
export function useDraftCommentCount(draftId: string | undefined) {
	const { data: entitlements } = useEntitlements();
	const planId = entitlements?.planId;
	const showComments = planId && planId !== "free" && planId !== "individual";

	const list = useDraftCommentsList(draftId, {
		enabled: Boolean(showComments),
	});
	return list.data?.comments.length ?? 0;
}
