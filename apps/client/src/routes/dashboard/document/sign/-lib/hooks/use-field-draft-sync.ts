import { useUpdateSignDraft } from "@filosign/react/files";
import type { FieldCompletionMap } from "@filosign/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { mergePersistedFieldCompletions } from "../utils/field-draft-merge";

type SignDraftSnapshot = {
	completedFieldIds: string[];
	fieldCompletions: FieldCompletionMap;
};

export function useFieldDraftSync(options: {
	pieceCid: string | undefined;
	signDraftPieceCid: string | undefined;
	serverDraft: SignDraftSnapshot | undefined;
	draftLoading: boolean;
	getProtectedFieldIds?: () => readonly string[];
}) {
	const {
		pieceCid,
		signDraftPieceCid,
		serverDraft,
		draftLoading,
		getProtectedFieldIds,
	} = options;
	const updateSignDraft = useUpdateSignDraft();

	const [completedFieldIds, setCompletedFieldIds] = useState<string[]>([]);
	const [fieldCompletions, setFieldCompletions] = useState<FieldCompletionMap>(
		{},
	);
	const hasHydratedDraftForPieceCid = useRef<string | null>(null);
	const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	useEffect(() => {
		hasHydratedDraftForPieceCid.current = null;
		setCompletedFieldIds([]);
		setFieldCompletions({});
	}, [pieceCid]);

	useEffect(() => {
		if (!pieceCid || serverDraft === undefined) return;
		if (hasHydratedDraftForPieceCid.current === pieceCid) return;
		hasHydratedDraftForPieceCid.current = pieceCid;
		setCompletedFieldIds((prev) =>
			prev.length > 0 ? prev : [...serverDraft.completedFieldIds],
		);
		setFieldCompletions((prev) =>
			Object.keys(prev).length > 0 ? prev : { ...serverDraft.fieldCompletions },
		);
	}, [pieceCid, serverDraft]);

	useEffect(() => {
		return () => {
			if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
		};
	}, []);

	const flushSignDraft = useCallback(
		(ids: string[], completions: FieldCompletionMap) => {
			if (!signDraftPieceCid) return;
			void updateSignDraft
				.mutateAsync({
					pieceCid: signDraftPieceCid,
					completedFieldIds: ids,
					fieldCompletions: completions,
				})
				.then((data) => {
					setFieldCompletions((prev) =>
						mergePersistedFieldCompletions(
							prev,
							data.fieldCompletions,
							getProtectedFieldIds?.() ?? [],
						),
					);
				})
				.catch((err: unknown) => {
					console.warn("[sign-field-session] save failed", err);
				});
		},
		[getProtectedFieldIds, signDraftPieceCid, updateSignDraft],
	);

	const persistDraft = useCallback(
		(ids: string[], completions: FieldCompletionMap) => {
			if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
			draftSaveTimerRef.current = setTimeout(() => {
				flushSignDraft(ids, completions);
			}, 500);
		},
		[flushSignDraft],
	);

	const isHydrating =
		Boolean(signDraftPieceCid) &&
		(draftLoading || (Boolean(pieceCid) && serverDraft === undefined));

	return {
		completedFieldIds,
		setCompletedFieldIds,
		fieldCompletions,
		setFieldCompletions,
		persistDraft,
		isHydrating,
		isSaving: updateSignDraft.isPending,
	};
}
