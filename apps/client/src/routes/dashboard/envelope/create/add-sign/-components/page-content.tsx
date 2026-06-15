import type { ReactNode } from "react";
import { DocumentPageContent as SharedDocumentPageContent } from "@/src/lib/domains/files/document-viewport";
import type { PlacementDocument } from "@/src/lib/domains/placement/types";

type DocumentPageContentProps = {
	document: PlacementDocument;
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
