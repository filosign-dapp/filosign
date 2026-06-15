import type { PlacementField } from "@filosign/shared";
import { InfoIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/src/lib/components/ui/sheet";
import { ProofDownloadButtonGroup } from "@/src/lib/domains/files/compliance-pdf";
import {
	type DocumentListRailItem,
	DocumentSwitcherSheet,
} from "@/src/lib/domains/files/document-viewport";
import { SignPageEnvelopeCommentsBlock } from "@/src/lib/domains/files/envelope-comments-block";
import { SignHeaderRotateInviteButton } from "@/src/routes/dashboard/document/sign/-components/header/rotate-invite-button";
import { SignHeaderSettlementStrip } from "@/src/routes/dashboard/document/sign/-components/header/settlement-strip";
import { SignHeaderSignButton } from "@/src/routes/dashboard/document/sign/-components/header/sign-button";
import { SignContextRail } from "@/src/routes/dashboard/document/sign/-components/right/context-rail";
import { SignSidebar } from "@/src/routes/dashboard/document/sign/-components/sidebar";
import { SupplementaryPacketsSignPanel } from "@/src/routes/dashboard/document/sign/-components/supplementary-packets-sign-panel";
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
	const {
		fileData,
		documents,
		currentDocumentId,
		setCurrentDocumentId,
		requestFieldFocus,
	} = useSignViewer();
	const {
		myPlacementFields,
		visiblePlacementFields,
		fieldCompletions,
		completedFieldIds,
		togglePlacementField,
		clearPlacementField,
		isFieldComplete,
		canSubmitPlacementSign,
	} = useSignPlacement();
	const { canSign, alreadySigned } = useSignSigning();
	const compliance = useSignCompliance();
	const { setSignSuccessDialogOpen } = useSignSuccess();

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

	const railDocuments = useMemo((): DocumentListRailItem[] => {
		return documents.map((doc) => {
			const docFields = myPlacementFields.filter(
				(f) => f.documentId === doc.id,
			);
			const done = docFields.filter(
				(f) =>
					completedFieldIds.includes(f.id) ||
					Boolean(fieldCompletions[f.id]?.textValue) ||
					Boolean(fieldCompletions[f.id]?.previewUrl),
			).length;
			const total = docFields.length;
			const meta =
				total > 0
					? `${done}/${total} fields done`
					: `${visiblePlacementFields.filter((f) => f.documentId === doc.id).length} fields`;
			return {
				id: doc.id,
				name: doc.name,
				meta,
			};
		});
	}, [
		documents,
		myPlacementFields,
		completedFieldIds,
		fieldCompletions,
		visiblePlacementFields,
	]);

	return (
		<div className="shrink-0 border-t border-border bg-background/95 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden">
			<SignHeaderSettlementStrip layout="centered" />
			<div className="mt-2 flex flex-wrap items-center justify-center gap-2">
				<DocumentSwitcherSheet
					documents={railDocuments}
					currentDocumentId={currentDocumentId}
					onDocumentSelect={setCurrentDocumentId}
				/>
				<SignSidebar.FieldsSheet {...fieldsChecklistProps} />
				<Sheet>
					<SheetTrigger
						render={
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="min-h-11 gap-2"
							/>
						}
					>
						<InfoIcon className="size-4" weight="duotone" />
						Details
					</SheetTrigger>
					<SheetContent
						side="bottom"
						className="max-h-[85vh] overflow-y-auto p-0"
					>
						<SheetHeader className="px-5 pt-5">
							<SheetTitle>Envelope details</SheetTitle>
						</SheetHeader>
						<SignContextRail />
						<div className="px-5 pb-5">
							<SupplementaryPacketsSignPanel />
						</div>
					</SheetContent>
				</Sheet>
			</div>
			<div className="mt-2 flex flex-wrap items-center justify-center gap-2">
				<SignPageEnvelopeCommentsBlock file={file} />
				<ProofDownloadButtonGroup
					density="compact"
					exports={compliance}
					fileDataReady={Boolean(fileData)}
					onMainProofClick={() => setSignSuccessDialogOpen(true)}
				/>
				<SignHeaderRotateInviteButton variant="compact" />
				<SignHeaderSignButton label="Sign" density="compact" />
			</div>
		</div>
	);
}
