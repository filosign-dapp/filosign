import type { FieldCompletionWireRow, PlacementField } from "@filosign/shared";
import { memo } from "react";
import { PlacementOverlay } from "@/src/lib/domains/files/placement-overlay";
import type { PlacementPlaceholderPresentation } from "@/src/lib/domains/files/placement-overlay/constants";

type FileViewerFieldOverlayProps = {
	pageIndex: number;
	fields: PlacementField[];
	completions: FieldCompletionWireRow[];
	showPlaceholders?: boolean;
	placeholderPresentation?: PlacementPlaceholderPresentation;
	overlayClassName?: string;
};

export const FileViewerFieldOverlay = memo(function FileViewerFieldOverlay({
	pageIndex,
	fields,
	completions,
	showPlaceholders = false,
	placeholderPresentation = "recipient",
	overlayClassName = "z-10",
}: FileViewerFieldOverlayProps) {
	return (
		<PlacementOverlay
			pageIndex={pageIndex}
			fields={fields}
			mode="readonly"
			completions={completions}
			showPlaceholders={showPlaceholders}
			placeholderPresentation={placeholderPresentation}
			overlayClassName={overlayClassName}
		/>
	);
});
