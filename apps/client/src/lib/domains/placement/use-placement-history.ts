import { useCallback, useRef, useState } from "react";
import type { SignatureField } from "@/src/lib/domains/files/envelope-form-types";

const MAX_HISTORY = 50;

export function usePlacementHistory(
	signatureFields: SignatureField[],
	onFieldsChange: (fields: SignatureField[]) => void,
) {
	const undoStack = useRef<SignatureField[][]>([]);
	const redoStack = useRef<SignatureField[][]>([]);
	const [, bump] = useState(0);

	const refresh = useCallback(() => bump((n) => n + 1), []);

	const commitFields = useCallback(
		(next: SignatureField[], recordHistory = true) => {
			if (recordHistory) {
				undoStack.current = [
					...undoStack.current.slice(-(MAX_HISTORY - 1)),
					signatureFields,
				];
				redoStack.current = [];
			}
			onFieldsChange(next);
			refresh();
		},
		[onFieldsChange, signatureFields, refresh],
	);

	const undo = useCallback(() => {
		const prev = undoStack.current.pop();
		if (!prev) return;
		redoStack.current.push(signatureFields);
		onFieldsChange(prev);
		refresh();
	}, [onFieldsChange, signatureFields, refresh]);

	const redo = useCallback(() => {
		const next = redoStack.current.pop();
		if (!next) return;
		undoStack.current.push(signatureFields);
		onFieldsChange(next);
		refresh();
	}, [onFieldsChange, signatureFields, refresh]);

	const canUndo = undoStack.current.length > 0;
	const canRedo = redoStack.current.length > 0;

	return {
		commitFields,
		undo,
		redo,
		canUndo,
		canRedo,
	};
}
