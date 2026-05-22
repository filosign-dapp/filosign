import { EntitlementPlanHint } from "@/src/lib/domains/entitlements/entitlement-plan-hint";
import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";
import { EnvelopeDraftProvider } from "@/src/routes/dashboard/envelope/create/-lib/context/envelope-draft-context";
import DocumentsSection from "./document-upload";
import RecipientsSection from "./recipients-section";

export function EnvelopeFormBody() {
	const {
		form,
		showValidationErrors,
		documentsSubmitError,
		isValidRecipientEmail,
	} = useCreateEnvelope();

	return (
		<main className="p-8 mx-auto space-y-8 max-w-4xl">
			<EntitlementPlanHint />
			<form.Field
				name="documents"
				validators={{
					onChange: ({ value }) => {
						if (!value || value.length === 0) {
							return "Please upload at least one document";
						}
						return undefined;
					},
				}}
			>
				{(documentsField) => (
					<form.Field
						name="recipients"
						validators={{
							onChange: ({ value }) => {
								if (!value || value.length === 0) {
									return "Please add at least one recipient";
								}
								const invalid = value.filter(
									(r) => !isValidRecipientEmail(r.email ?? ""),
								);
								if (invalid.length > 0) {
									return "Enter a valid email for every recipient";
								}
								return undefined;
							},
						}}
					>
						{(recipientsField) => (
							<form.Field name="settlementDrafts">
								{(settlementDraftsField) => (
									<EnvelopeDraftProvider
										value={{
											documentsField: {
												value: documentsField.state.value,
												onChange: documentsField.handleChange,
												error:
													documentsField.state.meta.errors?.[0] ??
													documentsSubmitError,
												showError: showValidationErrors,
											},
											recipientsField: {
												value: recipientsField.state.value,
												onChange: recipientsField.handleChange,
												error: recipientsField.state.meta.errors?.[0],
												showError: showValidationErrors,
											},
											settlementDraftsField: {
												value: settlementDraftsField.state.value ?? [],
												onChange: settlementDraftsField.handleChange,
											},
										}}
									>
										<DocumentsSection />
										<RecipientsSection />
									</EnvelopeDraftProvider>
								)}
							</form.Field>
						)}
					</form.Field>
				)}
			</form.Field>
		</main>
	);
}
