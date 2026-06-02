import { useEffect, useState } from "react";
import {
	attachmentPacketDraftsNeedHydration,
	hydrateAttachmentPacketDrafts,
} from "@/src/lib/domains/drafts/envelope-local-draft";
import type { AttachmentPacketComposeDraft } from "@/src/lib/domains/files/attachment-packet-compose";
import { useStorePersist } from "@/src/lib/filosign/use-store";

/** Loads supplementary file bytes from IndexedDB into `createForm` when localStorage only has metadata. */
export function useHydrateAttachmentPacketDrafts(
	draftId: string | undefined,
	drafts: AttachmentPacketComposeDraft[] | undefined,
) {
	const setCreateForm = useStorePersist((s) => s.setCreateForm);
	const [hydrating, setHydrating] = useState(false);
	const [hydrateError, setHydrateError] = useState<string | null>(null);

	const needsHydration = attachmentPacketDraftsNeedHydration(drafts);

	useEffect(() => {
		if (!draftId || !drafts?.length || !needsHydration) {
			setHydrating(false);
			setHydrateError(null);
			return;
		}

		let cancelled = false;
		setHydrating(true);
		setHydrateError(null);

		void hydrateAttachmentPacketDrafts(draftId, drafts)
			.then((hydrated) => {
				if (cancelled) return;
				const prev = useStorePersist.getState().createForm;
				if (!prev) return;
				setCreateForm({
					...prev,
					attachmentPacketDrafts: hydrated,
				});
			})
			.catch((error) => {
				if (cancelled) return;
				setHydrateError(
					error instanceof Error
						? error.message
						: "Could not load supplementary files",
				);
			})
			.finally(() => {
				if (!cancelled) {
					setHydrating(false);
				}
			});

		return () => {
			cancelled = true;
		};
		// `drafts` intentionally omitted: re-run when hydration is required, not on every store update.
	}, [draftId, needsHydration, setCreateForm]);

	return { hydrating, hydrateError, needsHydration };
}
