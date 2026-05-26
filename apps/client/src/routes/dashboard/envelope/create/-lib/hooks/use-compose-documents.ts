import { useStore } from "@tanstack/react-form";
import { useCreateEnvelope } from "@/src/routes/dashboard/envelope/create/-lib/context/create-envelope-context";
import type { UploadedFile } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { fieldErrorMessage } from "@/src/routes/dashboard/envelope/create/-lib/validation/field-validator";

export function useComposeDocuments() {
	const { form, showValidationErrors } = useCreateEnvelope();
	const documents = useStore(form.store, (state) => state.values.documents);
	const errors = useStore(
		form.store,
		(state) => state.fieldMeta.documents?.errors,
	);

	return {
		documents,
		onChange: (next: UploadedFile[]) => form.setFieldValue("documents", next),
		error: fieldErrorMessage(errors),
		showError: showValidationErrors,
	};
}
