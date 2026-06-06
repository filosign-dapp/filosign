import type { PlacementField } from "@filosign/shared";
import { DownloadIcon, FileTextIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { SignDocumentPdfPreview } from "@/src/routes/dashboard/document/sign/-components/pdf-preview";

type PreviewLayoutProps = {
	viewportWidth: number;
	viewportHeight: number;
	zoom: number;
	children: ReactNode;
};

function PreviewLayout({
	viewportWidth,
	viewportHeight,
	zoom,
	children,
}: PreviewLayoutProps) {
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
				{children}
			</div>
		</div>
	);
}

export function SignDocumentImagePreview({
	mimeType,
	fileName,
	fileBytes,
	viewportWidth,
	viewportHeight,
	zoom,
	renderPageOverlay,
}: {
	mimeType: string | undefined;
	fileName: string | undefined;
	fileBytes: Uint8Array;
	viewportWidth: number;
	viewportHeight: number;
	zoom: number;
	renderPageOverlay: (pageIndex: number) => ReactNode;
}) {
	const arrayBuffer = new ArrayBuffer(fileBytes.length);
	new Uint8Array(arrayBuffer).set(fileBytes);
	const blob = new Blob([arrayBuffer], { type: mimeType });
	const imageUrl = URL.createObjectURL(blob);

	return (
		<PreviewLayout
			viewportWidth={viewportWidth}
			viewportHeight={viewportHeight}
			zoom={zoom}
		>
			<img
				src={imageUrl}
				alt={fileName || "Document"}
				className="absolute inset-0 w-full h-full object-contain"
				onLoad={() => URL.revokeObjectURL(imageUrl)}
			/>
			{renderPageOverlay(0)}
		</PreviewLayout>
	);
}

export function SignDocumentPdfPreviewView({
	pieceCid,
	previewPdfBytes,
	viewportWidth,
	viewportHeight,
	zoom,
	signPdfPage,
	setPdfLayoutHeight,
	setSignPdfNumPages,
	setSignPdfPage,
	renderPageOverlay,
}: {
	pieceCid: string | undefined;
	previewPdfBytes: Uint8Array;
	viewportWidth: number;
	viewportHeight: number;
	zoom: number;
	signPdfPage: number;
	setPdfLayoutHeight: (height: number) => void;
	setSignPdfNumPages: (n: number) => void;
	setSignPdfPage: (updater: (page: number) => number) => void;
	renderPageOverlay: (pageIndex: number) => ReactNode;
}) {
	return (
		<PreviewLayout
			viewportWidth={viewportWidth}
			viewportHeight={viewportHeight}
			zoom={zoom}
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
		</PreviewLayout>
	);
}

export function SignDocumentTextPreview({
	fileBytes,
}: {
	fileBytes: Uint8Array;
}) {
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

export function SignDocumentUnsupportedPreview({
	mimeType,
	fileName,
	handleDownload,
	canSign,
	myPlacementFields,
	alreadySigned,
	isMyPlacementFieldDone,
	togglePlacementField,
}: {
	mimeType: string | undefined;
	fileName: string | undefined;
	handleDownload: () => void;
	canSign: boolean;
	myPlacementFields: PlacementField[];
	alreadySigned: boolean;
	isMyPlacementFieldDone: (fieldId: string) => boolean;
	togglePlacementField: (field: PlacementField) => void | Promise<void>;
}) {
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
									onClick={() => void togglePlacementField(field)}
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

export function isImagePreview(
	mimeType: string | undefined,
	fileName: string | undefined,
): boolean {
	return (
		Boolean(mimeType?.startsWith("image/")) ||
		Boolean(fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp)$/))
	);
}

export function isTextPreview(
	mimeType: string | undefined,
	fileName: string | undefined,
): boolean {
	return (
		Boolean(mimeType?.startsWith("text/")) ||
		Boolean(
			fileName?.toLowerCase().match(/\.(txt|md|json|xml|html|css|js|ts)$/),
		)
	);
}

export function isPdfMimePreview(
	previewPdfBytes: Uint8Array | null,
	mimeType: string | undefined,
	primaryMimeType: string | undefined,
	fileName: string | undefined,
): boolean {
	return (
		Boolean(previewPdfBytes) ||
		mimeType === "application/pdf" ||
		primaryMimeType === "application/pdf" ||
		Boolean(fileName?.toLowerCase().endsWith(".pdf"))
	);
}
