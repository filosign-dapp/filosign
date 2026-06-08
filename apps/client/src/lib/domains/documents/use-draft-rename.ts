import { useRenameDraft } from "@filosign/react/drafts";
import { useCallback, useState } from "react";
import { toast } from "sonner";

/** Rename dialog state + mutation for draft rows in document lists. */
export function useDraftRename() {
	const rename = useRenameDraft();
	const [renameTarget, setRenameTarget] = useState<{
		id: string;
		title: string;
	} | null>(null);
	const renameOpen = renameTarget != null;

	const requestRename = useCallback((draftId: string, currentTitle: string) => {
		setRenameTarget({ id: draftId, title: currentTitle });
	}, []);

	const closeRename = useCallback((open: boolean) => {
		if (!open) setRenameTarget(null);
	}, []);

	const confirmRename = useCallback(
		async (title: string) => {
			if (!renameTarget) return;
			const trimmed = title.trim();
			if (!trimmed) return;
			try {
				await rename.mutateAsync({
					draftId: renameTarget.id,
					title: trimmed,
				});
				toast.success("Draft renamed");
				setRenameTarget(null);
			} catch {}
		},
		[rename, renameTarget],
	);

	return {
		requestRename,
		renameOpen,
		renameTarget,
		closeRename,
		confirmRename,
		renamePending: rename.isPending,
	};
}
