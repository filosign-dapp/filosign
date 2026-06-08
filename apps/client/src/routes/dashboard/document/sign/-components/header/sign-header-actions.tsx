import {
	ButtonGroup,
	ButtonGroupText,
} from "@/src/lib/components/ui/button-group";
import { ProofDownloadButtonGroup } from "@/src/lib/domains/files/compliance-pdf";
import { SignPageEnvelopeCommentsBlock } from "@/src/lib/domains/files/envelope-comments-block";
import { cn } from "@/src/lib/utils/utils";
import { SignHeaderRotateInviteButton } from "@/src/routes/dashboard/document/sign/-components/header/rotate-invite-button";
import { SettlementHeaderBadge } from "@/src/routes/dashboard/document/sign/-components/settlement-header-badge";
import {
	useSignCompliance,
	useSignFile,
	useSignPlacement,
	useSignSettlements,
	useSignSigning,
	useSignSuccess,
	useSignViewer,
} from "@/src/routes/dashboard/document/sign/-lib/context/context";

function signStatusLabel(args: {
	alreadySigned: boolean;
	canSign: boolean;
	hasPlacementFields: boolean;
	canSubmitPlacementSign: boolean;
}) {
	if (args.alreadySigned) {
		return { label: "Signed", dotClass: "bg-emerald-500" };
	}
	if (!args.canSign) {
		return null;
	}
	if (args.hasPlacementFields && !args.canSubmitPlacementSign) {
		return { label: "Fields incomplete", dotClass: "bg-amber-500" };
	}
	return { label: "Ready to sign", dotClass: "bg-emerald-500" };
}

export function SignHeaderActions() {
	const { file } = useSignFile();
	const { fileData } = useSignViewer();
	const { alreadySigned, canSign } = useSignSigning();
	const { myPlacementFields, canSubmitPlacementSign } = useSignPlacement();
	const { rules: settlementRules } = useSignSettlements();
	const {
		pdfExportBusy,
		exportsAllowed,
		handleDownload,
		handleDownloadCompliancePdf,
		handleDownloadCompletionPacket,
	} = useSignCompliance();
	const { setSignSuccessDialogOpen } = useSignSuccess();

	const status = signStatusLabel({
		alreadySigned,
		canSign,
		hasPlacementFields: myPlacementFields.length > 0,
		canSubmitPlacementSign,
	});

	return (
		<div className="hidden items-center gap-2 md:gap-3 lg:flex">
			{settlementRules.length > 0 ? (
				<SettlementHeaderBadge rules={settlementRules} />
			) : null}
			<ButtonGroup aria-label="Document actions">
				{status ? (
					<ButtonGroupText className="hidden h-10 gap-2 border-border/60 bg-muted/30 px-2.5 text-xs font-normal text-muted-foreground shadow-none sm:flex">
						<span
							className={cn("size-2 rounded-full", status.dotClass)}
							aria-hidden
						/>
						<span>{status.label}</span>
					</ButtonGroupText>
				) : null}
				<SignPageEnvelopeCommentsBlock
					file={file}
					triggerVariant="header-icon"
				/>
				<SignHeaderRotateInviteButton variant="header-icon" />
			</ButtonGroup>
			<ProofDownloadButtonGroup
				density="header"
				exportsAllowed={exportsAllowed}
				pdfExportBusy={pdfExportBusy}
				fileDataReady={Boolean(fileData)}
				handleDownload={handleDownload}
				handleDownloadCompletionPacket={handleDownloadCompletionPacket}
				handleDownloadCompliancePdf={handleDownloadCompliancePdf}
				onMainProofClick={() => setSignSuccessDialogOpen(true)}
			/>
		</div>
	);
}
