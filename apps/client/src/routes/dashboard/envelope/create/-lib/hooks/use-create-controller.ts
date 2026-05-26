import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import {
	useEnvelopeRecipientLimit,
	useMonthlyDocumentQuota,
	useRefetchEntitlementsOnMount,
} from "@filosign/react/billing";
import { useForm, useStore } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import {
	useStorePersist,
	useStorePersistHydrated,
} from "@/src/lib/filosign/use-store";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import type { EnvelopeForm } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { buildCreateForm } from "@/src/routes/dashboard/envelope/create/-lib/utils/envelope-draft";

const PERSIST_DEBOUNCE_MS = 400;

export function useCreateEnvelopeController(initialValues: EnvelopeForm) {
	const navigate = useNavigate();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const persistHydrated = useStorePersistHydrated();
	const persistHydratedRef = useRef(persistHydrated);
	persistHydratedRef.current = persistHydrated;
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const captureAppEvent = useCaptureAppEvent();
	useRefetchEntitlementsOnMount();
	const { isWithinRecipientLimit } = useEnvelopeRecipientLimit();
	const { isMonthlyQuotaExhausted } = useMonthlyDocumentQuota();

	const form = useForm({
		defaultValues: initialValues,
		listeners: {
			onChangeDebounceMs: PERSIST_DEBOUNCE_MS,
			onChange: ({ formApi }) => {
				if (!persistHydratedRef.current) return;

				const value = formApi.state.values;
				const hasContent =
					value.documents.length > 0 ||
					value.recipients.length > 0 ||
					value.emailMessage.trim().length > 0 ||
					(value.settlementDrafts?.length ?? 0) > 0;
				if (!hasContent) return;

				void buildCreateForm(value, useStorePersist.getState().createForm)
					.then(setCreateForm)
					.catch((error) => console.error("Failed to persist draft:", error));
			},
		},
		onSubmit: async ({ value }) => {
			if (isMonthlyQuotaExhausted) {
				promptPlanUpgrade("documents.sent.monthly");
				return;
			}

			if (!isWithinRecipientLimit(value.recipients.length)) {
				promptPlanUpgrade("envelope.recipients.max");
				return;
			}

			try {
				const draft = await buildCreateForm(
					value,
					useStorePersist.getState().createForm,
				);
				setCreateForm(draft);

				captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeComposeSubmitted, {
					recipient_count: value.recipients.length,
				});

				navigate({ to: "/dashboard/envelope/create/add-sign" });
			} catch (error) {
				console.error("Failed to prepare documents:", error);
			}
		},
	});

	const showValidationErrors = useStore(
		form.store,
		(state) => state.submissionAttempts > 0,
	);

	return {
		form,
		showValidationErrors,
	};
}

export type CreateEnvelopeController = ReturnType<
	typeof useCreateEnvelopeController
>;
