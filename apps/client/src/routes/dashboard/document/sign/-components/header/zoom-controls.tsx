import {
	CaretLeftIcon,
	CaretRightIcon,
	MagnifyingGlassMinusIcon,
	MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { cn } from "@/src/lib/utils";
import { useSignViewer } from "@/src/routes/dashboard/document/sign/-lib/context/context";

type SignHeaderZoomControlsProps = {
	density: "compact" | "comfortable";
};

export function SignHeaderZoomControls({
	density,
}: SignHeaderZoomControlsProps) {
	const {
		zoom,
		handleZoomIn,
		handleZoomOut,
		isSigningPdf,
		signPdfPage,
		setSignPdfPage,
		signPdfTotalDisplay,
	} = useSignViewer();

	const compact = density === "compact";

	return (
		<div className={cn("flex items-center", compact ? "gap-1" : "gap-2")}>
			<Button
				variant="ghost"
				size="sm"
				onClick={handleZoomOut}
				className={cn(
					"text-muted-foreground hover:text-foreground hover:bg-accent/50 p-0",
					compact ? "size-8" : "h-8 w-8",
				)}
			>
				<MagnifyingGlassMinusIcon className={compact ? "size-4" : "size-5"} />
			</Button>
			<span
				className={cn(
					"font-medium text-center text-foreground tabular-nums",
					compact ? "text-xs min-w-10" : "text-sm min-w-12",
				)}
			>
				{zoom}%
			</span>
			<Button
				variant="ghost"
				size="sm"
				onClick={handleZoomIn}
				className={cn(
					"text-muted-foreground hover:text-foreground hover:bg-accent/50 p-0",
					compact ? "size-8" : "h-8 w-8",
				)}
			>
				<MagnifyingGlassPlusIcon className={compact ? "size-4" : "size-5"} />
			</Button>
			{isSigningPdf ? (
				<>
					<div
						className={cn(
							"bg-border",
							compact
								? "mx-0.5 h-5 w-px self-center bg-border/70"
								: "mx-1 h-6 w-px",
						)}
					/>
					<Button
						variant="ghost"
						size="sm"
						type="button"
						onClick={() =>
							setSignPdfPage((page: number) => Math.max(1, page - 1))
						}
						disabled={signPdfPage <= 1}
						className={cn(
							"text-muted-foreground hover:text-foreground hover:bg-accent/50 p-0",
							compact ? "size-8" : "h-8 w-8",
						)}
						title="Previous page"
					>
						<CaretLeftIcon className={compact ? "size-4" : "size-5"} />
					</Button>
					<span
						className={cn(
							"text-center font-medium tabular-nums text-muted-foreground",
							compact ? "min-w-10 text-[10px]" : "min-w-11 text-xs",
						)}
					>
						{signPdfTotalDisplay == null
							? `${signPdfPage} / …`
							: `${signPdfPage} / ${signPdfTotalDisplay}`}
					</span>
					<Button
						variant="ghost"
						size="sm"
						type="button"
						onClick={() =>
							setSignPdfPage((page: number) =>
								signPdfTotalDisplay == null
									? page + 1
									: Math.min(signPdfTotalDisplay, page + 1),
							)
						}
						disabled={
							signPdfTotalDisplay != null && signPdfPage >= signPdfTotalDisplay
						}
						className={cn(
							"text-muted-foreground hover:text-foreground hover:bg-accent/50 p-0",
							compact ? "size-8" : "h-8 w-8",
						)}
						title="Next page"
					>
						<CaretRightIcon className={compact ? "size-4" : "size-5"} />
					</Button>
				</>
			) : null}
		</div>
	);
}
