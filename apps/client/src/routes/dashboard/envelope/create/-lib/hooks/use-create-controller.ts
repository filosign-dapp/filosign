import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import {
	useEnvelopeRecipientLimit,
	useMonthlyDocumentQuota,
	useRefetchEntitlementsOnMount,
} from "@filosign/react/billing";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import type {
	EnvelopeForm,
	StoredDocument,
} from "@/src/routes/dashboard/envelope/create/-lib/types";
import { isValidRecipientEmail } from "@/src/routes/dashboard/envelope/create/-lib/utils/recipient-email";

export function useCreateEnvelopeController() {
	const navigate = useNavigate();
	const { setCreateForm } = useStorePersist();
	const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const captureAppEvent = useCaptureAppEvent();
	useRefetchEntitlementsOnMount();
	const { isWithinRecipientLimit } = useEnvelopeRecipientLimit();
	const { isMonthlyQuotaExhausted } = useMonthlyDocumentQuota();

	const form = useForm({
		defaultValues: {
			recipients: [],
			emailMessage: "",
			emailSubject: "",
			documents: [],
			settlementDrafts: [],
		} as EnvelopeForm,
		onSubmit: async ({ value }) => {
			if (isMonthlyQuotaExhausted) {
				promptPlanUpgrade("documents.sent.monthly");
				return;
			}

			if (!value.documents || value.documents.length === 0) {
				toast.error("Please upload at least one document");
				return;
			}

			if (!value.recipients || value.recipients.length === 0) {
				toast.error("Please add at least one recipient");
				return;
			}

			const invalidRecipients = value.recipients.filter(
				(r) => !isValidRecipientEmail(r.email ?? ""),
			);
			if (invalidRecipients.length > 0) {
				toast.error("Enter a valid email for every recipient");
				return;
			}

			if (!isWithinRecipientLimit(value.recipients.length)) {
				promptPlanUpgrade("envelope.recipients.max");
				return;
			}

			try {
				const storedDocuments: StoredDocument[] = await Promise.all(
					value.documents.map(async (doc) => {
						const dataUrl = await new Promise<string>((resolve, reject) => {
							const reader = new FileReader();
							reader.onload = () => resolve(reader.result as string);
							reader.onerror = reject;
							reader.readAsDataURL(doc.file);
						});

						return {
							id: doc.id,
							name: doc.name,
							size: doc.size,
							type: doc.type,
							dataUrl,
						};
					}),
				);

				setCreateForm({
					recipients: value.recipients,
					emailMessage: value.emailMessage,
					emailSubject: "",
					documents: storedDocuments,
					settlementDrafts: value.settlementDrafts ?? [],
				});

				captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeComposeSubmitted, {
					recipient_count: value.recipients.length,
				});

				navigate({ to: "/dashboard/envelope/create/add-sign" });
			} catch (error) {
				console.error("Failed to prepare documents:", error);
				toast.error("Failed to prepare documents. Please try again.", {
					id: "prepare-progress",
				});
			}
		},
	});

	const showValidationErrors = hasAttemptedSubmit;

	const documentsSubmitError = useMemo(
		() =>
			showValidationErrors && form.state.values.documents.length === 0
				? "Please upload at least one document"
				: undefined,
		[showValidationErrors, form.state.values.documents.length],
	);

	const handleSubmitAttempt = () => {
		setHasAttemptedSubmit(true);
		void form.handleSubmit();
	};

	return {
		form,
		showValidationErrors,
		documentsSubmitError,
		handleSubmitAttempt,
		isValidRecipientEmail,
	};
}

export type CreateEnvelopeController = ReturnType<
	typeof useCreateEnvelopeController
>;
