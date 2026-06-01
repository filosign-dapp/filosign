import { useDroppable } from "@dnd-kit/core";
import { memo, useCallback, useEffect } from "react";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { cn } from "@/src/lib/utils/utils";
import { PlacementCanvas } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-canvas";
import { PLACEMENT_CANVAS_DROPPABLE_ID } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-dnd-provider";
import {
	useAddSignShell,
	useAddSignViewer,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import { useDocumentViewerInteraction } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-viewer-interaction";
import { focusPagePointInCanvas } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-coordinates";
import { SignatureFieldOverlays } from "./field-overlays";
import { DocumentPageContent } from "./page-content";
import { usePlacementCanvas } from "./placement-canvas-context";
import { DocumentViewerToolbar } from "./viewer-toolbar";

function DocumentViewer() {
	const { docRendering, setDocRendering } = useAddSignShell();
	const {
		currentDocument,
		currentPage,
		currentPageFields,
		signatureFields,
		setCurrentPage,
		selectedFieldIds,
		isPlacingField,
		pendingFieldType,
		handlePlaceAtCoords,
		handleFieldSelect,
		handleCanvasDeselect,
		handleFieldRemove,
		handleFieldUpdate,
		handleFieldDuplicate,
		handleRepeatFieldOnAllPages,
		handleBack,
		handleEditForm,
		recordPdfPageLayout,
		setPdfNumPages,
		pdfNumPages,
		placementDocHeight,
		documentLoadingMessage,
		isInteractingField,
		setIsInteractingField,
		fieldFocusRequestId,
		clearFieldFocusRequest,
		undo,
		redo,
		canUndo,
		canRedo,
	} = useAddSignViewer();

	const { panPinchRef, wrapperRef } = usePlacementCanvas();

	const interaction = useDocumentViewerInteraction({
		document: currentDocument ?? null,
		documentPage: currentPage,
		isPlacingField,
		pendingFieldType,
		onPlaceAtCoords: handlePlaceAtCoords,
		onPdfPageChange: setCurrentPage,
		onFieldSelect: handleFieldSelect,
		onCanvasDeselect: handleCanvasDeselect,
		placementDocHeight,
		onPdfPageLayoutLoaded: (layout) => {
			recordPdfPageLayout(currentPage, layout.height);
			setDocRendering(false);
		},
	});

	useEffect(() => {
		if (!fieldFocusRequestId) return;
		const field = signatureFields.find((f) => f.id === fieldFocusRequestId);
		if (!field) {
			clearFieldFocusRequest();
			return;
		}
		if (field.page !== currentPage) return;

		const centerX = field.x + field.width / 2;
		const centerY = field.y + field.height / 2;
		requestAnimationFrame(() => {
			focusPagePointInCanvas({
				panPinchRef: panPinchRef.current,
				wrapperEl: wrapperRef.current,
				pageX: centerX,
				pageY: centerY,
			});
			clearFieldFocusRequest();
		});
	}, [
		fieldFocusRequestId,
		signatureFields,
		currentPage,
		panPinchRef,
		wrapperRef,
		clearFieldFocusRequest,
	]);

	const {
		setPageEl,
		documentWidth,
		documentHeight,
		margin,
		isMobile,
		isPdfDocument,
		pdfPageNumber,
		goToPreviousPdfPage,
		goToNextPdfPage,
		setPdfPage,
		handlePdfNumPagesLoaded,
		handleDocumentClick,
		handleFieldClick,
		onPdfPageLayoutLoaded,
	} = interaction;

	const onPdfNumPagesLoaded = useCallback(
		(n: number) => {
			handlePdfNumPagesLoaded(n);
			setPdfNumPages(n);
		},
		[handlePdfNumPagesLoaded, setPdfNumPages],
	);

	const { setNodeRef: setCanvasRef } = useDroppable({
		id: PLACEMENT_CANVAS_DROPPABLE_ID,
	});

	const onResizeStart = useCallback(() => {
		setIsInteractingField(true);
	}, [setIsInteractingField]);

	const onResizeEnd = useCallback(() => {
		setIsInteractingField(false);
	}, [setIsInteractingField]);

	if (!currentDocument) {
		return null;
	}

	return (
		<div className="flex flex-col flex-1 min-h-0">
			<DocumentViewerToolbar
				isPdfDocument={isPdfDocument}
				pdfPageNumber={pdfPageNumber}
				pdfNumPages={pdfNumPages}
				onPreviousPage={goToPreviousPdfPage}
				onNextPage={goToNextPdfPage}
				onPageJump={setPdfPage}
				onBack={handleBack}
				onEditForm={handleEditForm}
				onUndo={undo}
				onRedo={redo}
				canUndo={canUndo}
				canRedo={canRedo}
			/>

			<PlacementCanvas
				isPlacingField={isPlacingField}
				isInteractingField={isInteractingField}
				className="min-h-0"
			>
				<div
					ref={setCanvasRef}
					className={cn(
						"relative w-fit border border-border bg-white shadow-lg",
						isPlacingField ? "cursor-crosshair" : "cursor-default",
					)}
				>
					<div
						ref={setPageEl}
						className="relative bg-white"
						style={{
							width: documentWidth,
							height: documentHeight,
						}}
						onClick={handleDocumentClick}
					>
						{docRendering ? (
							<div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-background/80">
								<InlineLoader size="lg" />
								<span className="text-xs text-muted-foreground">
									Loading document…
								</span>
							</div>
						) : null}

						<DocumentPageContent
							document={currentDocument}
							documentWidth={documentWidth}
							documentHeight={documentHeight}
							pdfPageNumber={pdfPageNumber}
							isPlacingField={isPlacingField}
							pendingFieldType={pendingFieldType}
							onDocumentClick={handleDocumentClick}
							onPdfNumPagesLoaded={onPdfNumPagesLoaded}
							onPdfPageLayoutLoaded={onPdfPageLayoutLoaded}
							loadingMessage={documentLoadingMessage}
						/>

						<SignatureFieldOverlays
							signatureFields={currentPageFields}
							selectedFieldIds={selectedFieldIds}
							documentWidth={documentWidth}
							documentHeight={documentHeight}
							margin={margin}
							isMobile={isMobile}
							isPlacingField={isPlacingField}
							pdfNumPages={pdfNumPages}
							onFieldClick={handleFieldClick}
							onFieldRemove={handleFieldRemove}
							onFieldUpdate={handleFieldUpdate}
							onFieldDuplicate={handleFieldDuplicate}
							onRepeatOnAllPages={handleRepeatFieldOnAllPages}
							onResizeStart={onResizeStart}
							onResizeEnd={onResizeEnd}
						/>
					</div>
				</div>
			</PlacementCanvas>
		</div>
	);
}

export default memo(DocumentViewer);
