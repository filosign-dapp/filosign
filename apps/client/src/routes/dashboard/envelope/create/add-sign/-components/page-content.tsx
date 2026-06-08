import type { ReactNode } from "react";
import { DocumentPageContent as SharedDocumentPageContent } from "@/src/lib/domains/files/document-viewport";
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
	stripScrollBridge?: import("@/src/lib/domains/files/pdf/pan-zoom-scroll-offset").PanZoomScrollBridge;
	loadingMessage?: string | null;
};

export function DocumentPageContent(props: DocumentPageContentProps) {
	return <SharedDocumentPageContent {...props} />;
}
