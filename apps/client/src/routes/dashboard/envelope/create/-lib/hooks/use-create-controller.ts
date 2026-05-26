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
import { useCallback, useMemo, useRef, useState } from "react";
import {
	useStorePersist,
	useStorePersistHydrated,
} from "@/src/lib/filosign/use-store";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/context/entitlement-upgrade-context";
import type { EnvelopeForm } from "@/src/routes/dashboard/envelope/create/-lib/types";
import { setDraftPreviewCache } from "@/src/routes/dashboard/envelope/create/-lib/utils/draft-preview-cache";
import {
	buildCreateForm,
	EMPTY_ENVELOPE_FORM,
	hasDraftContent,
	hasEnvelopeFormContent,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/envelope-draft";

const PERSIST_DEBOUNCE_MS = 400;

export function useCreateEnvelopeController(initialValues: EnvelopeForm) {
	const navigate = useNavigate();
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const clearCreateForm = useStorePersist((s) => s.clearCreateForm);
	const persistHydrated = useStorePersistHydrated();
	const persistHydratedRef = useRef(persistHydrated);
	persistHydratedRef.current = persistHydrated;
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const captureAppEvent = useCaptureAppEvent();
	useRefetchEntitlementsOnMount();
	const { isWithinRecipientLimit } = useEnvelopeRecipientLimit();
	const { isMonthlyQuotaExhausted } = useMonthlyDocumentQuota();
	const [isAdvancing, setIsAdvancing] = useState(false);

	const form = useForm({
		defaultValues: initialValues,
		listeners: {
			onChangeDebounceMs: PERSIST_DEBOUNCE_MS,
			onChange: ({ formApi }) => {
				if (!persistHydratedRef.current) return;

				const value = formApi.state.values;
				const prevDraft = useStorePersist.getState().createForm;
				const hasContent = hasEnvelopeFormContent(value);
				const prevHadContent = hasDraftContent(prevDraft);
				if (!hasContent && !prevHadContent) return;

				void buildCreateForm(value, prevDraft)
					.then(setCreateForm)
					.catch((error) => console.error("Failed to persist draft:", error));
			},
		},
		onSubmit: async ({ value }) => {
			setIsAdvancing(true);
			try {
				if (isMonthlyQuotaExhausted) {
					promptPlanUpgrade("documents.sent.monthly");
					return;
				}

				if (!isWithinRecipientLimit(value.recipients.length)) {
					promptPlanUpgrade("envelope.recipients.max");
					return;
				}

				const draft = await buildCreateForm(
					value,
					useStorePersist.getState().createForm,
				);
				setCreateForm(draft);
				setDraftPreviewCache(draft.draftId, value.documents);

				captureAppEvent(CLIENT_ANALYTICS_EVENTS.envelopeComposeSubmitted, {
					recipient_count: value.recipients.length,
				});

				navigate({ to: "/dashboard/envelope/create/add-sign" });
			} catch (error) {
				console.error("Failed to prepare documents:", error);
			} finally {
				setIsAdvancing(false);
			}
		},
	});

	const showValidationErrors = useStore(
		form.store,
		(state) => state.submissionAttempts > 0,
	);

	const hasContent = useStore(form.store, (state) =>
		hasEnvelopeFormContent(state.values),
	);

	const clearForm = useCallback(() => {
		clearCreateForm();
		form.reset(EMPTY_ENVELOPE_FORM);
	}, [clearCreateForm, form]);

	return useMemo(
		() => ({
			form,
			showValidationErrors,
			isAdvancing,
			hasContent,
			clearForm,
		}),
		[form, showValidationErrors, isAdvancing, hasContent, clearForm],
	);
}

export type CreateEnvelopeController = ReturnType<
	typeof useCreateEnvelopeController
>;
