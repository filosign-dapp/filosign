import { ArrowLeftIcon } from "@phosphor-icons/react";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { Button } from "@/src/lib/components/ui/button";
import { Skeleton } from "@/src/lib/components/ui/skeleton";
import { ProofDownloadButtonGroup } from "@/src/lib/domains/files/compliance-pdf";
import { SignPageEnvelopeCommentsBlock } from "@/src/lib/domains/files/envelope-comments-block";
import { SignHeaderRotateInviteButton } from "@/src/routes/dashboard/document/sign/-components/header/rotate-invite-button";
import { SignHeaderSettlementStrip } from "@/src/routes/dashboard/document/sign/-components/header/settlement-strip";
import { SignHeaderSignButton } from "@/src/routes/dashboard/document/sign/-components/header/sign-button";
import { SignHeaderZoomControls } from "@/src/routes/dashboard/document/sign/-components/header/zoom-controls";
import {
	useSignCompliance,
	useSignFile,
	useSignMeta,
	useSignNavigation,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

export function SignHeaderDesktop() {
	const { navigate } = useSignNavigation();
	const { pieceCid, file } = useSignFile();
	const { formatAddress } = useSignMeta();
	const { fileData } = useSignViewer();
	const {
		pdfExportBusy,
		exportsAllowed,
		handleDownload,
		handleDownloadCompliancePdf,
		handleDownloadCompletionPacket,
	} = useSignCompliance();

	return (
		<div className="hidden md:flex items-center justify-between w-full px-6 py-3">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/dashboard" })}
					className="text-muted-foreground hover:text-foreground hover:bg-accent/50"
				>
					<ArrowLeftIcon className="size-4 mr-2" />
					Back
				</Button>
				<div className="flex gap-4">
					<div className="flex flex-col">
						<h2 className="text-sm flex items-center gap-1 font-semibold truncate text-foreground">
							<span className="truncate max-w-xs">{pieceCid}</span>
							<CopyButton text={pieceCid} />
						</h2>
						{file ? (
							<p className="text-xs text-muted-foreground flex items-center gap-1">
								From {formatAddress(file.sender)}
								<CopyButton text={formatAddress(file.sender)} />
							</p>
						) : (
							<Skeleton className="h-3 w-36" />
						)}
					</div>
					<SignHeaderSettlementStrip layout="inline" />
				</div>
			</div>

			<div className="flex items-center gap-2">
				<SignHeaderZoomControls density="comfortable" />

				<div className="w-px h-6 bg-border mx-2" />

				<div className="flex items-center gap-3">
					<SignPageEnvelopeCommentsBlock file={file} />
					<ProofDownloadButtonGroup
						exportsAllowed={exportsAllowed}
						pdfExportBusy={pdfExportBusy}
						fileDataReady={Boolean(fileData)}
						handleDownload={handleDownload}
						handleDownloadCompletionPacket={handleDownloadCompletionPacket}
						handleDownloadCompliancePdf={handleDownloadCompliancePdf}
					/>
					<SignHeaderRotateInviteButton variant="comfortable" />
				</div>

				<SignHeaderSignButton label="Sign document" density="comfortable" />
			</div>
		</div>
	);
}
