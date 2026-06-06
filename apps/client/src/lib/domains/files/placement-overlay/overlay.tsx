import type {
	FieldCompletionMap,
	FieldCompletionWireRow,
	PlacementField,
} from "@filosign/shared";
import { memo } from "react";
import { PlacementFieldOverlayItem } from "./overlay-field-item";
import {
	deriveOverlayFieldState,
	type PlacementOverlayMode,
} from "./overlay-field-state";

export type { PlacementOverlayMode };

type PlacementOverlayProps = {
	pageIndex: number;
	fields: PlacementField[];
	mode: PlacementOverlayMode;
	completions?: FieldCompletionMap | FieldCompletionWireRow[];
	alreadySigned?: boolean;
	onToggleField?: (field: PlacementField) => void;
	onTextChange?: (fieldId: string, value: string) => void;
	overlayClassName?: string;
	/** When mode is readonly, render muted placeholders for fields without completions. */
	showPlaceholders?: boolean;
};

export const PlacementOverlay = memo(function PlacementOverlay({
	pageIndex,
	fields,
	mode,
	completions,
	alreadySigned = false,
	onToggleField,
	onTextChange,
	overlayClassName = "z-10",
	showPlaceholders = false,
}: PlacementOverlayProps) {
	const pageFields = fields.filter((f) => f.pageIndex === pageIndex);

	return (
		<>
			{pageFields.map((field) => {
				const { typeLabel, plan } = deriveOverlayFieldState({
					field,
					mode,
					completions,
					alreadySigned,
					showPlaceholders,
				});

				return (
					<PlacementFieldOverlayItem
						key={field.id}
						field={field}
						typeLabel={typeLabel}
						plan={plan}
						completion={
							Array.isArray(completions)
								? completions.find((row) => row.fieldId === field.id)
								: completions?.[field.id]
						}
						overlayClassName={overlayClassName}
						alreadySigned={alreadySigned}
						onToggleField={onToggleField}
						onTextChange={onTextChange}
					/>
				);
			})}
		</>
	);
});
