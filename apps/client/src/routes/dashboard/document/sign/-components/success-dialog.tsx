import { ArrowSquareOutIcon, PackageIcon } from "@phosphor-icons/react";
import { ShareViaButtons } from "@/src/lib/components/app/share-via-buttons";
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
import { buildProofPacketShareLinks } from "@/src/lib/domains/files/compliance-pdf/proof-share-links";
import {
	useSignCompliance,
	useSignDocumentContext,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

export function SignSuccessDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { pieceCid } = useSignDocumentContext();
	const { fileData } = useSignViewer();
	const { pdfExportBusy, exportsAllowed, handleDownloadCompletionPacket } =
		useSignCompliance();
	const shareLinks = exportsAllowed
		? buildProofPacketShareLinks(pieceCid)
		: null;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (next) {
					onOpenChange(true);
				}
			}}
		>
			<DialogContent className="sm:max-w-md" showCloseButton={false}>
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
				{exportsAllowed ? (
					<div className="py-2">
						<Button
							type="button"
							variant="primary"
							className="h-auto w-full shrink whitespace-normal justify-start gap-3 py-3"
							onClick={() => void handleDownloadCompletionPacket()}
							disabled={!fileData || pdfExportBusy}
							isLoading={pdfExportBusy}
						>
							<PackageIcon className="size-5 shrink-0" />
							<span className="min-w-0 text-left">
								<span className="block font-medium">Download proof packet</span>
								<span className="block text-xs font-normal opacity-90">
									ZIP archive with the signed envelope and proofs.
								</span>
							</span>
						</Button>
						<div className="mt-4 space-y-3">
							{shareLinks ? (
								<div className="flex items-center gap-2">
									<p className="mr-1 text-xs text-muted-foreground">
										Share via
									</p>
									<ShareViaButtons links={shareLinks} />
								</div>
							) : null}
						</div>
						<div className="mt-4 flex flex-col gap-2">
							<DocsLink href={DOCS_LINKS.completionPacket()}>
								What is in the proof packet?
							</DocsLink>
							<a
								href={DOCS_LINKS.verifyProofPacket()}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary underline-offset-4 hover:underline text-xs flex gap-1 items-center"
							>
								Verify a proof packet independently
								<ArrowSquareOutIcon className="size-3.5" />
							</a>
						</div>
					</div>
				) : null}
				<DialogFooter>
					<Button
						type="button"
						variant="primary"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
