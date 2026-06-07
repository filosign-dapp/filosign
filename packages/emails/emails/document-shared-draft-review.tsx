import DocumentSharedEmail from "./document-shared";

/** Preview wrapper for react-email dev (warm draft review). */
export default function DocumentSharedDraftReviewPreview() {
	return (
		<DocumentSharedEmail
			senderLabel="Alex Chen"
			ctaHref="https://app.filosign.com/draft/review?token=example"
			variant="warm"
			intent="initial"
			context="draft_review"
			documentTitle="Q3 Vendor Agreement"
		/>
	);
}
