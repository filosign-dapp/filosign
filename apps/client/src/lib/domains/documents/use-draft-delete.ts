import { useArchiveDraft } from "@filosign/react/drafts";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { isServerDraftSyncFromUrl } from "@/src/lib/domains/drafts";
import { useStorePersist } from "@/src/lib/filosign/use-store";

/** Single archive mutation + confirm dialog state for a draft list section. */
export function useDraftDelete() {
	const navigate = useNavigate();
	const archive = useArchiveDraft();
	const clearCreateForm = useStorePersist((s) => s.clearCreateForm);
	const [deleteDraftId, setDeleteDraftId] = useState<string | null>(null);
	const deleteOpen = deleteDraftId != null;

	const requestDelete = useCallback((draftId: string) => {
		setDeleteDraftId(draftId);
	}, []);

	const closeDelete = useCallback((open: boolean) => {
		if (!open) setDeleteDraftId(null);
	}, []);

	const confirmDelete = useCallback(async () => {
		if (!deleteDraftId) return;
		try {
			await archive.mutateAsync({ draftId: deleteDraftId });
			const createForm = useStorePersist.getState().createForm;
			const isActiveDraft =
				createForm?.serverDraftId === deleteDraftId ||
				(isServerDraftSyncFromUrl() &&
					typeof window !== "undefined" &&
					new URLSearchParams(window.location.search).get("serverDraftId") ===
						deleteDraftId);
			if (isActiveDraft) {
				clearCreateForm();
				if (window.location.pathname.includes("/envelope/create/add-sign")) {
					void navigate({ to: "/dashboard/drafts", replace: true });
				}
			}
			toast.success("Draft deleted");
			setDeleteDraftId(null);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to delete draft",
			);
		}
	}, [archive, clearCreateForm, deleteDraftId, navigate]);

	return {
		requestDelete,
		deleteOpen,
		closeDelete,
		confirmDelete,
		deletePending: archive.isPending,
	};
}
