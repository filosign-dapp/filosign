import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";
import {
	composeDocumentsSchema,
	composeRecipientsSchema,
} from "@/src/routes/dashboard/envelope/create/-lib/validation/envelope-compose-schema";
import { zodFieldValidator } from "@/src/routes/dashboard/envelope/create/-lib/validation/field-validator";
import DocumentsSection from "./document-upload";
import RecipientsSection from "./recipients-section";

function renderComposeDocumentsField() {
	return <DocumentsSection />;
}

function renderComposeRecipientsField() {
	return <RecipientsSection />;
}

export function ComposeDocumentsField() {
	const { form } = useCreateEnvelope();

	return (
		<form.Field
			name="documents"
			validators={{
				onSubmit: zodFieldValidator(composeDocumentsSchema),
			}}
		>
			{renderComposeDocumentsField}
		</form.Field>
	);
}

export function ComposeRecipientsField() {
	const { form } = useCreateEnvelope();

	return (
		<form.Field
			name="recipients"
			validators={{
				onSubmit: zodFieldValidator(composeRecipientsSchema),
			}}
		>
			{renderComposeRecipientsField}
		</form.Field>
	);
}
