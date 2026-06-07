import {
	CaretDownIcon,
	DownloadSimpleIcon,
	FileArrowDownIcon,
	ScrollIcon,
} from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { ButtonGroup } from "@/src/lib/components/ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/src/lib/components/ui/dropdown-menu";
import { cn } from "@/src/lib/utils/index";

type ProofDownloadButtonGroupProps = {
	exportsAllowed: boolean;
	pdfExportBusy: boolean;
	fileDataReady: boolean;
	handleDownload: () => void;
	handleDownloadCompletionPacket: () => void | Promise<void>;
	handleDownloadCompliancePdf: () => void | Promise<void>;
	density?: "default" | "compact" | "toolbar";
	className?: string;
};

export function ProofDownloadButtonGroup({
	exportsAllowed,
	pdfExportBusy,
	fileDataReady,
	handleDownload,
	handleDownloadCompletionPacket,
	handleDownloadCompliancePdf,
	density = "default",
	className,
}: ProofDownloadButtonGroupProps) {
	const proofDisabled = !fileDataReady || !exportsAllowed || pdfExportBusy;

	if (!exportsAllowed) {
		return (
			<Button
				type="button"
				variant={density === "toolbar" ? "ghost" : "outline"}
				size={
					density === "compact"
						? "sm"
						: density === "toolbar"
							? "sm"
							: "default"
				}
				onClick={handleDownload}
				disabled={!fileDataReady}
				title="Download original file"
				className={cn(
					density === "toolbar" &&
						"shrink-0 p-0 h-10 w-10 @md:h-11 @md:w-11 text-muted-foreground hover:text-primary-foreground hover:bg-primary/10",
					className,
				)}
			>
				<FileArrowDownIcon
					className={density === "toolbar" ? "size-6 @md:size-7" : "size-4"}
				/>
				{density === "default" ? (
					<span className="ml-1.5">Download file</span>
				) : null}
			</Button>
		);
	}

	const mainButtonClass =
		density === "toolbar" ? "rounded-r-none px-3" : undefined;

	return (
		<ButtonGroup aria-label="Download proof" className={cn(className)}>
			<Button
				type="button"
				variant="outline"
				size={density === "compact" ? "sm" : "default"}
				onClick={() => void handleDownloadCompletionPacket()}
				disabled={proofDisabled}
				title="Download proof packet (ZIP)"
				className={mainButtonClass}
				isLoading={pdfExportBusy}
			>
				<DownloadSimpleIcon className="size-4" />
				{density !== "toolbar" ? (
					<span>{density === "compact" ? "Proof" : "Download proof"}</span>
				) : (
					<span className="hidden @lg:inline">Download proof</span>
				)}
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="outline"
							size={density === "compact" ? "icon-sm" : "icon"}
							aria-label="More download options"
							disabled={proofDisabled}
							className={
								density === "toolbar" ? "rounded-l-none" : undefined
							}
						/>
					}
				>
					<CaretDownIcon className="size-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-52">
					<DropdownMenuGroup>
						<DropdownMenuItem
							disabled={!fileDataReady}
							onClick={handleDownload}
						>
							<FileArrowDownIcon />
							Original document
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={proofDisabled}
							onClick={() => void handleDownloadCompliancePdf()}
						>
							<ScrollIcon />
							Proof report only
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</ButtonGroup>
	);
}
