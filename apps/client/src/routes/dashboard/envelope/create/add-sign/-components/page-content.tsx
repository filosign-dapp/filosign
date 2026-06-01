import type * as React from "react";
import { Image } from "@/src/lib/components/app/media/image";
import { PdfJsPreview } from "@/src/lib/domains/files/pdf/pdf-js-preview";
import { PlacementCaptureLayer } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-layer";
import type {
	Document,
	SignatureField,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";
import { isPdfDocument } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/utils/document-kind";

type DocumentPageContentProps = {
	document: Document;
	documentWidth: number;
	documentHeight: number;
	pdfPageNumber: number;
	isPlacingField: boolean;
	pendingFieldType: SignatureField["type"] | null;
	onDocumentClick: (event: React.MouseEvent) => void;
	onPdfNumPagesLoaded: (n: number) => void;
	onPdfPageLayoutLoaded?: (layout: { width: number; height: number }) => void;
	loadingMessage?: string | null;
};

export function DocumentPageContent({
	document,
	documentWidth,
	documentHeight,
	pdfPageNumber,
	isPlacingField,
	pendingFieldType,
	onDocumentClick,
	onPdfNumPagesLoaded,
	onPdfPageLayoutLoaded,
	loadingMessage,
}: DocumentPageContentProps) {
	const pdfFile =
		document.pdfBytes ??
		(document.url.startsWith("data:application/pdf")
			? document.url
			: undefined);

	if (
		isPdfDocument({
			type: document.mimeType,
			name: document.name,
			pdfBytes: document.pdfBytes,
		})
	) {
		if (!pdfFile) {
			return (
				<div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
					{loadingMessage ?? "Loading document…"}
				</div>
			);
		}
		return (
			<>
				<PdfJsPreview
					file={pdfFile}
					documentKey={document.id}
					pageNumber={pdfPageNumber}
					width={documentWidth}
					maxHeight={documentHeight}
					className="absolute inset-0 z-10"
					onNumPagesLoaded={onPdfNumPagesLoaded}
					onPageLayoutLoaded={onPdfPageLayoutLoaded}
				/>
				<PlacementCaptureLayer
					isPlacingField={isPlacingField}
					pendingFieldType={pendingFieldType}
					onDocumentClick={onDocumentClick}
				/>
			</>
		);
	}

	if (!document.url) {
		return (
			<div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
				No document preview available
			</div>
		);
	}

	return (
		<>
			<Image
				src={document.url}
				alt={document.name}
				className="absolute inset-0 w-full h-full object-contain bg-white z-10"
			/>
			<PlacementCaptureLayer
				isPlacingField={isPlacingField}
				pendingFieldType={pendingFieldType}
				onDocumentClick={onDocumentClick}
			/>
		</>
	);
}
