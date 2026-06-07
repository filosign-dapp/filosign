import DocumentSharedEmail from "./document-shared";

/** Preview wrapper for react-email dev (warm sign, reminder). */
export default function DocumentSharedReminderPreview() {
	return (
		<DocumentSharedEmail
			senderLabel="Alex Chen"
			ctaHref="https://app.filosign.com/dashboard/document/sign?pieceCid=example"
			variant="warm"
			intent="reminder"
			context="sign"
		/>
	);
}
