import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useSignDraft } from "@filosign/react/files";
import type {
	FieldCompletion,
	FieldCompletionMap,
	FieldCompletionWireRow,
	PlacementField,
} from "@filosign/shared";
import {
	fieldCompletionStateFromWireRows,
	fieldCompletionStatus,
	fieldHasCompletionValue,
} from "@filosign/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { showAppErrorToast } from "@/src/lib/errors/present-app-error";
import { buildCheckboxCompletion } from "../utils/field-completion-builders";
import { useFieldDraftSync } from "./use-field-draft-sync";
import { useFieldProvisioning } from "./use-field-provisioning";
import { useTextFieldDraft } from "./use-text-field-draft";

export type SignFieldSessionStatus =
	| "idle"
	| "hydrating"
	| "ready"
	| "provisioning"
	| "saving";

export function useSignFieldSession(options: {
	pieceCid: string | undefined;
	canPersistDraft: boolean;
	alreadySigned: boolean;
	signedFieldCompletions?: FieldCompletionWireRow[];
	signerAddress?: `0x${string}`;
	myPlacementFields: PlacementField[];
}) {
	const {
		pieceCid,
		canPersistDraft,
		alreadySigned,
		signedFieldCompletions,
		signerAddress,
		myPlacementFields,
	} = options;
	const signDraftPieceCid = canPersistDraft ? pieceCid : undefined;
	const captureAppEvent = useCaptureAppEvent();

	const { data: serverDraft, isLoading: draftLoading } =
		useSignDraft(signDraftPieceCid);

	const getProtectedFieldIdsRef = useRef<() => readonly string[]>(() => []);

	const {
		completedFieldIds,
		setCompletedFieldIds,
		fieldCompletions,
		setFieldCompletions,
		persistDraft,
		isHydrating,
		isSaving,
	} = useFieldDraftSync({
		pieceCid,
		signDraftPieceCid,
		serverDraft,
		draftLoading,
		getProtectedFieldIds: () => getProtectedFieldIdsRef.current(),
	});

	const textFieldDraft = useTextFieldDraft({
		pieceCid,
		alreadySigned,
		myPlacementFields,
		fieldCompletions,
		setFieldCompletions,
		setCompletedFieldIds,
		persistDraft,
	});

	getProtectedFieldIdsRef.current = textFieldDraft.getProtectedFieldIds;

	const myFieldIds = useMemo(
		() => myPlacementFields.map((field) => field.id),
		[myPlacementFields],
	);

	useEffect(() => {
		if (!alreadySigned || !pieceCid || !signerAddress) return;
		if (!signedFieldCompletions?.length) return;

		const signed = fieldCompletionStateFromWireRows({
			rows: signedFieldCompletions,
			signerAddress,
			fieldIds: myFieldIds,
		});
		if (signed.completedFieldIds.length === 0) return;

		setCompletedFieldIds(signed.completedFieldIds);
		setFieldCompletions(signed.fieldCompletions);
	}, [
		alreadySigned,
		pieceCid,
		signerAddress,
		signedFieldCompletions,
		myFieldIds,
		setCompletedFieldIds,
		setFieldCompletions,
	]);

	const { resolveFieldCompletion } = useFieldProvisioning({
		signDraftPieceCid,
	});

	const [provisioningFieldIds, setProvisioningFieldIds] = useState<Set<string>>(
		() => new Set(),
	);

	useEffect(() => {
		setProvisioningFieldIds(new Set());
	}, [pieceCid]);

	const sessionStatus: SignFieldSessionStatus = useMemo(() => {
		if (provisioningFieldIds.size > 0) return "provisioning";
		if (isSaving) return "saving";
		if (isHydrating) return "hydrating";
		return "ready";
	}, [provisioningFieldIds.size, isSaving, isHydrating]);

	const fieldHasCompletion = useCallback(
		(field: PlacementField, completions: FieldCompletionMap) =>
			fieldHasCompletionValue(field, completions),
		[],
	);

	const toggleCheckboxCompletion = useCallback(
		(fieldId: string, current?: FieldCompletion) =>
			buildCheckboxCompletion(fieldId, current),
		[],
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
		[persistDraft, setCompletedFieldIds],
	);

	const isFieldComplete = useCallback(
		(field: PlacementField) => {
			if (alreadySigned && completedFieldIds.includes(field.id)) return true;
			return fieldCompletionStatus(
				field,
				fieldCompletions[field.id],
				completedFieldIds,
				"draft",
			);
		},
		[alreadySigned, completedFieldIds, fieldCompletions],
	);

	const isMyPlacementFieldDone = useCallback(
		(fieldId: string) => {
			const field = myPlacementFields.find((f) => f.id === fieldId);
			if (!field) {
				return alreadySigned && completedFieldIds.includes(fieldId);
			}
			return isFieldComplete(field);
		},
		[alreadySigned, completedFieldIds, isFieldComplete, myPlacementFields],
	);

	const clearPlacementField = useCallback(
		(fieldId: string) => {
			if (alreadySigned) return;
			const nextIds = completedFieldIds.filter((id) => id !== fieldId);
			const next = { ...fieldCompletions };
			delete next[fieldId];
			setCompletedFieldIds(nextIds);
			setFieldCompletions(next);
			persistDraft(nextIds, next);
		},
		[
			alreadySigned,
			completedFieldIds,
			fieldCompletions,
			persistDraft,
			setCompletedFieldIds,
			setFieldCompletions,
		],
	);

	const applyCompletionToField = useCallback(
		(field: PlacementField, completion: FieldCompletion) => {
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
		},
		[
			captureAppEvent,
			completedFieldIds,
			fieldHasCompletion,
			markFieldComplete,
			persistDraft,
			pieceCid,
			setFieldCompletions,
		],
	);

	const togglePlacementField = useCallback(
		async (field: PlacementField) => {
			if (alreadySigned) return;

			if (field.type === "checkbox") {
				setFieldCompletions((prev) => {
					const nextCompletion = toggleCheckboxCompletion(
						field.id,
						prev[field.id],
					);
					const next = { ...prev, [field.id]: nextCompletion };
					const nextIds =
						nextCompletion.textValue === "true"
							? completedFieldIds.includes(field.id)
								? completedFieldIds
								: [...completedFieldIds, field.id]
							: completedFieldIds.filter((id) => id !== field.id);
					setCompletedFieldIds(nextIds);
					persistDraft(nextIds, next);
					return next;
				});
				return;
			}

			if (field.type === "text") {
				if (isFieldComplete(field)) clearPlacementField(field.id);
				return;
			}

			if (isFieldComplete(field)) {
				clearPlacementField(field.id);
				return;
			}

			if (provisioningFieldIds.has(field.id)) return;

			setProvisioningFieldIds((prev) => new Set(prev).add(field.id));
			try {
				const completion = await resolveFieldCompletion(field);
				if (!completion) {
					if (field.type === "signature" || field.type === "initial") {
						toast.error("Could not apply your signature. Try again.");
					}
					return;
				}
				applyCompletionToField(field, completion);
			} catch (error) {
				showAppErrorToast(error);
			} finally {
				setProvisioningFieldIds((prev) => {
					const next = new Set(prev);
					next.delete(field.id);
					return next;
				});
			}
		},
		[
			alreadySigned,
			applyCompletionToField,
			clearPlacementField,
			completedFieldIds,
			isFieldComplete,
			provisioningFieldIds,
			persistDraft,
			resolveFieldCompletion,
			setCompletedFieldIds,
			setFieldCompletions,
			toggleCheckboxCompletion,
		],
	);

	const ensureRequiredVisualCompletions = useCallback(
		async (base?: {
			completions: FieldCompletionMap;
			completedFieldIds: string[];
		}) => {
			let nextCompletions = { ...(base?.completions ?? fieldCompletions) };
			let nextCompleted = [...(base?.completedFieldIds ?? completedFieldIds)];

			for (const field of myPlacementFields) {
				if (!field.required) continue;
				if (field.type !== "signature" && field.type !== "initial") continue;
				if (fieldHasCompletion(field, nextCompletions)) continue;

				const completion = await resolveFieldCompletion(field);
				if (!completion) continue;

				nextCompletions = { ...nextCompletions, [field.id]: completion };
				if (!nextCompleted.includes(field.id)) {
					nextCompleted = [...nextCompleted, field.id];
				}
			}

			return {
				completions: nextCompletions,
				completedFieldIds: nextCompleted,
			};
		},
		[
			completedFieldIds,
			fieldCompletions,
			fieldHasCompletion,
			myPlacementFields,
			resolveFieldCompletion,
		],
	);

	const prepareForSign = useCallback(async () => {
		const flushed = textFieldDraft.flushAllTextDrafts(
			fieldCompletions,
			completedFieldIds,
		);
		const prepared = await ensureRequiredVisualCompletions(flushed);
		setFieldCompletions(prepared.completions);
		setCompletedFieldIds(prepared.completedFieldIds);
		persistDraft(prepared.completedFieldIds, prepared.completions);
		return prepared;
	}, [
		completedFieldIds,
		ensureRequiredVisualCompletions,
		fieldCompletions,
		persistDraft,
		setCompletedFieldIds,
		setFieldCompletions,
		textFieldDraft,
	]);

	const handleCheckboxToggle = useCallback(
		(fieldId: string) => {
			const field = myPlacementFields.find((f) => f.id === fieldId);
			if (!field) return;
			void togglePlacementField(field);
		},
		[myPlacementFields, togglePlacementField],
	);

	return {
		sessionStatus,
		completedFieldIds,
		fieldCompletions,
		isMyPlacementFieldDone,
		isFieldComplete,
		provisioningFieldIds,
		togglePlacementField,
		clearPlacementField,
		prepareForSign,
		getTextFieldValue: textFieldDraft.getTextFieldValue,
		handleTextDraftChange: textFieldDraft.handleTextDraftChange,
		handleTextFocus: textFieldDraft.handleTextFocus,
		handleTextBlur: textFieldDraft.handleTextBlur,
		handleCheckboxToggle,
	};
}
