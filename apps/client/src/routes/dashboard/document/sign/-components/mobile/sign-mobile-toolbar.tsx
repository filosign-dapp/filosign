import type { PlacementField } from "@filosign/shared";
import { ProofDownloadButtonGroup } from "@/src/lib/domains/files/compliance-pdf";
import { SignPageEnvelopeCommentsBlock } from "@/src/lib/domains/files/envelope-comments-block";
import { SignHeaderRotateInviteButton } from "@/src/routes/dashboard/document/sign/-components/header/rotate-invite-button";
import { SignHeaderSettlementStrip } from "@/src/routes/dashboard/document/sign/-components/header/settlement-strip";
import { SignHeaderSignButton } from "@/src/routes/dashboard/document/sign/-components/header/sign-button";
import { SignSidebar } from "@/src/routes/dashboard/document/sign/-components/sidebar";
import {
	useSignCompliance,
	useSignFile,
	useSignPlacement,
	useSignSigning,
	useSignSuccess,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

export function SignMobileToolbar() {
	const { file } = useSignFile();
	const { fileData } = useSignViewer();
	const {
		pdfExportBusy,
		exportsAllowed,
		handleDownload,
		handleDownloadCompliancePdf,
		handleDownloadCompletionPacket,
	} = useSignCompliance();
	const { setSignSuccessDialogOpen } = useSignSuccess();
	const {
		myPlacementFields,
		fieldCompletions,
		completedFieldIds,
		togglePlacementField,
		clearPlacementField,
		isFieldComplete,
		canSubmitPlacementSign,
	} = useSignPlacement();
	const { canSign, alreadySigned } = useSignSigning();
	const { requestFieldFocus, setCurrentDocumentId } = useSignViewer();

	const fieldsChecklistProps = {
		fields: myPlacementFields,
		fieldCompletions,
		completedFieldIds,
		alreadySigned,
		canSign,
		canSubmitPlacementSign,
		isFieldComplete,
		onToggleField: (field: PlacementField) => void togglePlacementField(field),
		onClearField: clearPlacementField,
		onFocusField: (field: PlacementField) => {
			setCurrentDocumentId(field.documentId);
			requestFieldFocus(field.id);
		},
	};

	return (
		<div className="shrink-0 border-t border-border bg-background/95 px-3 py-2 backdrop-blur-sm lg:hidden">
			<SignHeaderSettlementStrip layout="centered" />
			<div className="mt-2 flex items-center justify-between gap-2">
				<SignSidebar.FieldsSheet {...fieldsChecklistProps} />
				<div className="flex items-center gap-2">
					<SignPageEnvelopeCommentsBlock file={file} />
					<ProofDownloadButtonGroup
						density="compact"
						exportsAllowed={exportsAllowed}
						pdfExportBusy={pdfExportBusy}
						fileDataReady={Boolean(fileData)}
						handleDownload={handleDownload}
						handleDownloadCompletionPacket={handleDownloadCompletionPacket}
						handleDownloadCompliancePdf={handleDownloadCompliancePdf}
						onMainProofClick={() => setSignSuccessDialogOpen(true)}
					/>
					<SignHeaderRotateInviteButton variant="compact" />
					<SignHeaderSignButton label="Sign" density="compact" />
				</div>
			</div>
		</div>
	);
}
