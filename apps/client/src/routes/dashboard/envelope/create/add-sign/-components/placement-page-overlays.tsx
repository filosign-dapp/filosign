import { type MouseEvent, memo } from "react";
import type { SignatureField } from "@/src/lib/domains/placement/types";
import { SignatureFieldOverlays } from "./field-overlays";

type PlacementPageOverlaysProps = {
	pageFields: SignatureField[];
	selectedFieldIds: Set<string>;
	documentWidth: number;
	documentHeight: number;
	margin: number;
	isMobile: boolean;
	isPlacingField: boolean;
	onFieldClick: (fieldId: string, event: MouseEvent) => void;
	onFieldRemove: (fieldId: string) => void;
	onFieldUpdate: (fieldId: string, updates: Partial<SignatureField>) => void;
	onFieldDuplicate: (fieldId: string) => void;
	onResizeStart: () => void;
	onResizeEnd: () => void;
};

export const PlacementPageOverlays = memo(function PlacementPageOverlays({
	pageFields,
	selectedFieldIds,
	documentWidth,
	documentHeight,
	margin,
	isMobile,
	isPlacingField,
	onFieldClick,
	onFieldRemove,
	onFieldUpdate,
	onFieldDuplicate,
	onResizeStart,
	onResizeEnd,
}: PlacementPageOverlaysProps) {
	return (
		<SignatureFieldOverlays
			signatureFields={pageFields}
			selectedFieldIds={selectedFieldIds}
			documentWidth={documentWidth}
			documentHeight={documentHeight}
			margin={margin}
			isMobile={isMobile}
			isPlacingField={isPlacingField}
			onFieldClick={onFieldClick}
			onFieldRemove={onFieldRemove}
			onFieldUpdate={onFieldUpdate}
			onFieldDuplicate={onFieldDuplicate}
			onResizeStart={onResizeStart}
			onResizeEnd={onResizeEnd}
		/>
	);
});
