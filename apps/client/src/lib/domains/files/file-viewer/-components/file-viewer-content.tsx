import { DownloadIcon, FileIcon } from "@phosphor-icons/react";
import { lazy, Suspense } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import { useFileViewer } from "@/src/lib/domains/files/file-viewer/-lib/context/context";

const LazyPdfJsPreview = lazy(
	() => import("@/src/lib/domains/files/pdf/pdf-js-preview.lazy"),
);

export function FileViewerContent() {
	const {
		file,
		viewError,
		fileData,
		viewFile,
		handleViewFile,
		previewPdfBytes,
		zoom,
		documentDimensions,
		handleDownload,
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
			<div className="flex items-center justify-center w-full h-full text-sm text-muted-foreground p-4 text-center">
				<div className="flex flex-col items-center gap-3 md:gap-4">
					<FileIcon className="size-12 md:size-16 text-muted-foreground/50" />
					<div className="text-xs md:text-sm">No file preview available</div>
				</div>
			</div>
		);
	}

	const { fileBytes, metadata } = fileData;
	const mimeType = metadata.mimeType;
	const fileName = metadata.name;

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
			<div className="flex items-center justify-center w-full h-full p-4 md:p-8 bg-muted/5">
				<div
					className="relative bg-white border shadow-lg border-border"
					style={scaledFrameStyle}
				>
					<Suspense
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
					</Suspense>
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
					onClick={handleDownload}
					className="mt-2"
				>
					<DownloadIcon className="size-4 mr-2" />
					Download File
				</Button>
			</div>
		</div>
	);
}
