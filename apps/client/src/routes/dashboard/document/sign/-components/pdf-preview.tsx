import { lazy, type ReactNode, Suspense } from "react";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";

const LazyPdfJsPreview = lazy(
	() => import("@/src/lib/domains/files/pdf/pdf-js-preview.lazy"),
);

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
		<Suspense
			fallback={
				<div className="flex min-h-[240px] items-center justify-center bg-white">
					<InlineLoader size="md" />
				</div>
			}
		>
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
		</Suspense>
	);
}
