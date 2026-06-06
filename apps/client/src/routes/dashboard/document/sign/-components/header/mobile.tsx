import { ArrowLeftIcon, DownloadIcon } from "@phosphor-icons/react";
import { CopyButton } from "@/src/lib/components/app/chrome/copy-button";
import { Button } from "@/src/lib/components/ui/button";
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
	const { pdfExportBusy, handleDownloadDocumentWithCompliancePdf } =
		useSignCompliance();

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
					<Button
						variant="ghost"
						size="sm"
						onClick={handleDownloadDocumentWithCompliancePdf}
						disabled={!fileData || pdfExportBusy}
						className="text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 w-8 p-0"
						title="Download document with proof appendix"
					>
						<DownloadIcon className="size-5" />
					</Button>
					<SignHeaderRotateInviteButton variant="compact" />
					<SignHeaderSignButton label="Sign" density="compact" />
				</div>
			</div>
		</div>
	);
}
