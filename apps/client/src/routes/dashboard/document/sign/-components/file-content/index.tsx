import {
	FILE_ACK_INTENT_LABELS,
	FILE_ACK_INTENT_VERSION_V1,
} from "@filosign/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { DocCanvasPanel } from "@/src/lib/domains/files/components/doc-canvas-panel";
import { FileViewerFieldOverlay } from "@/src/lib/domains/files/file-viewer/-components/field-overlay";
import { PLACEMENT_VIEWPORT_WIDTH } from "@/src/lib/domains/files/placement-viewport";
import {
	isImagePreview,
	isPdfMimePreview,
	isTextPreview,
	SignDocumentImagePreview,
	SignDocumentPdfPreviewView,
	SignDocumentTextPreview,
	SignDocumentUnsupportedPreview,
} from "@/src/routes/dashboard/document/sign/-components/file-content/views";
import {
	useSignCompliance,
	useSignFile,
	useSignPlacement,
	useSignSigning,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { PlacementFieldOverlay } from "../placement-field-overlay";

export function SignDocumentFileContent() {
	const { pieceCid, file, fileQuery, acknowledge } = useSignFile();
	const { filePending, fileError, acknowledgeFile } = fileQuery;
	const { handleAcknowledge } = acknowledge;
	const [pdfLayoutHeight, setPdfLayoutHeight] = useState<number | null>(null);
	const viewportWidth = PLACEMENT_VIEWPORT_WIDTH;
	const viewportHeight = pdfLayoutHeight ?? 800;

	const {
		fileData,
		viewError,
		viewFile,
		handleViewFile,
		zoom,
		previewPdfBytes,
		signPdfPage,
		setSignPdfPage,
		setSignPdfNumPages,
		docCanvasBusy,
		showRecoveryInCanvas,
		recoveryPhrase,
		setRecoveryPhrase,
		recoveryError,
		submitRecovery,
		recoveryPending,
	} = useSignViewer();

	useEffect(() => {
		setPdfLayoutHeight(null);
	}, [pieceCid, signPdfPage]);

	const {
		myPlacementFields,
		visiblePlacementFields,
		fieldCompletions,
		togglePlacementField,
		handleTextChange,
		isMyPlacementFieldDone,
	} = useSignPlacement();
	const { alreadySigned, canSign } = useSignSigning();
	const { handleDownload } = useSignCompliance();

	const myPlacementFieldIds = useMemo(
		() => new Set(myPlacementFields.map((f) => f.id)),
		[myPlacementFields],
	);

	const otherVisibleFields = useMemo(
		() => visiblePlacementFields.filter((f) => !myPlacementFieldIds.has(f.id)),
		[visiblePlacementFields, myPlacementFieldIds],
	);

	const envelopeFieldCompletions = useMemo(
		() => file?.fieldCompletions ?? [],
		[file?.fieldCompletions],
	);

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
					fields={myPlacementFields}
					fieldCompletions={fieldCompletions}
					alreadySigned={alreadySigned}
					onToggleField={(field) => void togglePlacementField(field)}
					onTextChange={handleTextChange}
				/>
			</>
		),
		[
			otherVisibleFields,
			envelopeFieldCompletions,
			myPlacementFields,
			fieldCompletions,
			alreadySigned,
			togglePlacementField,
			handleTextChange,
		],
	);

	const needsAck =
		file?.participantAccess && !file.participantAccess.canDecrypt;

	if (filePending && !file) {
		return <DocCanvasPanel busy />;
	}

	if (fileError || (!filePending && !file)) {
		return (
			<DocCanvasPanel
				error={
					fileError instanceof Error ? fileError.message : "File not found"
				}
			/>
		);
	}

	if (needsAck) {
		return (
			<div className="flex w-full h-full flex-col items-center justify-center gap-3 p-6 text-center">
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

	const canvasGate = (
		<DocCanvasPanel
			busy={docCanvasBusy}
			showRecovery={showRecoveryInCanvas}
			recoveryPhrase={recoveryPhrase}
			onRecoveryPhraseChange={setRecoveryPhrase}
			recoveryError={recoveryError}
			onRecoverySubmit={() => void submitRecovery()}
			recoveryPending={recoveryPending}
			error={viewError}
			onRetry={() => void handleViewFile()}
			retryPending={viewFile.isPending}
		/>
	);

	if (docCanvasBusy || showRecoveryInCanvas || viewError || !fileData) {
		return canvasGate;
	}

	const { fileBytes, metadata } = fileData;
	const primaryDoc = fileData.documents[0];
	const mimeType = metadata.mimeType ?? primaryDoc?.mimeType;
	const fileName = metadata.name ?? primaryDoc?.name;

	if (isImagePreview(mimeType, fileName)) {
		return (
			<SignDocumentImagePreview
				mimeType={mimeType}
				fileName={fileName}
				fileBytes={fileBytes}
				viewportWidth={viewportWidth}
				viewportHeight={viewportHeight}
				zoom={zoom}
				renderPageOverlay={renderPageOverlay}
			/>
		);
	}

	if (
		isPdfMimePreview(previewPdfBytes, mimeType, primaryDoc?.mimeType, fileName)
	) {
		if (!previewPdfBytes) {
			return (
				<div className="flex items-center justify-center w-full h-full p-4 text-sm text-muted-foreground">
					Loading PDF…
				</div>
			);
		}

		return (
			<SignDocumentPdfPreviewView
				pieceCid={pieceCid}
				previewPdfBytes={previewPdfBytes}
				viewportWidth={viewportWidth}
				viewportHeight={viewportHeight}
				zoom={zoom}
				signPdfPage={signPdfPage}
				setPdfLayoutHeight={setPdfLayoutHeight}
				setSignPdfNumPages={setSignPdfNumPages}
				setSignPdfPage={setSignPdfPage}
				renderPageOverlay={renderPageOverlay}
			/>
		);
	}

	if (isTextPreview(mimeType, fileName)) {
		return <SignDocumentTextPreview fileBytes={fileBytes} />;
	}

	return (
		<SignDocumentUnsupportedPreview
			mimeType={mimeType}
			fileName={fileName}
			handleDownload={handleDownload}
			canSign={canSign}
			myPlacementFields={myPlacementFields}
			alreadySigned={alreadySigned}
			isMyPlacementFieldDone={isMyPlacementFieldDone}
			togglePlacementField={togglePlacementField}
		/>
	);
}
