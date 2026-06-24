import { useCallback, useEffect, useMemo, useRef } from "react";
import { DocCanvasPanel } from "@/src/lib/domains/files/components/doc-canvas-panel";
import { EnvelopeAckGate } from "@/src/lib/domains/files/components/envelope-ack-gate";
import { FileViewerContent } from "@/src/lib/domains/files/file-viewer/-components/file-viewer-content";
import { FileViewerToolbar } from "@/src/lib/domains/files/file-viewer/-components/file-viewer-toolbar";
import {
	FileViewerProvider,
	useFileViewer,
} from "@/src/lib/domains/files/file-viewer/-lib/context/context";
import { useFileViewerController } from "@/src/lib/domains/files/file-viewer/-lib/hooks/use-file-viewer-controller";
import type { FileViewerProps } from "@/src/lib/domains/files/file-viewer/-lib/types";

function FileViewerShell({
	open,
	onOpenChange,
}: Pick<FileViewerProps, "open" | "onOpenChange">) {
	const containerRef = useRef<HTMLDivElement>(null);
	const {
		fileLoading,
		viewFile,
		fileInfo,
		docCanvasBusy,
		showRecoveryInCanvas,
		recoveryPhrase,
		setRecoveryPhrase,
		recoveryError,
		submitRecovery,
		recoveryPending,
		viewError,
		handleViewFile,
		cryptoUnlockError,
		retryWalletUnlock,
		tryingWalletUnlock,
		fileData,
		needsAck,
		isEnvelopeComplete,
		handleAcknowledge,
		acknowledgePending,
	} = useFileViewer();

	const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

	const handleBackdropClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.target === e.currentTarget) {
				onOpenChange(false);
			}
		},
		[onOpenChange],
	);

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onOpenChange(false);
		};
		if (open) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden";
		}
		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "unset";
		};
	}, [open, onOpenChange]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-foreground/90 backdrop-blur-sm"
			onClick={handleBackdropClick}
			onKeyDown={(e) => {
				if (e.key === "Escape") onOpenChange(false);
			}}
			role="button"
			tabIndex={0}
		>
			<FileViewerToolbar onClose={handleClose} />
			<div className="flex flex-col h-screen pt-16 @md:pt-20 overflow-hidden">
				<div
					ref={containerRef}
					className="overflow-auto bg-transparent flex items-center justify-center px-4 py-4 @md:px-8 @md:py-8 flex-1"
				>
					{fileLoading ? (
						<DocCanvasPanel busy />
					) : needsAck ? (
						<EnvelopeAckGate
							isComplete={isEnvelopeComplete}
							onAcknowledge={handleAcknowledge}
							pending={acknowledgePending}
						/>
					) : (
						<DocCanvasPanel
							busy={docCanvasBusy}
							showRecovery={showRecoveryInCanvas}
							recoveryPhrase={recoveryPhrase}
							onRecoveryPhraseChange={setRecoveryPhrase}
							recoveryError={recoveryError}
							walletUnlockError={cryptoUnlockError}
							onRecoverySubmit={() => void submitRecovery()}
							recoveryPending={recoveryPending}
							error={
								showRecoveryInCanvas ? null : (cryptoUnlockError ?? viewError)
							}
							onRetry={
								showRecoveryInCanvas
									? undefined
									: cryptoUnlockError
										? () => retryWalletUnlock()
										: () => void handleViewFile()
							}
							retryPending={
								cryptoUnlockError ? tryingWalletUnlock : viewFile.isPending
							}
						/>
					)}
					{!fileLoading && fileInfo && fileData && !needsAck ? (
						<FileViewerContent />
					) : null}
				</div>
			</div>
		</div>
	);
}

export function FileViewer({ file, open, onOpenChange }: FileViewerProps) {
	const controller = useFileViewerController(file, { viewerOpen: open });
	const providerValue = useMemo(
		() => controller,
		[
			controller.fileData,
			controller.viewError,
			controller.docCanvasBusy,
			controller.showRecoveryInCanvas,
			controller.recoveryPending,
			controller.fileLoading,
			controller.viewFile.isPending,
			controller.needsAck,
			controller.acknowledgePending,
		],
	);

	return (
		<FileViewerProvider value={providerValue}>
			<FileViewerShell open={open} onOpenChange={onOpenChange} />
		</FileViewerProvider>
	);
}
