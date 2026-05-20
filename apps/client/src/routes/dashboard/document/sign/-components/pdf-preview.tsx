import type { ReactNode } from "react";
import {
	LazyBoundary,
	LazyPdfJsPreview,
} from "@/src/lib/components/app/suspense";

export function SignDocumentPdfPreview({
	documentKey,
	file,
	pageNumber,
	width = 600,
	maxHeight = 800,
	className,
	onNumPagesLoaded,
	onPageLayoutLoaded,
	renderPageOverlay,
}: {
	documentKey: string;
	file: Uint8Array;
	pageNumber: number;
	width?: number;
	maxHeight?: number;
	className?: string;
	onNumPagesLoaded?: (n: number) => void;
	onPageLayoutLoaded?: (layout: { width: number; height: number }) => void;
	renderPageOverlay?: (pageIndex: number) => ReactNode;
}) {
	return (
		<LazyBoundary>
			<LazyPdfJsPreview
				className={className ?? "absolute inset-0 z-0"}
				documentKey={documentKey}
				file={file}
				pageNumber={pageNumber}
				width={width}
				maxHeight={maxHeight}
				onNumPagesLoaded={onNumPagesLoaded}
				onPageLayoutLoaded={onPageLayoutLoaded}
				renderPageOverlay={renderPageOverlay}
			/>
		</LazyBoundary>
	);
}
