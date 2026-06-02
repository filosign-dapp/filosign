import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { defaultPlacementFieldRect } from "@/src/lib/domains/files/field-box";
import { usePlacementCanvas } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-canvas-context";
import { useDocumentDimensions } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-dimensions";
import type {
	ClickCoordinates,
	Document,
	SignatureField,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import { isPdfDocument } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/document-kind";
import {
	clampFieldAtPoint,
	clientPointToPageCoords,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-coordinates";

type UseDocumentViewerInteractionArgs = {
	document: Document | null;
	documentPage: number;
	isPlacingField: boolean;
	pendingFieldType: SignatureField["type"] | null;
	onPlaceAtCoords: (coords: { x: number; y: number; page: number }) => void;
	onPdfPageChange?: (page: number) => void;
	onFieldSelect: (fieldId: string, options?: { additive?: boolean }) => void;
	onCanvasDeselect: () => void;
	placementDocHeight?: number;
	onPdfPageLayoutLoaded?: (layout: { width: number; height: number }) => void;
};

export function useDocumentViewerInteraction({
	document,
	documentPage,
	isPlacingField,
	pendingFieldType,
	onPlaceAtCoords,
	onPdfPageChange,
	onFieldSelect,
	onCanvasDeselect,
	placementDocHeight,
	onPdfPageLayoutLoaded,
}: UseDocumentViewerInteractionArgs) {
	const [pdfPageNumber, setPdfPageNumber] = useState(1);
	const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);
	const { setPageEl, pageRef } = usePlacementCanvas();

	const {
		width: documentWidth,
		height: documentHeight,
		margin,
		isMobile,
	} = useDocumentDimensions();
	const effectiveDocHeight = placementDocHeight ?? documentHeight;

	const isPdf = Boolean(
		document &&
			isPdfDocument({
				type: document.mimeType,
				name: document.name,
				pdfBytes: document.pdfBytes,
			}),
	);

	useEffect(() => {
		setPdfPageNumber(1);
		const hint =
			document?.pages != null && document.pages > 0 ? document.pages : null;
		setPdfNumPages(hint);
		onPdfPageChange?.(1);
	}, [document?.id, document?.pdfBytes, document?.url, onPdfPageChange]);

	const handleDocumentClick = useCallback(
		(event: ClickCoordinates) => {
			if (!isPlacingField || !pendingFieldType) {
				onCanvasDeselect();
				return;
			}

			const defaults = defaultPlacementFieldRect(pendingFieldType, isMobile);
			const raw = clientPointToPageCoords(
				event.clientX,
				event.clientY,
				pageRef.current,
				defaults,
				{ anchor: "top-left" },
			);
			if (!raw) return;

			const viewport = {
				docWidth: documentWidth,
				docHeight: effectiveDocHeight,
				margin,
			};
			const { x, y } = clampFieldAtPoint(raw.x, raw.y, defaults, viewport);
			const page = isPdf ? pdfPageNumber : documentPage;
			onPlaceAtCoords({ x, y, page });
		},
		[
			isPlacingField,
			pendingFieldType,
			onPlaceAtCoords,
			onCanvasDeselect,
			documentWidth,
			effectiveDocHeight,
			margin,
			isMobile,
			isPdf,
			pdfPageNumber,
			documentPage,
			pageRef,
		],
	);

	const handleFieldClick = useCallback(
		(fieldId: string, event: React.MouseEvent) => {
			event.stopPropagation();
			onFieldSelect(fieldId, { additive: event.shiftKey });
		},
		[onFieldSelect],
	);

	const goToPreviousPdfPage = useCallback(() => {
		setPdfPageNumber((p) => {
			const n = Math.max(1, p - 1);
			onPdfPageChange?.(n);
			return n;
		});
	}, [onPdfPageChange]);

	const goToNextPdfPage = useCallback(() => {
		setPdfPageNumber((p) => {
			const n = pdfNumPages == null ? p + 1 : Math.min(pdfNumPages, p + 1);
			onPdfPageChange?.(n);
			return n;
		});
	}, [onPdfPageChange, pdfNumPages]);

	const setPdfPage = useCallback(
		(page: number) => {
			const n =
				pdfNumPages == null
					? Math.max(1, page)
					: Math.min(Math.max(1, page), pdfNumPages);
			setPdfPageNumber(n);
			onPdfPageChange?.(n);
		},
		[onPdfPageChange, pdfNumPages],
	);

	const handlePdfNumPagesLoaded = useCallback((n: number) => {
		setPdfNumPages(n);
		setPdfPageNumber((prev) => Math.min(prev, n));
	}, []);

	return {
		setPageEl,
		documentWidth,
		documentHeight: effectiveDocHeight,
		onPdfPageLayoutLoaded,
		margin,
		isMobile,
		isPdfDocument: isPdf,
		pdfPageNumber,
		pdfNumPages,
		goToPreviousPdfPage,
		goToNextPdfPage,
		setPdfPage,
		handlePdfNumPagesLoaded,
		handleDocumentClick,
		handleFieldClick,
	};
}
