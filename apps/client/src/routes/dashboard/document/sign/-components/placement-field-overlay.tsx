import type { FieldCompletionMap, PlacementField } from "@filosign/shared";
import { memo } from "react";
import { PlacementOverlay } from "@/src/lib/domains/files/placement-overlay";

type PlacementFieldOverlayProps = {
	pageIndex: number;
	fields: PlacementField[];
	fieldCompletions: FieldCompletionMap;
	alreadySigned: boolean;
	onToggleField: (field: PlacementField) => void;
	onTextChange: (fieldId: string, value: string) => void;
};

export const PlacementFieldOverlay = memo(function PlacementFieldOverlay(
	props: PlacementFieldOverlayProps,
) {
	return (
		<PlacementOverlay
			pageIndex={props.pageIndex}
			fields={props.fields}
			mode="interactive"
			completions={props.fieldCompletions}
			alreadySigned={props.alreadySigned}
			onToggleField={props.onToggleField}
			onTextChange={props.onTextChange}
		/>
	);
});
