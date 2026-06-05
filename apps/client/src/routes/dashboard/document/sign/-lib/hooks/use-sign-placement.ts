import type { ViewFileResult } from "@filosign/react/files";
import {
	type FieldCompletionMap,
	type PlacementField,
	zPlacementManifest,
} from "@filosign/shared";
import { useMemo } from "react";

function fieldIsComplete(
	field: PlacementField,
	completions: FieldCompletionMap,
	completedFieldIds: string[],
): boolean {
	if (!completedFieldIds.includes(field.id)) return false;
	const c = completions[field.id];
	if (!c) return false;
	if (c.valueKind === "visual") return Boolean(c.storageKey || c.previewUrl);
	if (c.valueKind === "checkbox") return c.textValue === "true";
	return Boolean(c.textValue?.trim());
}

export function useSignPlacement(options: {
	fileData: ViewFileResult | null;
	signerPlacementEmail: string | null;
	completedFieldIds: string[];
	fieldCompletions: FieldCompletionMap;
	canSign: boolean;
}) {
	const {
		fileData,
		signerPlacementEmail,
		completedFieldIds,
		fieldCompletions,
		canSign,
	} = options;

	const allPlacementFields = useMemo(() => {
		if (!fileData?.placementManifest) return [];
		const parsed = zPlacementManifest.safeParse(fileData.placementManifest);
		if (!parsed.success) return [];
		return parsed.data.fields;
	}, [fileData?.placementManifest]);

	const myPlacementFields = useMemo(() => {
		if (!signerPlacementEmail) return [];
		return allPlacementFields.filter(
			(f) => f.assignedRecipientEmail === signerPlacementEmail,
		);
	}, [allPlacementFields, signerPlacementEmail]);

	const visiblePlacementFields = useMemo(
		() => allPlacementFields,
		[allPlacementFields],
	);

	const signPdfPageCountHint = useMemo(() => {
		if (visiblePlacementFields.length === 0) return null;
		return Math.max(...visiblePlacementFields.map((f) => f.pageIndex)) + 1;
	}, [visiblePlacementFields]);

	const requiredPlacementFields = useMemo(
		() => myPlacementFields.filter((f) => f.required),
		[myPlacementFields],
	);

	const canSubmitPlacementSign = useMemo(() => {
		if (!canSign || myPlacementFields.length === 0) return false;
		const requiredOk =
			requiredPlacementFields.length === 0 ||
			requiredPlacementFields.every((field) =>
				fieldIsComplete(field, fieldCompletions, completedFieldIds),
			);
		const hasLeaf = completedFieldIds.length > 0;
		return requiredOk && hasLeaf;
	}, [
		canSign,
		myPlacementFields.length,
		requiredPlacementFields,
		completedFieldIds,
		fieldCompletions,
	]);

	return {
		myPlacementFields,
		visiblePlacementFields,
		signPdfPageCountHint,
		canSubmitPlacementSign,
	};
}
