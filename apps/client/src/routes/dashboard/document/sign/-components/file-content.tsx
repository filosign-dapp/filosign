import {
	FILE_ACK_INTENT_LABELS,
	FILE_ACK_INTENT_VERSION_V1,
} from "@filosign/shared";
import { DownloadIcon, FileTextIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { DocCanvasPanel } from "@/src/lib/domains/files/components/doc-canvas-panel";
import { FileViewerFieldOverlay } from "@/src/lib/domains/files/file-viewer/-components/field-overlay";
import { PLACEMENT_VIEWPORT_WIDTH } from "@/src/lib/domains/files/placement-viewport";
import {
	useSignCompliance,
	useSignFile,
	useSignPlacement,
	useSignSigning,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";
import { SignDocumentPdfPreview } from "./pdf-preview";
import { PlacementFieldOverlay } from "./placement-field-overlay";

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
		completedFieldIds,
		applyPlacementField,
		handleTextChange,
		handleCheckboxToggle,
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
					completedFieldIds={completedFieldIds}
					alreadySigned={alreadySigned}
					onApplyField={applyPlacementField}
					onTextChange={handleTextChange}
					onCheckboxToggle={handleCheckboxToggle}
				/>
			</>
		),
		[
			otherVisibleFields,
			envelopeFieldCompletions,
			myPlacementFields,
			fieldCompletions,
			completedFieldIds,
			alreadySigned,
			applyPlacementField,
			handleTextChange,
			handleCheckboxToggle,
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
	const mimeType = metadata.mimeType;
	const fileName = metadata.name;

	if (
		mimeType?.startsWith("image/") ||
		fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)
	) {
		const arrayBuffer = new ArrayBuffer(fileBytes.length);
		new Uint8Array(arrayBuffer).set(fileBytes);
		const blob = new Blob([arrayBuffer], { type: mimeType });
		const imageUrl = URL.createObjectURL(blob);

		return (
			<div className="flex flex-col items-center justify-center w-full h-full gap-4 p-4 md:p-8 bg-muted/5">
				<div
					className="relative bg-white border shadow-lg border-border"
					style={{
						width: viewportWidth,
						height: viewportHeight,
						transform: `scale(${zoom / 100})`,
						transformOrigin: "center",
					}}
				>
					<img
						src={imageUrl}
						alt={fileName || "Document"}
						className="absolute inset-0 w-full h-full object-contain"
						onLoad={() => URL.revokeObjectURL(imageUrl)}
					/>
					{renderPageOverlay(0)}
				</div>
			</div>
		);
	}

	if (
		mimeType === "application/pdf" ||
		fileName?.toLowerCase().endsWith(".pdf")
	) {
		if (!previewPdfBytes) {
			return (
				<div className="flex items-center justify-center w-full h-full p-4 text-sm text-muted-foreground">
					Loading PDF…
				</div>
			);
		}

		return (
			<div className="flex flex-col items-center justify-center w-full h-full gap-4 p-4 md:p-8 bg-muted/5">
				<div
					className="relative bg-white border shadow-lg border-border"
					style={{
						width: viewportWidth,
						height: viewportHeight,
						transform: `scale(${zoom / 100})`,
						transformOrigin: "center",
					}}
				>
					<div className="absolute inset-0 overflow-hidden bg-white">
						<SignDocumentPdfPreview
							className="absolute inset-0 z-0"
							documentKey={pieceCid ?? "sign"}
							file={previewPdfBytes}
							pageNumber={signPdfPage}
							width={viewportWidth}
							maxHeight={800}
							onPageLayoutLoaded={({ height }) => setPdfLayoutHeight(height)}
							onNumPagesLoaded={(n) => {
								setSignPdfNumPages(n);
								setSignPdfPage((p) => Math.min(p, n));
							}}
							renderPageOverlay={renderPageOverlay}
						/>
					</div>
				</div>
			</div>
		);
	}

	if (
		mimeType?.startsWith("text/") ||
		fileName?.toLowerCase().match(/\.(txt|md|json|xml|html|css|js|ts)$/)
	) {
		try {
			const textContent = new TextDecoder().decode(fileBytes);
			return (
				<div className="w-full h-full p-4 md:p-8 overflow-auto">
					<pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
						{textContent}
					</pre>
				</div>
			);
		} catch (error) {
			console.error("Error decoding text file:", error);
			return (
				<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
					<div className="flex flex-col items-center gap-3 md:gap-4">
						<FileTextIcon className="size-12 md:size-16 text-muted-foreground/50" />
						<div className="text-xs md:text-sm">Cannot display text file</div>
					</div>
				</div>
			);
		}
	}

	return (
		<div className="flex flex-col items-center justify-center w-full h-full gap-4 p-4 text-sm text-muted-foreground">
			<div className="flex flex-col items-center gap-3 text-center">
				<FileTextIcon className="size-12 md:size-16 text-muted-foreground/50" />
				<div className="text-xs md:text-sm">
					Preview not available for this file type
				</div>
				<div className="text-xs text-muted-foreground/70">
					{mimeType || fileName}
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={handleDownload}
					className="mt-2"
				>
					<DownloadIcon className="size-4 mr-2" />
					Download File
				</Button>
			</div>
			{canSign && myPlacementFields.length > 0 && (
				<div className="w-full max-w-md rounded-lg border border-border bg-background/90 p-4 text-left">
					<p className="mb-3 text-xs font-medium text-foreground">
						Tap each assigned field on the document before signing.
					</p>
					<div className="flex flex-col gap-2">
						{myPlacementFields.map((field) => {
							const done = isMyPlacementFieldDone(field.id);
							return (
								<Button
									key={field.id}
									type="button"
									size="sm"
									variant={done ? "secondary" : "outline"}
									className="h-auto justify-start py-2 text-left text-xs"
									disabled={alreadySigned}
									onClick={() => applyPlacementField(field)}
								>
									p.{field.pageIndex + 1} · {field.type}
									{field.required ? " · required" : ""}
									{alreadySigned ? " · signed" : done ? " ✓" : ""}
								</Button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
