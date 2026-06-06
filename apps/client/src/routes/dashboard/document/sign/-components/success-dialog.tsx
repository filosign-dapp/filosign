import { DownloadIcon, ScrollIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import {
	useSignCompliance,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

export function SignSuccessDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { fileData } = useSignViewer();
	const {
		pdfExportBusy,
		exportsAllowed,
		handleDownloadCompletionPacket,
		handleDownloadCompliancePdf,
		handleDownloadDocumentWithCompliancePdf,
	} = useSignCompliance();

	const downloadButtonClass =
		"h-auto w-full shrink whitespace-normal justify-start gap-3 py-3";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						Document signed
					</DialogTitle>
					<DialogDescription>
						{exportsAllowed
							? "Your workflow is complete. Download the proof packet for your records."
							: "Your signature was recorded. Proof exports unlock when every required party has signed."}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2 py-2">
					{exportsAllowed ? (
						<Button
							type="button"
							variant="outline"
							className={downloadButtonClass}
							onClick={() => void handleDownloadCompletionPacket()}
							disabled={pdfExportBusy}
						>
							<DownloadIcon className="size-5 shrink-0" />
							<span className="min-w-0 text-left">
								<span className="block font-medium">Proof packet (ZIP)</span>
								<span className="block text-xs text-muted-foreground font-normal">
									Full archive with the document, proof report, README, and
									verification data
								</span>
							</span>
						</Button>
					) : null}
					<Button
						type="button"
						variant="outline"
						className={downloadButtonClass}
						onClick={() => void handleDownloadCompliancePdf()}
						disabled={!exportsAllowed || pdfExportBusy}
					>
						<ScrollIcon className="size-5 shrink-0" />
						<span className="min-w-0 text-left">
							<span className="block font-medium">Proof report only</span>
							<span className="block text-xs text-muted-foreground font-normal">
								Best for legal, finance, grant, or internal review
							</span>
						</span>
					</Button>
					<Button
						type="button"
						variant="outline"
						className={downloadButtonClass}
						onClick={() => void handleDownloadDocumentWithCompliancePdf()}
						disabled={!fileData || !exportsAllowed || pdfExportBusy}
					>
						<DownloadIcon className="size-5 shrink-0" />
						<span className="min-w-0 text-left">
							<span className="block font-medium">
								Document with proof appendix
							</span>
							<span className="block text-xs text-muted-foreground font-normal">
								Best when you want the signed document and proof in one PDF
							</span>
						</span>
					</Button>
				</div>
				{exportsAllowed ? (
					<DocsLink href={DOCS_LINKS.completionPacket()}>
						What is in the proof packet?
					</DocsLink>
				) : null}
				<DialogFooter>
					<Button
						type="button"
						variant="primary"
						onClick={() => onOpenChange(false)}
					>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
