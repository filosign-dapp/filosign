import { ArrowSquareOutIcon, PackageIcon } from "@phosphor-icons/react";
import { useId } from "react";
import { ShareViaButtons } from "@/src/lib/components/app/share-via-buttons";
import { Button } from "@/src/lib/components/ui/button";
import { Dialog } from "@/src/lib/components/ui/dialog";
import {
	FeatureDialogActions,
	FeatureDialogBody,
	FeatureDialogContent,
	FeatureDialogHeader,
	FeatureDialogMedia,
	FeatureDialogPanel,
} from "@/src/lib/components/ui/feature-dialog";
import { DocsLink } from "@/src/lib/docs/docs-link";
import { DOCS_LINKS } from "@/src/lib/docs/links";
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";
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
	const titleId = useId();
	const { pieceCid } = useSignDocumentContext();
	const { fileData } = useSignViewer();
	const {
		pdfExportBusy,
		exportsAllowed,
		proofExportPreferred,
		handleDownloadCompletionPacket,
	} = useSignCompliance();
	const canDownloadProofFromDialog = exportsAllowed && proofExportPreferred;
	const shareLinks = canDownloadProofFromDialog
		? buildProofPacketShareLinks(pieceCid)
		: null;

	const description = !exportsAllowed
		? "Your signature was recorded. Proof exports unlock when every required party has signed."
		: canDownloadProofFromDialog
			? "Your workflow is complete. Download the proof packet for your records."
			: "Your workflow is complete. Attached payouts or files are still processing.";

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (next) {
					onOpenChange(true);
				}
			}}
		>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia
					src={FEATURE_DIALOG_IMAGES.signSuccessProofPacketDialog}
					badge="Signed"
				/>

				<FeatureDialogPanel>
					<FeatureDialogHeader
						title="Document signed"
						titleId={titleId}
						description={description}
					/>

					<FeatureDialogBody>
						{canDownloadProofFromDialog ? (
							<>
								<Button
									type="button"
									variant="primary"
									className="h-auto w-full shrink justify-start gap-3 whitespace-normal py-3"
									onClick={() => void handleDownloadCompletionPacket()}
									disabled={!fileData || pdfExportBusy}
									isLoading={pdfExportBusy}
								>
									<PackageIcon className="size-5 shrink-0" />
									<span className="min-w-0 text-left">
										<span className="block font-medium">
											Download proof packet
										</span>
										<span className="block text-xs font-normal opacity-90">
											ZIP archive with the signed envelope and proofs.
										</span>
									</span>
								</Button>
								{shareLinks ? (
									<div className="flex items-center gap-2">
										<p className="mr-1 text-xs text-muted-foreground">
											Share via
										</p>
										<ShareViaButtons links={shareLinks} />
									</div>
								) : null}
								<div className="flex flex-col gap-2">
									<DocsLink href={DOCS_LINKS.completionPacket()}>
										What is in the proof packet?
									</DocsLink>
									<a
										href={DOCS_LINKS.verifyProofPacket()}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
									>
										Verify a proof packet independently
										<ArrowSquareOutIcon className="size-3.5" />
									</a>
								</div>
							</>
						) : exportsAllowed ? (
							<DocsLink href={DOCS_LINKS.completionPacket()}>
								What is in the proof packet?
							</DocsLink>
						) : null}

						<FeatureDialogActions>
							<Button
								type="button"
								variant="primary"
								size="lg"
								className="w-full"
								onClick={() => onOpenChange(false)}
							>
								Close
							</Button>
						</FeatureDialogActions>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}
