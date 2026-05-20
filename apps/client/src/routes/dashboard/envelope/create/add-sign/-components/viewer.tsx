import { cn } from "@/src/lib/utils/utils";
import { useAddSignViewer } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import { useDocumentViewerInteraction } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-viewer-interaction";
import { SignatureFieldOverlays } from "./field-overlays";
import { DocumentPageContent } from "./page-content";
import { DocumentViewerToolbar } from "./viewer-toolbar";

export default function DocumentViewer() {
	const {
		currentDocument,
		currentPage,
		currentPageFields,
		zoom,
		setZoom,
		setCurrentPage,
		selectedField,
		isPlacingField,
		pendingFieldType,
		handleFieldPlacementRequest,
		handleFieldSelect,
		handleFieldRemove,
		handleFieldUpdate,
		handleBack,
	} = useAddSignViewer();

	const interaction = useDocumentViewerInteraction({
		document: currentDocument ?? null,
		zoom,
		documentPage: currentPage,
		isPlacingField,
		signatureFields: currentPageFields,
		onFieldPlacementRequest: handleFieldPlacementRequest,
		onPdfPageChange: setCurrentPage,
		onFieldSelect: handleFieldSelect,
		onFieldUpdate: handleFieldUpdate,
	});

	if (!currentDocument) {
		return null;
	}

	const {
		documentRef,
		documentWidth,
		documentHeight,
		margin,
		isMobile,
		fieldWidth,
		fieldHeight,
		isPdfDocument,
		pdfPageNumber,
		pdfNumPages,
		goToPreviousPdfPage,
		goToNextPdfPage,
		handlePdfNumPagesLoaded,
		handleDocumentClick,
		handleFieldClick,
		handleFieldMouseDown,
	} = interaction;

	return (
		<div className="flex flex-col flex-1">
			<DocumentViewerToolbar
				isPdfDocument={isPdfDocument}
				pdfPageNumber={pdfPageNumber}
				pdfNumPages={pdfNumPages}
				onPreviousPage={goToPreviousPdfPage}
				onNextPage={goToNextPdfPage}
				zoom={zoom}
				onZoomChange={setZoom}
				onBack={handleBack}
			/>

			<div
				className={cn(
					"overflow-auto bg-muted/10 flex items-start justify-center px-8 py-8 flex-1",
					isPlacingField ? "cursor-crosshair" : "cursor-default",
				)}
			>
				<div
					ref={documentRef}
					className="w-fit bg-white border shadow-lg border-border"
					style={{
						transform: `scale(${zoom / 100})`,
						transformOrigin: "top left",
					}}
				>
					<div
						className="bg-white relative"
						style={{
							width: documentWidth,
							height: documentHeight,
						}}
					>
						<DocumentPageContent
							document={currentDocument}
							documentWidth={documentWidth}
							documentHeight={documentHeight}
							pdfPageNumber={pdfPageNumber}
							isPlacingField={isPlacingField}
							pendingFieldType={pendingFieldType}
							onDocumentClick={handleDocumentClick}
							onPdfNumPagesLoaded={handlePdfNumPagesLoaded}
						/>

						<SignatureFieldOverlays
							signatureFields={currentPageFields}
							selectedField={selectedField}
							documentWidth={documentWidth}
							documentHeight={documentHeight}
							fieldWidth={fieldWidth}
							fieldHeight={fieldHeight}
							margin={margin}
							isMobile={isMobile}
							onFieldClick={handleFieldClick}
							onFieldMouseDown={handleFieldMouseDown}
							onFieldRemove={handleFieldRemove}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
