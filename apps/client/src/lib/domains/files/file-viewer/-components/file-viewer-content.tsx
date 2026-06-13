import { zPlacementManifest } from "@filosign/shared";
import { DownloadIcon, FileIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { AppEmptyState } from "@/src/lib/components/app/empty-state";
import {
	LazyBoundary,
	LazyPdfJsPreview,
} from "@/src/lib/components/app/suspense";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { FileViewerFieldOverlay } from "@/src/lib/domains/files/file-viewer/-components/field-overlay";
import { useFileViewer } from "@/src/lib/domains/files/file-viewer/-lib/context/context";

export function FileViewerContent() {
	const {
		file,
		fileInfo,
		viewError,
		fileData,
		viewFile,
		handleViewFile,
		previewPdfBytes,
		zoom,
		documentDimensions,
		handleDownloadOriginalFiles,
	} = useFileViewer();

	if (viewError) {
		return (
			<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
				<div className="flex flex-col items-center gap-3 md:gap-4">
					<FileIcon className="size-12 md:size-16 text-destructive/50" />
					<div className="text-xs md:text-sm text-destructive font-medium">
						Failed to decrypt file
					</div>
					<div className="text-xs text-muted-foreground max-w-md">
						{viewError}
					</div>
					<Button
						size="sm"
						variant="outline"
						onClick={handleViewFile}
						disabled={viewFile.isPending}
					>
						Retry
					</Button>
				</div>
			</div>
		);
	}

	if (!fileData) {
		return (
			<div className="flex size-full items-center justify-center p-4">
				<AppEmptyState
					preset="inline"
					variant="muted"
					icon={FileIcon}
					title="No file preview available"
					className="border-transparent"
				/>
			</div>
		);
	}

	const { fileBytes, metadata } = fileData;
	const primaryDoc = fileData.documents[0];
	const mimeType = metadata.mimeType ?? primaryDoc?.mimeType;
	const fileName = metadata.name ?? primaryDoc?.name;
	const isPdfPreview =
		Boolean(previewPdfBytes) ||
		mimeType === "application/pdf" ||
		primaryDoc?.mimeType === "application/pdf" ||
		fileName?.toLowerCase().endsWith(".pdf");

	const placementFields = useMemo(() => {
		const manifest = fileInfo?.placementManifest ?? fileData.placementManifest;
		if (!manifest) return [];
		const parsed = zPlacementManifest.safeParse(manifest);
		return parsed.success ? parsed.data.fields : [];
	}, [fileInfo?.placementManifest, fileData.placementManifest]);

	const fieldCompletions = fileInfo?.fieldCompletions ?? [];

	const scaledFrameStyle = {
		width: documentDimensions.width,
		height: documentDimensions.height,
		transform: `scale(${zoom / 100})`,
		transformOrigin: "center" as const,
	};

	if (
		mimeType?.startsWith("image/") ||
		fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)
	) {
		const arrayBuffer = new ArrayBuffer(fileBytes.length);
		new Uint8Array(arrayBuffer).set(fileBytes);
		const blob = new Blob([arrayBuffer], { type: mimeType });
		const imageUrl = URL.createObjectURL(blob);

		return (
			<div className="flex items-center justify-center w-full h-full p-4 md:p-8 bg-muted/5">
				<div
					className="relative bg-white border shadow-lg border-border"
					style={scaledFrameStyle}
				>
					<img
						src={imageUrl}
						alt={fileName || "Document"}
						className="absolute inset-0 w-full h-full object-contain"
						onLoad={() => URL.revokeObjectURL(imageUrl)}
					/>
					<FileViewerFieldOverlay
						pageIndex={0}
						fields={placementFields}
						completions={fieldCompletions}
					/>
				</div>
			</div>
		);
	}

	if (isPdfPreview) {
		if (!previewPdfBytes) {
			return (
				<div className="flex items-center justify-center w-full h-full p-4 text-sm text-muted-foreground">
					Loading PDF…
				</div>
			);
		}

		return (
			<div className="flex items-center justify-center w-full h-full p-4 md:p-8 bg-muted/5">
				<div
					className="relative bg-white border shadow-lg border-border"
					style={scaledFrameStyle}
				>
					<LazyBoundary
						fallback={
							<div className="absolute inset-0 flex items-center justify-center bg-white">
								<InlineLoader size="md" />
							</div>
						}
					>
						<LazyPdfJsPreview
							className="absolute inset-0 overflow-auto"
							documentKey={file?.pieceCid ?? "file-viewer"}
							file={previewPdfBytes}
							maxHeight={documentDimensions.height}
							pageNumber={1}
							width={documentDimensions.width}
						/>
					</LazyBoundary>
					<FileViewerFieldOverlay
						pageIndex={0}
						fields={placementFields}
						completions={fieldCompletions}
					/>
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
		} catch {
			return (
				<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
					<div className="flex flex-col items-center gap-3 md:gap-4">
						<FileIcon className="size-12 md:size-16 text-muted-foreground/50" />
						<div className="text-xs md:text-sm">Cannot display text file</div>
					</div>
				</div>
			);
		}
	}

	return (
		<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
			<div className="flex flex-col items-center gap-3 md:gap-4">
				<FileIcon className="size-12 md:size-16 text-muted-foreground/50" />
				<div className="text-xs md:text-sm">
					Preview not available for this file type
				</div>
				<div className="text-xs text-muted-foreground/70">
					{mimeType || fileName}
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={() => void handleDownloadOriginalFiles()}
					className="mt-2"
				>
					<DownloadIcon className="size-4 mr-2" />
					Download files
				</Button>
			</div>
		</div>
	);
}
