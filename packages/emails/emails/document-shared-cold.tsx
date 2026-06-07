import DocumentSharedEmail from "./document-shared";

/** Preview wrapper for react-email dev (cold sign, initial). */
export default function DocumentSharedColdPreview() {
	return (
		<DocumentSharedEmail
			senderLabel="Alex Chen"
			ctaHref="https://app.filosign.com/?coldPieceCid=example&coldInvite=token&email=user@example.com"
			variant="cold"
			intent="initial"
			context="sign"
		/>
	);
}
