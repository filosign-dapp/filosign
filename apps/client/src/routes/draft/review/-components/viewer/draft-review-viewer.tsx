import { useCallback, useEffect, useMemo } from "react";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import {
	DocumentPageContent,
	DocumentSurface,
	PanZoomCanvas,
	useDocumentViewportCanvas,
} from "@/src/lib/domains/files/document-viewport";
import { FileViewerFieldOverlay } from "@/src/lib/domains/files/file-viewer/-components/field-overlay";
import { cn } from "@/src/lib/utils";
import { useDraftReviewViewerSlice } from "@/src/routes/draft/review/-lib/context/context";

export function DraftReviewViewer() {
	const {
		currentDocument,
		currentDocumentId,
		documentWidth,
		isPdfDocument,
		recordPdfPageLayout,
		getPageHeight,
		setPdfNumPages,
		pdfNumPages,
		placementFields,
		viewportBusy,
	} = useDraftReviewViewerSlice();

	const { setPageElForPage, clearPageEls, stripScrollBridge } =
		useDocumentViewportCanvas();

	const documentFields = useMemo(
		() => placementFields.filter((f) => f.documentId === currentDocumentId),
		[placementFields, currentDocumentId],
	);

	const onPdfPageLayoutLoaded = useCallback(
		(layout: { width: number; height: number }, pageNumber?: number) => {
			if (pageNumber != null) {
				recordPdfPageLayout(pageNumber, layout.height);
			}
		},
		[recordPdfPageLayout],
	);

	useEffect(() => {
		clearPageEls();
	}, [currentDocumentId, clearPageEls]);

	const renderPageOverlay = useCallback(
		(pageIndex: number) => (
			<FileViewerFieldOverlay
				pageIndex={pageIndex}
				fields={documentFields}
				completions={[]}
				showPlaceholders
				overlayClassName="z-[5]"
			/>
		),
		[documentFields],
	);

	if (viewportBusy) {
		return (
			<div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center p-4 text-sm text-muted-foreground">
				<InlineLoader size="lg" />
				<span className="mt-3">Preparing documents…</span>
			</div>
		);
	}

	if (!currentDocument?.pdfBytes) {
		const docName = currentDocument?.name ?? "This document";
		const mime = currentDocument?.mimeType;
		return (
			<div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
				<p className="max-w-md text-sm font-medium text-foreground">
					Cannot preview {docName}
				</p>
				<p className="max-w-md text-xs text-muted-foreground">
					{mime
						? `${mime} is not supported in draft review. Use PDF or image files.`
						: "This file format is not supported in draft review. Use PDF or image files."}
				</p>
			</div>
		);
	}

	const useStripLayout =
		isPdfDocument && (pdfNumPages ?? currentDocument.pages ?? 1) > 1;

	return (
		<div className="flex h-full min-h-0 flex-1 flex-col">
			<PanZoomCanvas className="h-full min-h-0 flex-1">
				<DocumentSurface layout={useStripLayout ? "strip" : "single"}>
					<div
						ref={(el) => {
							if (!useStripLayout) {
								setPageElForPage(1, el);
							}
						}}
						className={cn(
							"relative",
							useStripLayout ? "bg-transparent" : "bg-white p-1",
						)}
						style={
							!useStripLayout
								? {
										width: documentWidth,
										minHeight: getPageHeight(1),
									}
								: undefined
						}
					>
						<DocumentPageContent
							document={currentDocument}
							documentWidth={documentWidth}
							documentHeight={getPageHeight(1)}
							layout={useStripLayout ? "strip" : "single"}
							isPdfDocument={isPdfDocument}
							onPdfNumPagesLoaded={setPdfNumPages}
							onPdfPageLayoutLoaded={onPdfPageLayoutLoaded}
							setPageRef={setPageElForPage}
							renderPageOverlay={renderPageOverlay}
							stripScrollBridge={useStripLayout ? stripScrollBridge : undefined}
						/>
					</div>
				</DocumentSurface>
			</PanZoomCanvas>
		</div>
	);
}
