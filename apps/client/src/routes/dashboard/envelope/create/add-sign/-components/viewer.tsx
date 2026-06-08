import { useDroppable } from "@dnd-kit/core";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { cn } from "@/src/lib/utils/utils";
import { PlacementCanvas } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-canvas";
import {
	PlacementMarqueeOverlay,
	PlacementPageHighlight,
	PlacementViewportCapture,
} from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-layer";
import { PlacementPageOverlays } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-page-overlays";
import { PlacementSurface } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-surface";
import {
	useAddSignShell,
	useAddSignViewer,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/context/context";
import { useMarqueeModifierHeld } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-marquee-modifier-held";
import { useMarqueeSelection } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-marquee-selection";
import { usePlacementCanvas } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-placement-canvas";
import { useDocumentViewerInteraction } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-viewer-interaction";
import {
	focusPagePointInStripCanvas,
	PLACEMENT_CANVAS_DROPPABLE_ID,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/placement-coordinates";
import { DocumentPageContent } from "./page-content";

function DocumentViewer() {
	const { docRendering, setDocRendering } = useAddSignShell();
	const {
		currentDocument,
		signatureFields,
		selectedFieldIds,
		isPlacingField,
		pendingFieldType,
		handlePlaceAtCoords,
		handleFieldSelect,
		handleMarqueeSelect,
		handleCanvasDeselect,
		handleFieldRemove,
		handleFieldUpdate,
		handleFieldDuplicate,
		recordPdfPageLayout,
		setPdfNumPages,
		pdfNumPages,
		getPageHeight,
		documentLoadingMessage,
		isInteractingField,
		setIsInteractingField,
		fieldFocusRequestId,
		clearFieldFocusRequest,
		resolvePlacementFieldSize,
	} = useAddSignViewer();

	const {
		panPinchRef,
		wrapperRef,
		setPageElForPage,
		clearPageEls,
		stripScrollBridge,
	} = usePlacementCanvas();
	const [canvasContainer, setCanvasContainer] = useState<HTMLDivElement | null>(
		null,
	);
	const suppressCanvasClickRef = useRef(false);

	const onPdfPageLayoutLoaded = useCallback(
		(layout: { width: number; height: number }, pageNumber?: number) => {
			if (pageNumber != null) {
				recordPdfPageLayout(pageNumber, layout.height);
			}
			setDocRendering(false);
		},
		[recordPdfPageLayout, setDocRendering],
	);

	const interaction = useDocumentViewerInteraction({
		document: currentDocument ?? null,
		isPlacingField,
		pendingFieldType,
		onPlaceAtCoords: handlePlaceAtCoords,
		onFieldSelect: handleFieldSelect,
		onCanvasDeselect: handleCanvasDeselect,
		getPageHeight,
		resolvePlacementFieldSize,
	});

	useEffect(() => {
		clearPageEls();
	}, [currentDocument?.id, clearPageEls]);

	const fieldsById = useMemo(
		() => new Map(signatureFields.map((field) => [field.id, field])),
		[signatureFields],
	);

	useEffect(() => {
		if (!fieldFocusRequestId) return;
		const field = fieldsById.get(fieldFocusRequestId);
		if (!field) {
			clearFieldFocusRequest();
			return;
		}

		const centerX = field.x + field.width / 2;
		const centerY = field.y + field.height / 2;
		requestAnimationFrame(() => {
			focusPagePointInStripCanvas({
				panPinchRef: panPinchRef.current,
				wrapperEl: wrapperRef.current,
				page: field.page,
				pageX: centerX,
				pageY: centerY,
				pageWidth: interaction.documentWidth,
			});
			clearFieldFocusRequest();
		});
	}, [
		fieldFocusRequestId,
		fieldsById,
		panPinchRef,
		wrapperRef,
		clearFieldFocusRequest,
		interaction.documentWidth,
	]);

	const isMarqueeModifierHeld = useMarqueeModifierHeld(!isPlacingField);

	const onMarqueeSelect = useCallback(
		(fieldIds: string[], additive: boolean) => {
			suppressCanvasClickRef.current = true;
			handleMarqueeSelect(fieldIds, additive);
		},
		[handleMarqueeSelect],
	);

	const { marqueeRect } = useMarqueeSelection({
		enabled: !isPlacingField && !docRendering,
		container: canvasContainer,
		onSelect: onMarqueeSelect,
		onActiveChange: setIsInteractingField,
	});

	const {
		documentWidth,
		margin,
		isMobile,
		isPdfDocument,
		handleDocumentClick,
		handleFieldClick,
	} = interaction;

	const onPdfNumPagesLoaded = useCallback(
		(n: number) => {
			setPdfNumPages(n);
		},
		[setPdfNumPages],
	);

	const documentFields = useMemo(
		() => signatureFields.filter((f) => f.documentId === currentDocument?.id),
		[signatureFields, currentDocument?.id],
	);

	const fieldsByPage = useMemo(() => {
		const map = new Map<number, typeof documentFields>();
		for (const field of documentFields) {
			const list = map.get(field.page) ?? [];
			list.push(field);
			map.set(field.page, list);
		}
		return map;
	}, [documentFields]);

	const overlayProps = useMemo(
		() => ({
			selectedFieldIds,
			documentWidth,
			margin,
			isMobile,
			isPlacingField,
			onFieldClick: handleFieldClick,
			onFieldRemove: handleFieldRemove,
			onFieldUpdate: handleFieldUpdate,
			onFieldDuplicate: handleFieldDuplicate,
			onResizeStart: () => setIsInteractingField(true),
			onResizeEnd: () => setIsInteractingField(false),
		}),
		[
			selectedFieldIds,
			documentWidth,
			margin,
			isMobile,
			isPlacingField,
			handleFieldClick,
			handleFieldRemove,
			handleFieldUpdate,
			handleFieldDuplicate,
			setIsInteractingField,
		],
	);

	const renderPageOverlay = useCallback(
		(pageIndex: number) => {
			const pageNumber = pageIndex + 1;
			const pageFields = fieldsByPage.get(pageNumber) ?? [];
			return (
				<>
					{isPlacingField ? (
						<PlacementPageHighlight pendingFieldType={pendingFieldType} />
					) : null}
					<PlacementPageOverlays
						pageFields={pageFields}
						documentHeight={getPageHeight(pageNumber)}
						{...overlayProps}
					/>
				</>
			);
		},
		[
			fieldsByPage,
			overlayProps,
			getPageHeight,
			isPlacingField,
			pendingFieldType,
		],
	);

	const { setNodeRef: setCanvasRef } = useDroppable({
		id: PLACEMENT_CANVAS_DROPPABLE_ID,
	});

	if (!currentDocument) {
		return null;
	}

	const useStripLayout =
		isPdfDocument && (pdfNumPages ?? currentDocument.pages ?? 1) > 1;

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<PlacementMarqueeOverlay rect={marqueeRect} />
			<PlacementCanvas
				isPlacingField={isPlacingField}
				isInteractingField={isInteractingField}
				isMarqueeModifierHeld={isMarqueeModifierHeld}
				className="min-h-0 flex-1"
				placementCapture={
					isPlacingField ? (
						<PlacementViewportCapture
							pendingFieldType={pendingFieldType}
							onDocumentClick={handleDocumentClick}
						/>
					) : null
				}
			>
				<PlacementSurface
					layout={useStripLayout ? "strip" : "single"}
					placing={isPlacingField}
				>
					<div ref={setCanvasRef}>
						{/* biome-ignore lint/a11y/noStaticElementInteractions: canvas deselect on background click */}
						{/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard canvas navigation is out of scope */}
						<div
							ref={(el) => {
								setCanvasContainer(el);
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
							onClick={
								!useStripLayout && !isPlacingField
									? () => {
											if (suppressCanvasClickRef.current) {
												suppressCanvasClickRef.current = false;
												return;
											}
											handleCanvasDeselect();
										}
									: undefined
							}
						>
							{docRendering ? (
								<div className="absolute inset-0 z-40 flex min-h-48 flex-col items-center justify-center gap-2 bg-background/80">
									<InlineLoader size="lg" />
									<span className="text-xs text-muted-foreground">
										Loading document…
									</span>
								</div>
							) : null}

							<DocumentPageContent
								document={currentDocument}
								documentWidth={documentWidth}
								documentHeight={getPageHeight(1)}
								layout={useStripLayout ? "strip" : "single"}
								isPlacingField={isPlacingField}
								isPdfDocument={isPdfDocument}
								onPdfNumPagesLoaded={onPdfNumPagesLoaded}
								onPdfPageLayoutLoaded={onPdfPageLayoutLoaded}
								setPageRef={setPageElForPage}
								renderPageOverlay={
									useStripLayout ? renderPageOverlay : undefined
								}
								stripScrollBridge={
									useStripLayout ? stripScrollBridge : undefined
								}
								loadingMessage={documentLoadingMessage}
							/>

							{!useStripLayout ? (
								<>
									{isPlacingField ? (
										<PlacementPageHighlight
											pendingFieldType={pendingFieldType}
										/>
									) : null}
									<PlacementPageOverlays
										pageFields={documentFields}
										documentHeight={getPageHeight(1)}
										{...overlayProps}
									/>
								</>
							) : null}
						</div>
					</div>
				</PlacementSurface>
			</PlacementCanvas>
		</div>
	);
}

export default memo(DocumentViewer);
