import {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	DownloadIcon,
	MagnifyingGlassIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
	ScrollIcon,
	StackIcon,
	XIcon,
} from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { useFileViewer } from "@/src/lib/domains/files/file-viewer/-lib/context/context";

const toolbarIconClass = "size-6 @md:size-7";
const toolbarBtnClass =
	"shrink-0 p-0 h-10 w-10 @md:h-11 @md:w-11 text-muted-foreground hover:text-primary-foreground hover:bg-primary/10";

export function FileViewerToolbar({ onClose }: { onClose: () => void }) {
	const {
		file,
		fileInfo,
		fileData,
		zoom,
		handleZoomIn,
		handleZoomOut,
		pdfExportBusy,
		handleDownload,
		handleDownloadCompliancePdf,
		handleDownloadDocumentWithCompliancePdf,
	} = useFileViewer();

	return (
		<div className="absolute top-0 left-0 right-0 z-50 shrink-0 border-b border-border bg-transparent px-4 py-3 @md:px-6 @md:py-4 glass">
			<div className="flex flex-col gap-3 @md:gap-3">
				<div className="flex min-w-0 items-center justify-between gap-3">
					<h2 className="truncate pr-2 text-base font-semibold text-primary-foreground @md:text-lg">
						{fileData?.metadata.name ||
							`Document - ${file?.pieceCid.slice(0, 8)}...`}
					</h2>
					<Button
						variant="ghost"
						size="sm"
						onClick={onClose}
						aria-label="Close"
						className={`@md:hidden ${toolbarBtnClass}`}
					>
						<XIcon className={toolbarIconClass} />
					</Button>
				</div>

				<div className="relative flex min-h-12 w-full items-center">
					<div className="relative z-10 flex min-w-0 flex-1 items-center justify-start gap-1 @md:gap-2">
						<Button
							variant="ghost"
							size="sm"
							type="button"
							title="Search"
							className={toolbarBtnClass}
						>
							<MagnifyingGlassIcon className={toolbarIconClass} />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							type="button"
							title="Rotate counter-clockwise"
							className={toolbarBtnClass}
						>
							<ArrowCounterClockwiseIcon className={toolbarIconClass} />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							type="button"
							title="Rotate clockwise"
							className={toolbarBtnClass}
						>
							<ArrowClockwiseIcon className={toolbarIconClass} />
						</Button>
					</div>

					<div className="pointer-events-none absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2">
						<div className="pointer-events-auto flex items-center gap-1 @md:gap-2">
							<Button
								variant="ghost"
								size="sm"
								type="button"
								onClick={handleZoomOut}
								title="Zoom out"
								className={toolbarBtnClass}
							>
								<MagnifyingGlassMinusIcon className={toolbarIconClass} />
							</Button>
							<span className="min-w-11 text-center text-sm font-medium tabular-nums text-primary-foreground @md:min-w-13 @md:text-base">
								{zoom}%
							</span>
							<Button
								variant="ghost"
								size="sm"
								type="button"
								onClick={handleZoomIn}
								title="Zoom in"
								className={toolbarBtnClass}
							>
								<MagnifyingGlassPlusIcon className={toolbarIconClass} />
							</Button>
						</div>
					</div>

					<div className="relative z-10 flex min-w-0 flex-1 items-center justify-end gap-1 @md:gap-2">
						<Button
							variant="ghost"
							size="sm"
							type="button"
							onClick={handleDownload}
							disabled={!fileData}
							title="Download file"
							className={toolbarBtnClass}
						>
							<DownloadIcon className={toolbarIconClass} />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							type="button"
							onClick={handleDownloadCompliancePdf}
							disabled={!fileInfo || pdfExportBusy}
							title="Download compliance report (PDF)"
							className={toolbarBtnClass}
						>
							<ScrollIcon className={toolbarIconClass} />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							type="button"
							onClick={handleDownloadDocumentWithCompliancePdf}
							disabled={!fileData || !fileInfo || pdfExportBusy}
							title="Download document + compliance appendix (PDF)"
							className={toolbarBtnClass}
						>
							<StackIcon className={toolbarIconClass} />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							type="button"
							onClick={onClose}
							aria-label="Close"
							className={`hidden @md:flex ${toolbarBtnClass}`}
						>
							<XIcon className={toolbarIconClass} />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
