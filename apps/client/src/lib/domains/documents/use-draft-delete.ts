import { useArchiveDraft } from "@filosign/react/drafts";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useStorePersist } from "@/src/lib/filosign/use-store";

/** Single archive mutation + confirm dialog state for a draft list section. */
export function useDraftDelete() {
	const archive = useArchiveDraft();
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
			if (createForm?.serverDraftId === deleteDraftId) {
				useStorePersist.getState().setCreateForm({
					...createForm,
					serverDraftId: undefined,
					serverDraftRevision: undefined,
				});
			}
			toast.success("Draft deleted");
			setDeleteDraftId(null);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to delete draft",
			);
		}
	}, [archive, deleteDraftId]);

	return {
		requestDelete,
		deleteOpen,
		closeDelete,
		confirmDelete,
		deletePending: archive.isPending,
	};
}
