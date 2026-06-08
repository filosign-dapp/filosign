import {
	ArrowClockwiseIcon,
	ArrowCounterClockwiseIcon,
	ArrowLeftIcon,
	CaretLeftIcon,
	CaretRightIcon,
	PencilSimpleIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { DisabledTooltip } from "@/src/lib/components/ui/disabled-tooltip";
import { Input } from "@/src/lib/components/ui/input";

type DocumentViewerToolbarProps = {
	isPdfDocument: boolean;
	pdfPageNumber: number;
	pdfNumPages: number | null;
	onPreviousPage: () => void;
	onNextPage: () => void;
	onPageJump: (page: number) => void;
	onBack: () => void;
	onEditForm: () => void;
	onUndo: () => void;
	onRedo: () => void;
	canUndo: boolean;
	canRedo: boolean;
};

export function DocumentViewerToolbar({
	isPdfDocument,
	pdfPageNumber,
	pdfNumPages,
	onPreviousPage,
	onNextPage,
	onPageJump,
	onBack,
	onEditForm,
	onUndo,
	onRedo,
	canUndo,
	canRedo,
}: DocumentViewerToolbarProps) {
	const [pageInput, setPageInput] = useState(String(pdfPageNumber));

	useEffect(() => {
		setPageInput(String(pdfPageNumber));
	}, [pdfPageNumber]);

	const commitPageInput = () => {
		const n = Number.parseInt(pageInput, 10);
		if (Number.isFinite(n)) onPageJump(n);
		else setPageInput(String(pdfPageNumber));
	};

	return (
		<div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 border-b border-border bg-background px-3 py-3 md:px-4 md:py-4 z-20 w-full">
			<Button
				variant="ghost"
				size="sm"
				onClick={onBack}
				className="text-muted-foreground hover:bg-accent/50 hover:text-foreground"
				title="Back to compose"
			>
				<ArrowLeftIcon className="size-5" />
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onClick={onEditForm}
				className="text-muted-foreground hover:bg-accent/50 hover:text-foreground"
				title="Edit form"
			>
				<PencilSimpleIcon className="size-5" />
			</Button>
			<div className="mx-0.5 hidden h-6 w-px bg-border sm:block" />
			<DisabledTooltip disabled={!canUndo} reason="Nothing to undo">
				<Button
					variant="ghost"
					size="sm"
					onClick={onUndo}
					disabled={!canUndo}
					className="text-muted-foreground hover:bg-accent/50 hover:text-foreground"
					title={canUndo ? "Undo" : undefined}
				>
					<ArrowCounterClockwiseIcon className="size-5" />
				</Button>
			</DisabledTooltip>
			<DisabledTooltip disabled={!canRedo} reason="Nothing to redo">
				<Button
					variant="ghost"
					size="sm"
					onClick={onRedo}
					disabled={!canRedo}
					className="text-muted-foreground hover:bg-accent/50 hover:text-foreground"
					title={canRedo ? "Redo" : undefined}
				>
					<ArrowClockwiseIcon className="size-5" />
				</Button>
			</DisabledTooltip>
			{isPdfDocument ? (
				<>
					<div className="mx-0.5 hidden h-6 w-px bg-border sm:block" />
					<DisabledTooltip
						disabled={pdfPageNumber <= 1}
						reason="Already on first page"
					>
						<Button
							variant="ghost"
							size="sm"
							type="button"
							onClick={onPreviousPage}
							disabled={pdfPageNumber <= 1}
							className="text-muted-foreground hover:bg-accent/50 hover:text-foreground"
							title={pdfPageNumber > 1 ? "Previous page" : undefined}
						>
							<CaretLeftIcon className="size-5" />
						</Button>
					</DisabledTooltip>
					<div className="flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
						<Input
							className="h-8 w-12 px-1 text-center tabular-nums"
							value={pageInput}
							onChange={(e) => setPageInput(e.target.value)}
							onBlur={commitPageInput}
							onKeyDown={(e) => {
								if (e.key === "Enter") commitPageInput();
							}}
							aria-label="Page"
							placeholder="Page"
						/>
						<span className="tabular-nums">
							/ {pdfNumPages == null ? "…" : pdfNumPages}
						</span>
					</div>
					<DisabledTooltip
						disabled={pdfNumPages != null && pdfPageNumber >= pdfNumPages}
						reason="Already on last page"
					>
						<Button
							variant="ghost"
							size="sm"
							type="button"
							onClick={onNextPage}
							disabled={pdfNumPages != null && pdfPageNumber >= pdfNumPages}
							className="text-muted-foreground hover:bg-accent/50 hover:text-foreground"
							title={
								pdfNumPages == null || pdfPageNumber < pdfNumPages
									? "Next page"
									: undefined
							}
						>
							<CaretRightIcon className="size-5" />
						</Button>
					</DisabledTooltip>
				</>
			) : null}
		</div>
	);
}
