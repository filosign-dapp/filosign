import type * as React from "react";
import { Image } from "@/src/lib/components/app/media/image";
import { PdfJsPreview } from "@/src/lib/domains/files/pdf/pdf-js-preview";
import { PlacementCaptureLayer } from "@/src/routes/dashboard/envelope/create/add-sign/-components/placement-layer";
import type {
	Document,
	SignatureField,
} from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";

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
}: DocumentPageContentProps) {
	if (!document.url) {
		return (
			<div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground px-6 text-center">
				No document preview available
			</div>
		);
	}

	if (
		document.url.startsWith("data:application/pdf") ||
		document.name?.toLowerCase().endsWith(".pdf")
	) {
		return (
			<>
				<PdfJsPreview
					file={document.url}
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
