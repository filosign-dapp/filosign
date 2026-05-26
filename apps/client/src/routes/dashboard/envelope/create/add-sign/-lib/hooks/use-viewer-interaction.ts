import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { constrainFieldTopLeft } from "@/src/lib/domains/files/placement-viewport";
import { useDocumentDimensions } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-dimensions";
import type {
	Document,
	SignatureField,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import { isPdfDocument } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/document-kind";
import { signatureFieldBoxCssPx } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/field-box";

type UseDocumentViewerInteractionArgs = {
	document: Document | null;
	zoom: number;
	documentPage: number;
	isPlacingField: boolean;
	signatureFields: SignatureField[];
	onFieldPlacementRequest: (coords: {
		x: number;
		y: number;
		page: number;
	}) => void;
	onPdfPageChange?: (page: number) => void;
	onFieldSelect: (fieldId: string) => void;
	onFieldUpdate: (fieldId: string, updates: Partial<SignatureField>) => void;
	placementDocHeight?: number;
	onPdfPageLayoutLoaded?: (layout: { width: number; height: number }) => void;
};

export function useDocumentViewerInteraction({
	document,
	zoom,
	documentPage,
	isPlacingField,
	signatureFields,
	onFieldPlacementRequest,
	onPdfPageChange,
	onFieldSelect,
	onFieldUpdate,
	placementDocHeight,
	onPdfPageLayoutLoaded,
}: UseDocumentViewerInteractionArgs) {
	const [isDragging, setIsDragging] = useState(false);
	const [pdfPageNumber, setPdfPageNumber] = useState(1);
	const [pdfNumPages, setPdfNumPages] = useState<number | null>(null);

	const {
		width: documentWidth,
		height: documentHeight,
		margin,
		isMobile,
	} = useDocumentDimensions();
	const { width: fieldWidth, height: fieldHeight } =
		signatureFieldBoxCssPx(isMobile);
	const effectiveDocHeight = placementDocHeight ?? documentHeight;

	const documentRef = useRef<HTMLDivElement>(null);
	const dragDataRef = useRef({
		startX: 0,
		startY: 0,
		fieldX: 0,
		fieldY: 0,
		fieldId: "",
	});
	const lastUpdateRef = useRef(0);

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
		(event: React.MouseEvent) => {
			if (!isPlacingField) return;

			const documentRect = documentRef.current?.getBoundingClientRect();
			if (!documentRect) return;

			const x = (event.clientX - documentRect.left) / (zoom / 100);
			const y = (event.clientY - documentRect.top) / (zoom / 100);

			const { x: boundedX, y: boundedY } = constrainFieldTopLeft({
				x,
				y,
				docWidth: documentWidth,
				docHeight: effectiveDocHeight,
				fieldWidth,
				fieldHeight,
				margin,
			});

			const page = isPdf ? pdfPageNumber : documentPage;
			onFieldPlacementRequest({ x: boundedX, y: boundedY, page });
		},
		[
			isPlacingField,
			onFieldPlacementRequest,
			zoom,
			documentWidth,
			effectiveDocHeight,
			fieldWidth,
			fieldHeight,
			margin,
			isPdf,
			pdfPageNumber,
			documentPage,
		],
	);

	const handleFieldClick = useCallback(
		(fieldId: string, event: React.MouseEvent) => {
			event.stopPropagation();
			onFieldSelect(fieldId);
		},
		[onFieldSelect],
	);

	const handleFieldMouseDown = useCallback(
		(fieldId: string, event: React.MouseEvent) => {
			event.stopPropagation();

			const field = signatureFields.find((f) => f.id === fieldId);
			if (!field) return;

			dragDataRef.current = {
				startX: event.clientX,
				startY: event.clientY,
				fieldX: field.x,
				fieldY: field.y,
				fieldId,
			};

			setIsDragging(true);
			onFieldSelect(fieldId);
		},
		[signatureFields, onFieldSelect],
	);

	const handleMouseMove = useCallback(
		(event: MouseEvent) => {
			if (!isDragging) return;

			const now = performance.now();
			if (now - lastUpdateRef.current < 16) return;
			lastUpdateRef.current = now;

			const documentRect = documentRef.current?.getBoundingClientRect();
			if (!documentRect) return;

			const dragData = dragDataRef.current;
			const deltaX = (event.clientX - dragData.startX) / (zoom / 100);
			const deltaY = (event.clientY - dragData.startY) / (zoom / 100);

			const { x: newX, y: newY } = constrainFieldTopLeft({
				x: dragData.fieldX + deltaX,
				y: dragData.fieldY + deltaY,
				docWidth: documentWidth,
				docHeight: effectiveDocHeight,
				fieldWidth,
				fieldHeight,
				margin,
			});

			onFieldUpdate(dragData.fieldId, { x: newX, y: newY });
		},
		[
			isDragging,
			onFieldUpdate,
			zoom,
			documentWidth,
			effectiveDocHeight,
			fieldWidth,
			fieldHeight,
			margin,
		],
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
		dragDataRef.current = {
			startX: 0,
			startY: 0,
			fieldX: 0,
			fieldY: 0,
			fieldId: "",
		};
	}, []);

	useEffect(() => {
		if (!isDragging) return;

		const handleGlobalMouseMove = (event: MouseEvent) => handleMouseMove(event);
		const handleGlobalMouseUp = () => handleMouseUp();

		window.addEventListener("mousemove", handleGlobalMouseMove);
		window.addEventListener("mouseup", handleGlobalMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleGlobalMouseMove);
			window.removeEventListener("mouseup", handleGlobalMouseUp);
		};
	}, [isDragging, handleMouseMove, handleMouseUp]);

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

	const handlePdfNumPagesLoaded = useCallback((n: number) => {
		setPdfNumPages(n);
		setPdfPageNumber((prev) => Math.min(prev, n));
	}, []);

	return {
		documentRef,
		documentWidth,
		documentHeight: effectiveDocHeight,
		onPdfPageLayoutLoaded,
		margin,
		isMobile,
		fieldWidth,
		fieldHeight,
		isPdfDocument: isPdf,
		isPlacingField,
		pdfPageNumber,
		pdfNumPages,
		goToPreviousPdfPage,
		goToNextPdfPage,
		handlePdfNumPagesLoaded,
		handleDocumentClick,
		handleFieldClick,
		handleFieldMouseDown,
	};
}
