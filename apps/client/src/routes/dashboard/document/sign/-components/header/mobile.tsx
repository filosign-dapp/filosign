import { ArrowLeftIcon } from "@phosphor-icons/react";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { Button } from "@/src/lib/components/ui/button";
import { ProofDownloadButtonGroup } from "@/src/lib/domains/files/compliance-pdf";
import { SignPageEnvelopeCommentsBlock } from "@/src/lib/domains/files/envelope-comments-block";
import { SignHeaderRotateInviteButton } from "@/src/routes/dashboard/document/sign/-components/header/rotate-invite-button";
import { SignHeaderSettlementStrip } from "@/src/routes/dashboard/document/sign/-components/header/settlement-strip";
import { SignHeaderSignButton } from "@/src/routes/dashboard/document/sign/-components/header/sign-button";
import { SignHeaderZoomControls } from "@/src/routes/dashboard/document/sign/-components/header/zoom-controls";
import { SignSidebar } from "@/src/routes/dashboard/document/sign/-components/sidebar";
import {
	useSignCompliance,
	useSignFile,
	useSignNavigation,
	useSignPlacement,
	useSignSigning,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

export function SignHeaderMobile() {
	const { navigate } = useSignNavigation();
	const { pieceCid, file } = useSignFile();
	const { canSign, alreadySigned } = useSignSigning();
	const { fileData } = useSignViewer();
	const {
		canSubmitPlacementSign,
		myPlacementFields,
		fieldCompletions,
		completedFieldIds,
		togglePlacementField,
		clearPlacementField,
		isFieldComplete,
	} = useSignPlacement();
	const {
		pdfExportBusy,
		exportsAllowed,
		handleDownload,
		handleDownloadCompliancePdf,
		handleDownloadCompletionPacket,
	} = useSignCompliance();

	return (
		<div className="md:hidden">
			<div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => navigate({ to: "/dashboard" })}
					className="text-muted-foreground hover:text-foreground hover:bg-accent/50 -ml-2"
				>
					<ArrowLeftIcon className="size-4 mr-1.5" />
					<span className="text-sm">Back</span>
				</Button>
				<h2 className="text-sm flex items-center font-semibold truncate text-foreground max-w-[60%]">
					<span className="truncate">{pieceCid}</span>
					<CopyButton text={pieceCid} />
				</h2>
			</div>

			<SignHeaderSettlementStrip layout="centered" />

			<div className="flex items-center justify-between px-3 py-2">
				<SignHeaderZoomControls density="compact" />

				<div className="flex items-center gap-2">
					<SignSidebar.FieldsSheet
						fields={myPlacementFields}
						fieldCompletions={fieldCompletions}
						completedFieldIds={completedFieldIds}
						alreadySigned={alreadySigned}
						canSign={canSign}
						canSubmitPlacementSign={canSubmitPlacementSign}
						isFieldComplete={isFieldComplete}
						onToggleField={(field) => void togglePlacementField(field)}
						onClearField={clearPlacementField}
					/>
					<SignPageEnvelopeCommentsBlock file={file} />
					<ProofDownloadButtonGroup
						density="compact"
						exportsAllowed={exportsAllowed}
						pdfExportBusy={pdfExportBusy}
						fileDataReady={Boolean(fileData)}
						handleDownload={handleDownload}
						handleDownloadCompletionPacket={handleDownloadCompletionPacket}
						handleDownloadCompliancePdf={handleDownloadCompliancePdf}
					/>
					<SignHeaderRotateInviteButton variant="compact" />
					<SignHeaderSignButton label="Sign" density="compact" />
				</div>
			</div>
		</div>
	);
}
