import type * as React from "react";
import { useCallback } from "react";
import { isPdfDocument } from "@/src/lib/domains/files/document-kind";
import type {
	ClickCoordinates,
	PlacementDocument,
	SignatureField,
} from "@/src/lib/domains/placement/types";
import { useDocumentDimensions } from "@/src/lib/domains/placement/use-document-dimensions";
import {
	clampFieldAtPoint,
	clientPointToPageCoords,
	findPageAtClientPoint,
} from "@/src/lib/domains/placement/utils/placement-coordinates";
import type { PlacementFieldSize } from "@/src/lib/domains/placement/utils/placement-field-presets";
import { usePlacementCanvas } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-placement-canvas";

type UseDocumentViewerInteractionArgs = {
	document: PlacementDocument | null;
	isPlacingField: boolean;
	pendingFieldType: SignatureField["type"] | null;
	onPlaceAtCoords: (coords: { x: number; y: number; page: number }) => void;
	onFieldSelect: (fieldId: string, options?: { additive?: boolean }) => void;
	onCanvasDeselect: () => void;
	getPageHeight?: (page: number) => number;
	resolvePlacementFieldSize: (
		type: SignatureField["type"],
	) => PlacementFieldSize;
};

export function useDocumentViewerInteraction({
	document,
	isPlacingField,
	pendingFieldType,
	onPlaceAtCoords,
	onFieldSelect,
	onCanvasDeselect,
	getPageHeight,
	resolvePlacementFieldSize,
}: UseDocumentViewerInteractionArgs) {
	const { pageRefs } = usePlacementCanvas();

	const {
		width: documentWidth,
		height: documentHeight,
		margin,
		isMobile,
	} = useDocumentDimensions();
	const fallbackDocHeight = documentHeight;

	const isPdf = Boolean(
		document &&
			isPdfDocument({
				type: document.mimeType,
				name: document.name,
				pdfBytes: document.pdfBytes,
			}),
	);

	const handleDocumentClick = useCallback(
		(event: ClickCoordinates) => {
			if (!isPlacingField || !pendingFieldType) {
				onCanvasDeselect();
				return;
			}

			const size = resolvePlacementFieldSize(pendingFieldType);
			const hit = findPageAtClientPoint(
				pageRefs.current,
				event.clientX,
				event.clientY,
			);
			if (!hit) return;

			const raw = clientPointToPageCoords(
				event.clientX,
				event.clientY,
				hit.el,
				size,
				{ anchor: "top-left" },
			);
			if (!raw) return;

			const pageHeight = getPageHeight?.(hit.page) ?? fallbackDocHeight;
			const viewport = {
				docWidth: documentWidth,
				docHeight: pageHeight,
				margin,
			};
			const { x, y } = clampFieldAtPoint(raw.x, raw.y, size, viewport);
			onPlaceAtCoords({ x, y, page: hit.page });
		},
		[
			isPlacingField,
			pendingFieldType,
			onPlaceAtCoords,
			onCanvasDeselect,
			documentWidth,
			fallbackDocHeight,
			getPageHeight,
			margin,
			pageRefs,
			resolvePlacementFieldSize,
		],
	);

	const handleFieldClick = useCallback(
		(fieldId: string, event: React.MouseEvent) => {
			event.stopPropagation();
			onFieldSelect(fieldId, {
				additive: event.shiftKey || event.metaKey || event.ctrlKey,
			});
		},
		[onFieldSelect],
	);

	return {
		documentWidth,
		margin,
		isMobile,
		isPdfDocument: isPdf,
		handleDocumentClick,
		handleFieldClick,
	};
}
