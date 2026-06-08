import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import {
	observePanZoomScrollOffset,
	type PanZoomScrollBridge,
} from "@/src/lib/domains/files/pdf/pan-zoom-scroll-offset";
import { PLACEMENT_PAGE_STRIP_GAP_PX } from "@/src/lib/domains/files/placement-viewport";

export type PdfStripVirtualProps = {
	numPages: number;
	pageWidth: number;
	scrollBridge: PanZoomScrollBridge;
	renderPage: (pageNumber: number) => ReactNode;
};

/**
 * Horizontally virtualized page strip for placement. Syncs visible range to
 * pan/zoom offset via {@link PanZoomScrollBridge} instead of native scroll.
 */
export function PdfStripVirtual({
	numPages,
	pageWidth,
	scrollBridge,
	renderPage,
}: PdfStripVirtualProps) {
	const laneSize = pageWidth + PLACEMENT_PAGE_STRIP_GAP_PX;

	const virtualizer = useVirtualizer({
		count: numPages,
		horizontal: true,
		overscan: 2,
		getScrollElement: () => scrollBridge.getScrollElement(),
		estimateSize: () => laneSize,
		observeElementOffset: observePanZoomScrollOffset(scrollBridge),
	});

	const virtualItems = virtualizer.getVirtualItems();

	return (
		<div className="relative" style={{ width: virtualizer.getTotalSize() }}>
			{virtualItems.map((virtualItem) => {
				const pageNumber = virtualItem.index + 1;
				return (
					<div
						key={virtualItem.key}
						data-index={virtualItem.index}
						ref={virtualizer.measureElement}
						className="absolute top-0 left-0"
						style={{
							width: laneSize,
							transform: `translateX(${virtualItem.start}px)`,
						}}
					>
						{renderPage(pageNumber)}
					</div>
				);
			})}
		</div>
	);
}
