import type {
	FieldCompletionMap,
	FieldCompletionWireRow,
	PlacementField,
	UserSignatureArtifact,
} from "@filosign/shared";
import { placementFieldPixelRect } from "@filosign/shared";
import { memo } from "react";
import { usePlacementLayout } from "@/src/lib/domains/files/use-placement-layout";
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
	getTextFieldValue?: (fieldId: string) => string;
	onTextDraftChange?: (fieldId: string, value: string) => void;
	onTextFocus?: (fieldId: string) => void;
	onTextBlur?: (fieldId: string) => void;
	overlayClassName?: string;
	/** When mode is readonly, render muted placeholders for fields without completions. */
	showPlaceholders?: boolean;
	provisioningFieldIds?: ReadonlySet<string>;
	signatureArtifactsById?: ReadonlyMap<string, UserSignatureArtifact>;
};

export const PlacementOverlay = memo(function PlacementOverlay({
	pageIndex,
	fields,
	mode,
	completions,
	alreadySigned = false,
	onToggleField,
	getTextFieldValue,
	onTextDraftChange,
	onTextFocus,
	onTextBlur,
	overlayClassName = "z-10",
	showPlaceholders = false,
	provisioningFieldIds,
	signatureArtifactsById,
}: PlacementOverlayProps) {
	const placementLayout = usePlacementLayout();
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
					provisioningFieldIds,
				});

				const fieldHeightPx = placementLayout
					? placementFieldPixelRect(
							field,
							placementLayout.width,
							placementLayout.height,
						).height
					: undefined;

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
						fieldHeightPx={fieldHeightPx}
						signatureArtifactsById={signatureArtifactsById}
						onToggleField={onToggleField}
						getTextFieldValue={getTextFieldValue}
						onTextDraftChange={onTextDraftChange}
						onTextFocus={onTextFocus}
						onTextBlur={onTextBlur}
					/>
				);
			})}
		</>
	);
});
