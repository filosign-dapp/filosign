import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { InlineLoader } from "@/src/lib/components/ui/loader";
import {
	createFormToEnvelopeForm,
	createFormToEnvelopeFormWithoutDocuments,
	EMPTY_ENVELOPE_FORM,
	hasDraftContent,
} from "@/src/lib/domains/drafts";
import {
	useStorePersist,
	useStorePersistHydrated,
} from "@/src/lib/filosign/use-store";
import { CreateEnvelopePage } from "./-components/page";
import { CreateEnvelopeProvider } from "./-lib/context/create-envelope-context";
import { EntitlementUpgradeProvider } from "./-lib/context/entitlement-upgrade-context";
import { useCreateEnvelopeController } from "./-lib/hooks/use-create-controller";
import type { EnvelopeForm } from "./-lib/types";

function CreateEnvelopeRoutePage() {
	return (
		<EntitlementUpgradeProvider>
			<CreateEnvelopeRouteContent />
		</EntitlementUpgradeProvider>
	);
}

function CreateEnvelopeRouteContent() {
	const persistHydrated = useStorePersistHydrated();
	const draftBootKey = useStorePersist((s) => s.createForm?.draftId ?? "new");
	const [bootState, setBootState] = useState<"loading" | "ready">("loading");
	const [initialValues, setInitialValues] =
		useState<EnvelopeForm>(EMPTY_ENVELOPE_FORM);
	/** Tracks draft restored from storage; skips re-bootstrap when persist only assigns `draftId`. */
	const bootedDraftIdRef = useRef<string | null>(null);
	const formShellReadyRef = useRef(false);

	useEffect(() => {
		if (!persistHydrated) return;

		const draft = useStorePersist.getState().createForm;

		if (draft?.templateContext) {
			useStorePersist.getState().clearCreateForm();
			setInitialValues(EMPTY_ENVELOPE_FORM);
			setBootState("ready");
			formShellReadyRef.current = true;
			bootedDraftIdRef.current = null;
			return;
		}

		if (!draft || !hasDraftContent(draft)) {
			setInitialValues(EMPTY_ENVELOPE_FORM);
			setBootState("ready");
			formShellReadyRef.current = true;
			bootedDraftIdRef.current = null;
			return;
		}

		// First persist after clear/upload: form already has values; only draftId was new.
		if (
			formShellReadyRef.current &&
			bootedDraftIdRef.current === null &&
			draft.draftId
		) {
			bootedDraftIdRef.current = draft.draftId;
			return;
		}

		if (
			formShellReadyRef.current &&
			bootedDraftIdRef.current === draft.draftId
		) {
			return;
		}

		let cancelled = false;
		setBootState("loading");
		formShellReadyRef.current = false;

		void createFormToEnvelopeForm(draft)
			.then((values) => {
				if (cancelled) return;
				setInitialValues(values);
				setBootState("ready");
				formShellReadyRef.current = true;
				bootedDraftIdRef.current = draft.draftId;
			})
			.catch((error) => {
				if (cancelled) return;
				console.error("Failed to restore envelope draft:", error);
				setInitialValues(createFormToEnvelopeFormWithoutDocuments(draft));
				setBootState("ready");
				formShellReadyRef.current = true;
				bootedDraftIdRef.current = draft.draftId;
			});

		return () => {
			cancelled = true;
		};
	}, [persistHydrated, draftBootKey]);

	if (!persistHydrated || bootState === "loading") {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<InlineLoader size="md" />
			</div>
		);
	}

	return <CreateEnvelopeFormShell initialValues={initialValues} />;
}

function CreateEnvelopeFormShell({
	initialValues,
}: {
	initialValues: EnvelopeForm;
}) {
	const controller = useCreateEnvelopeController(initialValues);
	return (
		<CreateEnvelopeProvider value={controller}>
			<CreateEnvelopePage />
		</CreateEnvelopeProvider>
	);
}

export const Route = createFileRoute("/dashboard/envelope/create/")({
	component: CreateEnvelopeRoutePage,
});
