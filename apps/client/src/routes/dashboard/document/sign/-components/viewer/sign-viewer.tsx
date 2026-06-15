import {
	FILE_ACK_INTENT_LABELS,
	FILE_ACK_INTENT_VERSION_V1,
} from "@filosign/shared";
import { useCallback, useEffect, useMemo } from "react";
import { SkeletonDocumentCanvas } from "@/src/lib/components/app/skeletons";
import { Button } from "@/src/lib/components/ui/button";
import { DocCanvasPanel } from "@/src/lib/domains/files/components/doc-canvas-panel";
import {
	DocumentPageContent,
	DocumentSurface,
	focusNormalizedFieldInViewport,
	PanZoomCanvas,
	useDocumentViewportCanvas,
} from "@/src/lib/domains/files/document-viewport";
import { FileViewerFieldOverlay } from "@/src/lib/domains/files/file-viewer/-components/field-overlay";
import { cn } from "@/src/lib/utils";
import { PlacementFieldOverlay } from "@/src/routes/dashboard/document/sign/-components/placement-field-overlay";
import {
	useSignFile,
	useSignPlacement,
	useSignSigning,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { isEnvelopeVoided } from "@/src/routes/dashboard/document/sign/-lib/utils/envelope-progress-display";

export function SignViewer() {
	const { file, fileQuery, acknowledge } = useSignFile();
	const { filePending, fileError, acknowledgeFile } = fileQuery;
	const { handleAcknowledge } = acknowledge;
	const {
		fileData,
		viewError,
		handleViewFile,
		viewFile,
		docCanvasBusy,
		showRecoveryInCanvas,
		recoveryPhrase,
		setRecoveryPhrase,
		recoveryError,
		submitRecovery,
		recoveryPending,
		cryptoUnlockError,
		retryWalletUnlock,
		tryingWalletUnlock,
		currentDocument,
		currentDocumentId,
		documentWidth,
		isPdfDocument,
		recordPdfPageLayout,
		getPageHeight,
		setSignPdfNumPages,
		signPdfNumPages,
		fieldFocusRequestId,
		clearFieldFocusRequest,
	} = useSignViewer();
	const {
		myPlacementFields,
		visiblePlacementFields,
		fieldCompletions,
		togglePlacementField,
		getTextFieldValue,
		handleTextDraftChange,
		handleTextFocus,
		handleTextBlur,
		provisioningFieldIds,
	} = useSignPlacement();
	const { alreadySigned } = useSignSigning();
	const {
		panPinchRef,
		wrapperRef,
		setPageElForPage,
		clearPageEls,
		stripScrollBridge,
	} = useDocumentViewportCanvas();

	const isRevoked = isEnvelopeVoided(file?.envelopeProgress);
	const needsAck =
		file?.participantAccess && !file.participantAccess.canDecrypt;

	const myPlacementFieldIds = useMemo(
		() => new Set(myPlacementFields.map((f) => f.id)),
		[myPlacementFields],
	);

	const documentFields = useMemo(
		() =>
			visiblePlacementFields.filter((f) => f.documentId === currentDocumentId),
		[visiblePlacementFields, currentDocumentId],
	);

	const myDocumentFields = useMemo(
		() => myPlacementFields.filter((f) => f.documentId === currentDocumentId),
		[myPlacementFields, currentDocumentId],
	);

	const otherVisibleFields = useMemo(
		() => documentFields.filter((f) => !myPlacementFieldIds.has(f.id)),
		[documentFields, myPlacementFieldIds],
	);

	const envelopeFieldCompletions = useMemo(
		() => file?.fieldCompletions ?? [],
		[file?.fieldCompletions],
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

	const fieldsById = useMemo(
		() => new Map(documentFields.map((field) => [field.id, field])),
		[documentFields],
	);

	useEffect(() => {
		if (!fieldFocusRequestId) return;
		const field = fieldsById.get(fieldFocusRequestId);
		if (!field) {
			clearFieldFocusRequest();
			return;
		}
		requestAnimationFrame(() => {
			focusNormalizedFieldInViewport({
				panPinchRef: panPinchRef.current,
				wrapperEl: wrapperRef.current,
				field,
				getPageHeight,
				pageWidth: documentWidth,
			});
			clearFieldFocusRequest();
		});
	}, [
		fieldFocusRequestId,
		fieldsById,
		panPinchRef,
		wrapperRef,
		getPageHeight,
		documentWidth,
		clearFieldFocusRequest,
	]);

	const renderPageOverlay = useCallback(
		(pageIndex: number) => (
			<>
				<FileViewerFieldOverlay
					pageIndex={pageIndex}
					fields={otherVisibleFields}
					completions={envelopeFieldCompletions}
					showPlaceholders
					overlayClassName="z-[5]"
				/>
				<PlacementFieldOverlay
					pageIndex={pageIndex}
					fields={myDocumentFields}
					fieldCompletions={fieldCompletions}
					alreadySigned={alreadySigned}
					onToggleField={(field) => void togglePlacementField(field)}
					getTextFieldValue={getTextFieldValue}
					onTextDraftChange={handleTextDraftChange}
					onTextFocus={handleTextFocus}
					onTextBlur={handleTextBlur}
					provisioningFieldIds={provisioningFieldIds}
				/>
			</>
		),
		[
			otherVisibleFields,
			envelopeFieldCompletions,
			myDocumentFields,
			fieldCompletions,
			alreadySigned,
			togglePlacementField,
			getTextFieldValue,
			handleTextDraftChange,
			handleTextFocus,
			handleTextBlur,
			provisioningFieldIds,
		],
	);

	if (filePending && !file) {
		return (
			<div className="flex h-full min-h-0 flex-1 flex-col">
				<DocCanvasPanel
					busy
					documentWidth={documentWidth}
					documentHeight={getPageHeight(1)}
				/>
			</div>
		);
	}

	if (fileError || (!filePending && !file)) {
		return (
			<div className="flex h-full min-h-0 flex-1 flex-col">
				<DocCanvasPanel
					error={
						fileError instanceof Error ? fileError.message : "File not found"
					}
				/>
			</div>
		);
	}

	if (isRevoked && needsAck) {
		return (
			<div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
				<p className="text-sm font-medium text-destructive">Envelope voided</p>
				<p className="max-w-md text-sm text-muted-foreground">
					The sender voided this envelope before it was completed. You can no
					longer accept or sign it.
				</p>
			</div>
		);
	}

	if (needsAck) {
		return (
			<div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
				<p className="max-w-md text-sm text-muted-foreground">
					{FILE_ACK_INTENT_LABELS[FILE_ACK_INTENT_VERSION_V1]}
				</p>
				<Button
					variant="primary"
					onClick={() => void handleAcknowledge()}
					disabled={acknowledgeFile.isPending}
				>
					{acknowledgeFile.isPending ? "Accepting…" : "Accept file"}
				</Button>
			</div>
		);
	}

	if (
		docCanvasBusy ||
		showRecoveryInCanvas ||
		cryptoUnlockError ||
		viewError ||
		!fileData
	) {
		const canvasError = cryptoUnlockError ?? viewError;
		const canvasOnRetry = cryptoUnlockError
			? () => retryWalletUnlock()
			: () => void handleViewFile();
		const canvasRetryPending = cryptoUnlockError
			? tryingWalletUnlock
			: viewFile.isPending;

		return (
			<div className="flex h-full min-h-0 flex-1 flex-col">
				<DocCanvasPanel
					busy={docCanvasBusy}
					documentWidth={documentWidth}
					documentHeight={getPageHeight(1)}
					showRecovery={showRecoveryInCanvas}
					recoveryPhrase={recoveryPhrase}
					onRecoveryPhraseChange={setRecoveryPhrase}
					recoveryError={recoveryError}
					walletUnlockError={cryptoUnlockError}
					onRecoverySubmit={() => void submitRecovery()}
					recoveryPending={recoveryPending}
					error={showRecoveryInCanvas ? null : canvasError}
					onRetry={showRecoveryInCanvas ? undefined : canvasOnRetry}
					retryPending={canvasRetryPending}
				/>
			</div>
		);
	}

	if (!currentDocument?.pdfBytes) {
		return (
			<SkeletonDocumentCanvas
				className="h-full min-h-0 flex-1"
				documentWidth={documentWidth}
				documentHeight={getPageHeight(1)}
			/>
		);
	}

	const useStripLayout =
		isPdfDocument && (signPdfNumPages ?? currentDocument.pages ?? 1) > 1;

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
							onPdfNumPagesLoaded={setSignPdfNumPages}
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
