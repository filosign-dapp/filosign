import {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	CaretLeftIcon,
	CaretRightIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";

type DocumentViewerToolbarProps = {
	isPdfDocument: boolean;
	pdfPageNumber: number;
	pdfNumPages: number | null;
	onPreviousPage: () => void;
	onNextPage: () => void;
	zoom: number;
	onZoomChange: (zoom: number) => void;
	onBack: () => void;
};

export function DocumentViewerToolbar({
	isPdfDocument,
	pdfPageNumber,
	pdfNumPages,
	onPreviousPage,
	onNextPage,
	zoom,
	onZoomChange,
	onBack,
}: DocumentViewerToolbarProps) {
	return (
		<div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 py-3 md:py-4 w-full border-b border-border bg-background px-3 md:px-4 z-20">
			<Button
				variant="ghost"
				size="sm"
				onClick={onBack}
				className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
				title="Back"
			>
				<ArrowCounterClockwiseIcon className="size-5" />
			</Button>
			{isPdfDocument ? (
				<>
					<Button
						variant="ghost"
						size="sm"
						type="button"
						onClick={onPreviousPage}
						disabled={pdfPageNumber <= 1}
						className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
						title="Previous page"
					>
						<CaretLeftIcon className="size-5" />
					</Button>
					<span className="min-w-11 text-center text-xs font-medium tabular-nums text-muted-foreground sm:text-sm">
						{pdfNumPages == null
							? `${pdfPageNumber} / …`
							: `${pdfPageNumber} / ${pdfNumPages}`}
					</span>
					<Button
						variant="ghost"
						size="sm"
						type="button"
						onClick={onNextPage}
						disabled={pdfNumPages != null && pdfPageNumber >= pdfNumPages}
						className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
						title="Next page"
					>
						<CaretRightIcon className="size-5" />
					</Button>
				</>
			) : null}
			<Button
				variant="ghost"
				size="sm"
				className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
				title="Redo (coming soon)"
				disabled
			>
				<ArrowClockwiseIcon className="size-5" />
			</Button>
			<div className="w-px h-6 bg-border mx-0.5 hidden sm:block" />
			<Button
				variant="ghost"
				size="sm"
				onClick={() => onZoomChange(Math.max(zoom - 25, 50))}
				className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
				title="Zoom out"
			>
				<MagnifyingGlassMinusIcon className="size-5" />
			</Button>
			<span className="text-sm font-medium min-w-12 text-center text-foreground tabular-nums">
				{zoom}%
			</span>
			<Button
				variant="ghost"
				size="sm"
				onClick={() => onZoomChange(Math.min(zoom + 25, 200))}
				className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
				title="Zoom in"
			>
				<MagnifyingGlassPlusIcon className="size-5" />
			</Button>
		</div>
	);
}
