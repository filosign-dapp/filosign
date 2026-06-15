import { useCallback, useMemo, useRef, useState } from "react";
import { resolveCreateFormSnapshotDigest } from "@/src/lib/domains/drafts";
import type { TemplateEditorMode } from "@/src/lib/domains/templates/template-editor-mode";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export function useTemplateEditorLeaveGuard(mode: TemplateEditorMode) {
	const createForm = useStorePersist((state) => state.createForm);
	const clearCreateForm = useStorePersist((state) => state.clearCreateForm);
	const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
	const pendingNavigationRef = useRef<(() => void) | null>(null);

	const isDirty = useMemo(() => {
		if (!createForm || mode === "preview") return false;
		if (mode === "create") {
			return createForm.documents.length > 0;
		}
		const digest = resolveCreateFormSnapshotDigest(createForm);
		return digest !== (createForm.lastSavedSnapshotDigest ?? "");
	}, [createForm, mode]);

	const requestLeave = useCallback(
		(navigate: () => void) => {
			if (!isDirty) {
				navigate();
				return;
			}
			pendingNavigationRef.current = navigate;
			setLeaveDialogOpen(true);
		},
		[isDirty],
	);

	const confirmLeave = useCallback(() => {
		clearCreateForm();
		setLeaveDialogOpen(false);
		pendingNavigationRef.current?.();
		pendingNavigationRef.current = null;
	}, [clearCreateForm]);

	const cancelLeave = useCallback(() => {
		setLeaveDialogOpen(false);
		pendingNavigationRef.current = null;
	}, []);

	return {
		isDirty,
		leaveDialogOpen,
		setLeaveDialogOpen,
		requestLeave,
		confirmLeave,
		cancelLeave,
	};
}
