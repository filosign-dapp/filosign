import { useSignDraft, useUpdateSignDraft } from "@filosign/react/files";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export function useSignDraftState(
	pieceCid: string | undefined,
	file:
		| {
				kemCiphertext?: string | null;
				encryptedEncryptionKey?: string | null;
				organizationId?: string | null;
				orgKemCiphertext?: string | null;
				orgEncryptedEncryptionKey?: string | null;
		  }
		| undefined,
	alreadySigned: boolean,
) {
	const signDraftPieceCid =
		pieceCid &&
		file &&
		(Boolean(file.kemCiphertext && file.encryptedEncryptionKey) ||
			Boolean(
				file.organizationId &&
					file.orgKemCiphertext &&
					file.orgEncryptedEncryptionKey,
			))
			? pieceCid
			: undefined;

	const { data: serverDraftIds } = useSignDraft(signDraftPieceCid);
	const updateSignDraft = useUpdateSignDraft();
	const [completedFieldIds, setCompletedFieldIds] = useState<string[]>([]);
	const [, startTransition] = useTransition();
	const hasHydratedDraftForPieceCid = useRef<string | null>(null);
	const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	useEffect(() => {
		hasHydratedDraftForPieceCid.current = null;
		setCompletedFieldIds([]);
	}, [pieceCid]);

	useEffect(() => {
		if (!pieceCid || serverDraftIds === undefined) return;
		if (hasHydratedDraftForPieceCid.current === pieceCid) return;
		hasHydratedDraftForPieceCid.current = pieceCid;
		setCompletedFieldIds((prev) => {
			return prev.length > 0 ? prev : [...serverDraftIds];
		});
	}, [pieceCid, serverDraftIds]);

	useEffect(() => {
		return () => {
			if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
		};
	}, []);

	const flushSignDraft = useCallback(
		(ids: string[]) => {
			if (!pieceCid) return;
			void updateSignDraft
				.mutateAsync({ pieceCid, completedFieldIds: ids })
				.catch((err: unknown) => {
					console.warn("[sign-draft] save failed", err);
				});
		},
		[pieceCid, updateSignDraft],
	);

	const scheduleSignDraftSave = useCallback(
		(ids: string[]) => {
			if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
			draftSaveTimerRef.current = setTimeout(() => {
				flushSignDraft(ids);
			}, 500);
		},
		[flushSignDraft],
	);

	const isMyPlacementFieldDone = useCallback(
		(fieldId: string) => alreadySigned || completedFieldIds.includes(fieldId),
		[alreadySigned, completedFieldIds],
	);

	const togglePlacementField = useCallback(
		(fieldId: string) => {
			if (alreadySigned) return;
			startTransition(() => {
				setCompletedFieldIds((prev) => {
					const isRemoving = prev.includes(fieldId);
					const next = isRemoving
						? prev.filter((x) => x !== fieldId)
						: [...prev, fieldId];
					scheduleSignDraftSave(next);
					return next;
				});
			});
		},
		[scheduleSignDraftSave, alreadySigned, startTransition],
	);

	return {
		completedFieldIds,
		isMyPlacementFieldDone,
		togglePlacementField,
	};
}
