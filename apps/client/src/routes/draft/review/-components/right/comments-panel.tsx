import {
	useDraftCommentAppend,
	useDraftCommentsDecrypted,
} from "@filosign/react/drafts";
import { SidebarSection } from "@/src/lib/components/app/sidebar/section";
import {
	E2eeCommentsComposer,
	E2eeCommentsThread,
} from "@/src/lib/components/comments/e2ee-comments";
import { suppressGlobalErrorToast } from "@/src/lib/errors";
import { useDraftReviewControllerSlice } from "@/src/routes/draft/review/-lib/context/context";

export function DraftReviewCommentsPanel() {
	const { token, data, decrypted, isUnlocked } =
		useDraftReviewControllerSlice();
	const draftId = data?.draftId;
	const reviewDek = decrypted?.reviewDek;

	const comments = useDraftCommentsDecrypted({
		draftId,
		inviteToken: token,
		reviewDek,
	});

	const append = useDraftCommentAppend();

	if (!isUnlocked || !draftId || !reviewDek) return null;

	return (
		<div className="flex min-h-0 shrink-0 flex-col border-t border-border bg-background">
			<SidebarSection
				title="Comments"
				className="flex min-h-0 flex-col px-5 pb-4"
			>
				<E2eeCommentsThread
					comments={comments}
					className="max-h-52 min-h-0 overflow-y-auto"
					emptyMessage="No comments yet."
				/>
				<E2eeCommentsComposer
					textareaId={`draft-review-comment-${draftId}`}
					placeholder="Add an encrypted comment…"
					isPending={append.isPending}
					className="mt-3"
					onPost={async (body) => {
						await append.mutateAsync(
							{
								draftId,
								body,
								inviteToken: token,
								reviewDek,
							},
							suppressGlobalErrorToast(),
						);
					}}
				/>
			</SidebarSection>
		</div>
	);
}
