import type { ReactNode } from "react";
import type { PanZoomScrollBridge } from "@/src/lib/domains/files/pdf/pan-zoom-scroll-offset";
import { PdfJsPreview } from "@/src/lib/domains/files/pdf/pdf-js-preview";
import { cn } from "@/src/lib/utils/utils";
import type { Document } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/types";

type DocumentPageContentProps = {
	document: Document;
	documentWidth: number;
	documentHeight: number;
	layout: "single" | "strip";
	isPlacingField?: boolean;
	isPdfDocument: boolean;
	onPdfNumPagesLoaded: (n: number) => void;
	onPdfPageLayoutLoaded?: (
		layout: { width: number; height: number },
		pageNumber?: number,
	) => void;
	setPageRef?: (pageNumber: number, el: HTMLDivElement | null) => void;
	renderPageOverlay?: (pageIndex: number) => ReactNode;
	stripScrollBridge?: PanZoomScrollBridge;
	loadingMessage?: string | null;
};

export function DocumentPageContent({
	document,
	documentWidth,
	documentHeight,
	layout,
	isPlacingField = false,
	isPdfDocument,
	onPdfNumPagesLoaded,
	onPdfPageLayoutLoaded,
	setPageRef,
	renderPageOverlay,
	stripScrollBridge,
	loadingMessage,
}: DocumentPageContentProps) {
	const pdfFile =
		document.pdfBytes ??
		(document.url.startsWith("data:application/pdf")
			? document.url
			: undefined);

	if (!pdfFile) {
		return (
			<div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
				{loadingMessage ?? "Loading document…"}
			</div>
		);
	}

	return (
		<PdfJsPreview
			file={pdfFile}
			documentKey={document.id}
			layout={isPdfDocument ? layout : "single"}
			width={documentWidth}
			maxHeight={documentHeight}
			className={cn(
				layout === "strip"
					? "relative z-10 bg-transparent"
					: "absolute inset-0 z-10",
				isPlacingField && "pointer-events-none",
			)}
			stripScrollBridge={layout === "strip" ? stripScrollBridge : undefined}
			setPageRef={setPageRef}
			renderPageOverlay={renderPageOverlay}
			onNumPagesLoaded={onPdfNumPagesLoaded}
			onPageLayoutLoaded={onPdfPageLayoutLoaded}
		/>
	);
}
