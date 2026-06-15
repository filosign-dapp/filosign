import { useCallback, useMemo, useState } from "react";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";

function toggleInSet(set: Set<string>, id: string): Set<string> {
	const next = new Set(set);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	return next;
}

export function usePlacementMode() {
	const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(
		() => new Set(),
	);
	const [isPlacingField, setIsPlacingField] = useState(false);
	const [pendingFieldType, setPendingFieldType] = useState<
		SignatureField["type"] | null
	>(null);

	const selectedField = useMemo(() => {
		if (selectedFieldIds.size !== 1) return null;
		return [...selectedFieldIds][0] ?? null;
	}, [selectedFieldIds]);

	const handleAddField = useCallback((type: SignatureField["type"]) => {
		setPendingFieldType(type);
		setIsPlacingField(true);
		setSelectedFieldIds(new Set());
	}, []);

	const cancelPlacement = useCallback(() => {
		setIsPlacingField(false);
		setPendingFieldType(null);
	}, []);

	const finishPlacement = useCallback((fieldId: string) => {
		setIsPlacingField(false);
		setPendingFieldType(null);
		setSelectedFieldIds(new Set([fieldId]));
	}, []);

	const selectField = useCallback((fieldId: string, additive = false) => {
		setSelectedFieldIds((prev) =>
			additive ? toggleInSet(prev, fieldId) : new Set([fieldId]),
		);
	}, []);

	const selectFields = useCallback((fieldIds: string[], additive = false) => {
		setSelectedFieldIds((prev) => {
			if (additive) {
				const next = new Set(prev);
				for (const id of fieldIds) next.add(id);
				return next;
			}
			return new Set(fieldIds);
		});
	}, []);

	const clearFieldSelection = useCallback(() => {
		setSelectedFieldIds(new Set());
	}, []);

	const setSelectedField = useCallback((fieldId: string | null) => {
		setSelectedFieldIds(fieldId ? new Set([fieldId]) : new Set());
	}, []);

	return {
		selectedFieldIds,
		selectedField,
		setSelectedField,
		setSelectedFieldIds,
		selectField,
		selectFields,
		clearFieldSelection,
		isPlacingField,
		pendingFieldType,
		handleAddField,
		cancelPlacement,
		finishPlacement,
	};
}
