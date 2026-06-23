import { useUserSignatures } from "@filosign/react/users";
import type { FieldCompletionMap, PlacementField } from "@filosign/shared";
import { memo, useMemo } from "react";
import {
	PLACEMENT_SIGNER_PREVIEW_OVERLAY_CLASSNAME,
	PlacementOverlay,
} from "@/src/lib/domains/files/placement-overlay";
import { cn } from "@/src/lib/utils";

type PlacementFieldOverlayProps = {
	pageIndex: number;
	fields: PlacementField[];
	fieldCompletions: FieldCompletionMap;
	alreadySigned: boolean;
	onToggleField: (field: PlacementField) => void;
	getTextFieldValue: (fieldId: string) => string;
	onTextDraftChange: (fieldId: string, value: string) => void;
	onTextFocus: (fieldId: string) => void;
	onTextBlur: (fieldId: string) => void;
	provisioningFieldIds?: ReadonlySet<string>;
};

export const PlacementFieldOverlay = memo(function PlacementFieldOverlay(
	props: PlacementFieldOverlayProps,
) {
	const { data: signaturesData } = useUserSignatures();
	const signatureArtifactsById = useMemo(() => {
		const map = new Map<
			string,
			NonNullable<typeof signaturesData>["signatures"][number]
		>();
		for (const artifact of signaturesData?.signatures ?? []) {
			map.set(artifact.id, artifact);
		}
		return map;
	}, [signaturesData?.signatures]);

	return (
		<PlacementOverlay
			pageIndex={props.pageIndex}
			fields={props.fields}
			mode="interactive"
			overlayClassName={cn("z-10", PLACEMENT_SIGNER_PREVIEW_OVERLAY_CLASSNAME)}
			completions={props.fieldCompletions}
			alreadySigned={props.alreadySigned}
			onToggleField={props.onToggleField}
			getTextFieldValue={props.getTextFieldValue}
			onTextDraftChange={props.onTextDraftChange}
			onTextFocus={props.onTextFocus}
			onTextBlur={props.onTextBlur}
			provisioningFieldIds={props.provisioningFieldIds}
			signatureArtifactsById={signatureArtifactsById}
		/>
	);
});
