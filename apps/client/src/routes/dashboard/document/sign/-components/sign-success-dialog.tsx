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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						Document signed
					</DialogTitle>
					<DialogDescription>
						{exportsAllowed
							? "Your envelope is fully executed. Download the completion packet below."
							: "Your signature was recorded. Compliance exports unlock when every required party has signed."}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-2 py-2">
					{exportsAllowed ? (
						<Button
							type="button"
							variant="outline"
							className="justify-start gap-3 h-auto py-3"
							onClick={() => void handleDownloadCompletionPacket()}
							disabled={pdfExportBusy}
						>
							<DownloadIcon className="size-5 shrink-0" />
							<span className="text-left">
								<span className="block font-medium">
									Completion packet (ZIP)
								</span>
								<span className="block text-xs text-muted-foreground font-normal">
									Original file(s), compliance report, merged PDF, README
								</span>
							</span>
						</Button>
					) : null}
					<Button
						type="button"
						variant="outline"
						className="justify-start gap-3 h-auto py-3"
						onClick={() => void handleDownloadCompliancePdf()}
						disabled={!exportsAllowed || pdfExportBusy}
					>
						<ScrollIcon className="size-5 shrink-0" />
						<span className="text-left">
							<span className="block font-medium">Compliance report only</span>
							<span className="block text-xs text-muted-foreground font-normal">
								On-chain record and audit metadata
							</span>
						</span>
					</Button>
					<Button
						type="button"
						variant="outline"
						className="justify-start gap-3 h-auto py-3"
						onClick={() => void handleDownloadDocumentWithCompliancePdf()}
						disabled={!fileData || !exportsAllowed || pdfExportBusy}
					>
						<DownloadIcon className="size-5 shrink-0" />
						<span className="text-left">
							<span className="block font-medium">
								Document with compliance
							</span>
							<span className="block text-xs text-muted-foreground font-normal">
								Original file plus proof section
							</span>
						</span>
					</Button>
				</div>
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
