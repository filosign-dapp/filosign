import type { FieldCompletionWireRow, PlacementField } from "@filosign/shared";
import { memo } from "react";
import { PlacementOverlay } from "@/src/lib/domains/files/placement-overlay";

type FileViewerFieldOverlayProps = {
	pageIndex: number;
	fields: PlacementField[];
	completions: FieldCompletionWireRow[];
	showPlaceholders?: boolean;
	overlayClassName?: string;
};

export const FileViewerFieldOverlay = memo(function FileViewerFieldOverlay({
	pageIndex,
	fields,
	completions,
	showPlaceholders = false,
	overlayClassName = "z-10",
}: FileViewerFieldOverlayProps) {
	return (
		<PlacementOverlay
			pageIndex={pageIndex}
			fields={fields}
			mode="readonly"
			completions={completions}
			showPlaceholders={showPlaceholders}
			overlayClassName={overlayClassName}
		/>
	);
});
