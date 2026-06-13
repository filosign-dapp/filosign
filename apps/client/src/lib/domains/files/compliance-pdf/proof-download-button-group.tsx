import {
	CaretDownIcon,
	CertificateIcon,
	FileArrowDownIcon,
	PackageIcon,
	SealCheckIcon,
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
import type { ProofDownloadExports } from "./compliance-pdf";

type ProofDownloadButtonGroupProps = {
	exports: ProofDownloadExports;
	fileDataReady: boolean;
	/** When set, the main proof button opens this flow instead of downloading immediately. */
	onMainProofClick?: () => void;
	density?: "default" | "compact" | "toolbar" | "header";
	className?: string;
};

export function ProofDownloadButtonGroup({
	exports,
	fileDataReady,
	onMainProofClick,
	density = "default",
	className,
}: ProofDownloadButtonGroupProps) {
	const {
		exportsAllowed,
		pdfExportBusy,
		handleDownloadOriginalFiles,
		handleDownloadSignedEnvelope,
		handleDownloadCompletionPacket,
		handleDownloadCompliancePdf,
	} = exports;
	const proofDisabled = !fileDataReady || !exportsAllowed || pdfExportBusy;

	if (!exportsAllowed) {
		return (
			<Button
				type="button"
				variant={
					density === "toolbar"
						? "ghost"
						: density === "header"
							? "outline"
							: "outline"
				}
				size={
					density === "compact"
						? "sm"
						: density === "toolbar"
							? "sm"
							: density === "header"
								? "lg"
								: "default"
				}
				onClick={() => void handleDownloadOriginalFiles()}
				disabled={!fileDataReady || pdfExportBusy}
				title="Download original files"
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
					<span className="ml-1.5">Download files</span>
				) : null}
			</Button>
		);
	}

	const mainButtonClass =
		density === "toolbar"
			? "rounded-r-none px-3"
			: density === "header"
				? "gap-1.5"
				: undefined;

	return (
		<ButtonGroup aria-label="Download proof" className={cn(className)}>
			<Button
				type="button"
				variant="outline"
				size={
					density === "compact" ? "sm" : density === "header" ? "lg" : "default"
				}
				onClick={() =>
					onMainProofClick
						? onMainProofClick()
						: void handleDownloadCompletionPacket()
				}
				disabled={proofDisabled}
				title="Download proof packet (ZIP)"
				className={mainButtonClass}
				isLoading={pdfExportBusy}
			>
				<PackageIcon className="size-4" />
				{density === "toolbar" ? (
					<span className="hidden @lg:inline">Download proof</span>
				) : density === "header" ? (
					<span className="hidden sm:inline">Download proof</span>
				) : (
					<span>{density === "compact" ? "Proof" : "Download proof"}</span>
				)}
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							type="button"
							variant="outline"
							size={
								density === "compact"
									? "icon-sm"
									: density === "header"
										? "icon-lg"
										: "icon"
							}
							aria-label="More download options"
							disabled={proofDisabled}
							className={density === "toolbar" ? "rounded-l-none" : undefined}
						/>
					}
				>
					<CaretDownIcon className="size-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-64">
					<DropdownMenuGroup>
						<DropdownMenuItem
							disabled={!fileDataReady || pdfExportBusy}
							onClick={() => void handleDownloadOriginalFiles()}
						>
							<FileArrowDownIcon />
							Download original files
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={proofDisabled}
							onClick={() => void handleDownloadSignedEnvelope()}
						>
							<SealCheckIcon />
							Download signed envelope
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={proofDisabled}
							onClick={() => void handleDownloadCompliancePdf()}
						>
							<CertificateIcon />
							Download completion certificate
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</ButtonGroup>
	);
}
