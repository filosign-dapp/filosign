import type { FieldCompletionMap, PlacementField } from "@filosign/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildTextCompletion } from "../utils/field-completion-builders";

type UseTextFieldDraftOptions = {
	pieceCid: string | undefined;
	alreadySigned: boolean;
	myPlacementFields: PlacementField[];
	fieldCompletions: FieldCompletionMap;
	setFieldCompletions: React.Dispatch<React.SetStateAction<FieldCompletionMap>>;
	setCompletedFieldIds: React.Dispatch<React.SetStateAction<string[]>>;
	persistDraft: (ids: string[], completions: FieldCompletionMap) => void;
};

export function useTextFieldDraft(options: UseTextFieldDraftOptions) {
	const {
		pieceCid,
		alreadySigned,
		myPlacementFields,
		fieldCompletions,
		setFieldCompletions,
		setCompletedFieldIds,
		persistDraft,
	} = options;

	const [textDrafts, setTextDrafts] = useState<Record<string, string>>({});
	const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
	const textDraftsRef = useRef(textDrafts);
	textDraftsRef.current = textDrafts;

	useEffect(() => {
		setTextDrafts({});
		setEditingFieldId(null);
	}, [pieceCid]);

	const getProtectedFieldIds = useCallback((): readonly string[] => {
		if (editingFieldId) return [editingFieldId];
		return [];
	}, [editingFieldId]);

	const commitTextDraft = useCallback(
		(fieldId: string, commitOptions?: { clearDraft?: boolean }) => {
			if (alreadySigned) return;

			const field = myPlacementFields.find((f) => f.id === fieldId);
			if (!field) return;

			setFieldCompletions((prevCompletions) => {
				const draftValue =
					textDraftsRef.current[fieldId] ??
					prevCompletions[fieldId]?.textValue ??
					"";
				const trimmed = draftValue.trim();

				let nextCompletions: FieldCompletionMap;
				if (trimmed) {
					nextCompletions = {
						...prevCompletions,
						[fieldId]: buildTextCompletion(fieldId, draftValue),
					};
				} else {
					nextCompletions = { ...prevCompletions };
					delete nextCompletions[fieldId];
				}

				setCompletedFieldIds((prevIds) => {
					const nextIds = trimmed
						? prevIds.includes(fieldId)
							? prevIds
							: [...prevIds, fieldId]
						: prevIds.filter((id) => id !== fieldId);
					persistDraft(nextIds, nextCompletions);
					return nextIds;
				});

				return nextCompletions;
			});

			if (commitOptions?.clearDraft) {
				setTextDrafts((prev) => {
					if (!(fieldId in prev)) return prev;
					const next = { ...prev };
					delete next[fieldId];
					return next;
				});
			}
		},
		[
			alreadySigned,
			myPlacementFields,
			persistDraft,
			setCompletedFieldIds,
			setFieldCompletions,
		],
	);

	const handleTextDraftChange = useCallback(
		(fieldId: string, value: string) => {
			if (alreadySigned) return;
			setTextDrafts((prev) => ({ ...prev, [fieldId]: value }));
		},
		[alreadySigned],
	);

	const handleTextFocus = useCallback(
		(fieldId: string) => {
			if (alreadySigned) return;
			setEditingFieldId(fieldId);
			setTextDrafts((prev) => {
				if (fieldId in prev) return prev;
				const committed = fieldCompletions[fieldId]?.textValue ?? "";
				return { ...prev, [fieldId]: committed };
			});
		},
		[alreadySigned, fieldCompletions],
	);

	const handleTextBlur = useCallback(
		(fieldId: string) => {
			if (alreadySigned) return;
			setEditingFieldId((current) => (current === fieldId ? null : current));
			commitTextDraft(fieldId, { clearDraft: true });
		},
		[alreadySigned, commitTextDraft],
	);

	const getTextFieldValue = useCallback(
		(fieldId: string) => {
			if (fieldId in textDrafts) return textDrafts[fieldId];
			return fieldCompletions[fieldId]?.textValue ?? "";
		},
		[fieldCompletions, textDrafts],
	);

	const flushAllTextDrafts = useCallback(
		(
			baseCompletions: FieldCompletionMap,
			baseCompletedIds: string[],
		): {
			completions: FieldCompletionMap;
			completedFieldIds: string[];
		} => {
			if (alreadySigned) {
				return {
					completions: baseCompletions,
					completedFieldIds: baseCompletedIds,
				};
			}

			const fieldIdsToFlush = new Set<string>(
				Object.keys(textDraftsRef.current),
			);
			if (editingFieldId) fieldIdsToFlush.add(editingFieldId);

			let nextCompletions = { ...baseCompletions };
			let nextCompleted = [...baseCompletedIds];

			for (const fieldId of fieldIdsToFlush) {
				const field = myPlacementFields.find((f) => f.id === fieldId);
				if (!field) continue;

				const draftValue =
					textDraftsRef.current[fieldId] ??
					nextCompletions[fieldId]?.textValue ??
					"";
				const trimmed = draftValue.trim();

				if (trimmed) {
					nextCompletions = {
						...nextCompletions,
						[fieldId]: buildTextCompletion(fieldId, draftValue),
					};
					if (!nextCompleted.includes(fieldId)) {
						nextCompleted = [...nextCompleted, fieldId];
					}
				} else {
					const next = { ...nextCompletions };
					delete next[fieldId];
					nextCompletions = next;
					nextCompleted = nextCompleted.filter((id) => id !== fieldId);
				}
			}

			setTextDrafts({});
			setEditingFieldId(null);

			return { completions: nextCompletions, completedFieldIds: nextCompleted };
		},
		[alreadySigned, editingFieldId, myPlacementFields],
	);

	return {
		getTextFieldValue,
		handleTextDraftChange,
		handleTextFocus,
		handleTextBlur,
		getProtectedFieldIds,
		flushAllTextDrafts,
	};
}
