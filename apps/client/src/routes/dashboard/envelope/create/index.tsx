import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import {
	useStorePersist,
	useStorePersistHydrated,
} from "@/src/lib/filosign/use-store";
import { CreateEnvelopePage } from "./-components/page";
import { CreateEnvelopeProvider } from "./-lib/context/create-envelope-context";
import { EntitlementUpgradeProvider } from "./-lib/context/entitlement-upgrade-context";
import { useCreateEnvelopeController } from "./-lib/hooks/use-create-controller";
import type { EnvelopeForm } from "./-lib/types";
import {
	createFormToEnvelopeForm,
	createFormToEnvelopeFormWithoutDocuments,
	EMPTY_ENVELOPE_FORM,
	hasDraftContent,
} from "./-lib/utils/envelope-draft";

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

	useEffect(() => {
		if (!persistHydrated) return;

		const draft = useStorePersist.getState().createForm;
		if (!draft || !hasDraftContent(draft)) {
			setInitialValues(EMPTY_ENVELOPE_FORM);
			setBootState("ready");
			return;
		}

		let cancelled = false;
		setBootState("loading");

		void createFormToEnvelopeForm(draft)
			.then((values) => {
				if (cancelled) return;
				setInitialValues(values);
				setBootState("ready");
			})
			.catch((error) => {
				if (cancelled) return;
				console.error("Failed to restore envelope draft:", error);
				setInitialValues(createFormToEnvelopeFormWithoutDocuments(draft));
				setBootState("ready");
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

	return (
		<CreateEnvelopeFormShell key={draftBootKey} initialValues={initialValues} />
	);
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
