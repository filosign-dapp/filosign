import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useSignDraft, useUpdateSignDraft } from "@filosign/react/files";
import type { FieldCompletionMap, PlacementField } from "@filosign/shared";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useSignFieldCompletions } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-field-completions";

export function useSignDraftState(
	pieceCid: string | undefined,
	file:
		| {
				participantAccess?: { canDecrypt: boolean };
		  }
		| undefined,
	alreadySigned: boolean,
	myPlacementFields: PlacementField[],
) {
	const signDraftPieceCid =
		pieceCid && file?.participantAccess?.canDecrypt ? pieceCid : undefined;
	const captureAppEvent = useCaptureAppEvent();

	const { data: serverDraft } = useSignDraft(signDraftPieceCid);
	const updateSignDraft = useUpdateSignDraft();
	const [completedFieldIds, setCompletedFieldIds] = useState<string[]>([]);
	const [fieldCompletions, setFieldCompletions] = useState<FieldCompletionMap>(
		{},
	);
	const [, startTransition] = useTransition();
	const hasHydratedDraftForPieceCid = useRef<string | null>(null);
	const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);

	const {
		applyFieldCompletion,
		setTextCompletion,
		toggleCheckboxCompletion,
		fieldHasCompletion,
	} = useSignFieldCompletions({ myPlacementFields });

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
			if (!pieceCid) return;
			void updateSignDraft
				.mutateAsync({
					pieceCid,
					completedFieldIds: ids,
					fieldCompletions: completions,
				})
				.catch((err: unknown) => {
					console.warn("[sign-draft] save failed", err);
				});
		},
		[pieceCid, updateSignDraft],
	);

	const scheduleSignDraftSave = useCallback(
		(ids: string[], completions: FieldCompletionMap) => {
			if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
			draftSaveTimerRef.current = setTimeout(() => {
				flushSignDraft(ids, completions);
			}, 500);
		},
		[flushSignDraft],
	);

	const persistDraft = useCallback(
		(ids: string[], completions: FieldCompletionMap) => {
			scheduleSignDraftSave(ids, completions);
		},
		[scheduleSignDraftSave],
	);

	const markFieldComplete = useCallback(
		(fieldId: string, completions: FieldCompletionMap) => {
			setCompletedFieldIds((prev) => {
				if (prev.includes(fieldId)) return prev;
				const next = [...prev, fieldId];
				persistDraft(next, completions);
				return next;
			});
		},
		[persistDraft],
	);

	const unmarkField = useCallback(
		(fieldId: string, completions: FieldCompletionMap) => {
			setCompletedFieldIds((prev) => {
				const next = prev.filter((x) => x !== fieldId);
				persistDraft(next, completions);
				return next;
			});
		},
		[persistDraft],
	);

	const isMyPlacementFieldDone = useCallback(
		(fieldId: string) => alreadySigned || completedFieldIds.includes(fieldId),
		[alreadySigned, completedFieldIds],
	);

	const applyPlacementField = useCallback(
		(field: PlacementField) => {
			if (alreadySigned) return;
			startTransition(() => {
				const completion = applyFieldCompletion(field);
				if (!completion) return;
				if (
					completion.valueKind === "visual" &&
					(field.type === "signature" || field.type === "initial")
				) {
					captureAppEvent(CLIENT_ANALYTICS_EVENTS.signatureApplied, {
						fieldType: field.type,
						pieceCid: pieceCid ?? null,
						valueKind: completion.valueKind,
					});
				}

				setFieldCompletions((prev) => {
					const next = { ...prev, [field.id]: completion };
					if (fieldHasCompletion(field, next)) {
						markFieldComplete(field.id, next);
					}
					persistDraft(
						completedFieldIds.includes(field.id)
							? completedFieldIds
							: [...completedFieldIds, field.id],
						next,
					);
					return next;
				});
			});
		},
		[
			alreadySigned,
			applyFieldCompletion,
			fieldHasCompletion,
			markFieldComplete,
			persistDraft,
			completedFieldIds,
			startTransition,
			captureAppEvent,
			pieceCid,
		],
	);

	const handleTextChange = useCallback(
		(fieldId: string, value: string) => {
			if (alreadySigned) return;
			startTransition(() => {
				setFieldCompletions((prev) => {
					const next = {
						...prev,
						[fieldId]: setTextCompletion(fieldId, value),
					};
					const field = myPlacementFields.find((f) => f.id === fieldId);
					if (field && value.trim()) {
						markFieldComplete(fieldId, next);
					} else if (!value.trim()) {
						unmarkField(fieldId, next);
					}
					return next;
				});
			});
		},
		[
			alreadySigned,
			myPlacementFields,
			markFieldComplete,
			setTextCompletion,
			unmarkField,
			startTransition,
		],
	);

	const handleCheckboxToggle = useCallback(
		(fieldId: string) => {
			if (alreadySigned) return;
			startTransition(() => {
				setFieldCompletions((prev) => {
					const nextCompletion = toggleCheckboxCompletion(
						fieldId,
						prev[fieldId],
					);
					const next = { ...prev, [fieldId]: nextCompletion };
					if (nextCompletion.textValue === "true") {
						markFieldComplete(fieldId, next);
					} else {
						unmarkField(fieldId, next);
					}
					return next;
				});
			});
		},
		[
			alreadySigned,
			markFieldComplete,
			toggleCheckboxCompletion,
			unmarkField,
			startTransition,
		],
	);

	return {
		completedFieldIds,
		fieldCompletions,
		isMyPlacementFieldDone,
		applyPlacementField,
		handleTextChange,
		handleCheckboxToggle,
	};
}
