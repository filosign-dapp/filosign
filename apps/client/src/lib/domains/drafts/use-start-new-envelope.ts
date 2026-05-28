import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { clearPersistedCreateFormFromDisk } from "@/src/lib/domains/drafts/utils/draft-form-state";
import { useStorePersist } from "@/src/lib/filosign/use-store";

/** Drop in-memory compose state and stale localStorage `createForm`. */
export function resetEnvelopeComposer(): void {
	useStorePersist.getState().clearCreateForm();
	clearPersistedCreateFormFromDisk();
}

/** Dashboard CTAs that must start a blank envelope (not resume the open server draft). */
export function useStartNewEnvelope() {
	const navigate = useNavigate();
	const clearCreateForm = useStorePersist((s) => s.clearCreateForm);

	return useCallback(() => {
		clearCreateForm();
		clearPersistedCreateFormFromDisk();
		void navigate({ to: "/dashboard/envelope/create" });
	}, [clearCreateForm, navigate]);
}
