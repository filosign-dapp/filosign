import { parsePlacementManifestForSigner } from "@filosign/shared";
import { useMemo } from "react";
import { useCompliancePdfExports } from "@/src/lib/domains/files/compliance-pdf";
import { useSignActions } from "./use-actions";
import { useSignFieldSession } from "./use-field-session";
import { useSignFileMeta, useSignSigningMeta } from "./use-file-meta";
import { useSignIdentity } from "./use-identity";
import { useSignNavigation } from "./use-navigation";
import { useSignPlacementFields } from "./use-placement-fields";
import { useSignSettlementsActions } from "./use-settlements-actions";
import { useSignViewer } from "./use-viewer";

export function useSignDocumentController() {
	const { navigate, pieceCid } = useSignNavigation();
	const { file, filePending, fileError } = useSignFileMeta(pieceCid);
	const identity = useSignIdentity(file);
	const signingMeta = useSignSigningMeta(file, identity.signerAddress);
	const viewer = useSignViewer(file);

	const placementManifest =
		viewer.fileData?.placementManifest ?? file?.placementManifest ?? null;

	const placementParsed = useMemo(
		() =>
			parsePlacementManifestForSigner(
				placementManifest,
				identity.signerPlacementEmail,
			),
		[placementManifest, identity.signerPlacementEmail],
	);

	const fieldSession = useSignFieldSession({
		pieceCid,
		canPersistDraft:
			Boolean(file?.participantAccess?.canDecrypt) &&
			!signingMeta.alreadySigned,
		alreadySigned: signingMeta.alreadySigned,
		signedFieldCompletions: file?.fieldCompletions,
		signerAddress: identity.signerAddress,
		myPlacementFields: placementParsed.myFields,
	});

	const placement = useSignPlacementFields({
		parsed: placementParsed,
		fileData: viewer.fileData,
		signerPlacementEmail: identity.signerPlacementEmail,
		completedFieldIds: fieldSession.completedFieldIds,
		fieldCompletions: fieldSession.fieldCompletions,
		canSign: signingMeta.canSign,
	});

	const compliance = useCompliancePdfExports({
		file: file
			? {
					pieceCid: file.pieceCid,
					status: file.status,
					isFinalized: Boolean(
						file.envelopeProgress?.completedAt ||
							file.envelopeProgress?.revokedBeforeCompletedAt,
					),
				}
			: null,
		fileData: viewer.fileData,
	});

	const settlements = useSignSettlementsActions(
		pieceCid,
		file,
		identity.user?.wallet?.address as `0x${string}` | undefined,
	);

	const actions = useSignActions({
		pieceCid,
		file,
		user: identity.user,
		canSubmitPlacementSign: placement.canSubmitPlacementSign,
		myPlacementFields: placement.myPlacementFields,
		completedFieldIds: fieldSession.completedFieldIds,
		fieldCompletions: fieldSession.fieldCompletions,
		prepareForSign: fieldSession.prepareForSign,
		isSender: signingMeta.isSender,
		senderHasAssignedFields: signingMeta.senderHasAssignedFields,
		envelopeProgress: file?.envelopeProgress,
		settlementRuleCount: settlements.rules.length,
	});

	return {
		navigation: { navigate, pieceCid },
		fileQuery: {
			file,
			filePending,
			fileError,
			acknowledgeFile: actions.acknowledgeFile,
		},
		signSuccess: {
			signSuccessDialogOpen: actions.signSuccessDialogOpen,
			setSignSuccessDialogOpen: actions.setSignSuccessDialogOpen,
		},
		identity,
		fieldSession: {
			status: fieldSession.sessionStatus,
			provisioningFieldIds: fieldSession.provisioningFieldIds,
		},
		placement: {
			completedFieldIds: fieldSession.completedFieldIds,
			fieldCompletions: fieldSession.fieldCompletions,
			myPlacementFields: placement.myPlacementFields,
			visiblePlacementFields: placement.visiblePlacementFields,
			togglePlacementField: fieldSession.togglePlacementField,
			clearPlacementField: fieldSession.clearPlacementField,
			isFieldComplete: fieldSession.isFieldComplete,
			getTextFieldValue: fieldSession.getTextFieldValue,
			handleTextDraftChange: fieldSession.handleTextDraftChange,
			handleTextFocus: fieldSession.handleTextFocus,
			handleTextBlur: fieldSession.handleTextBlur,
			handleCheckboxToggle: fieldSession.handleCheckboxToggle,
			isMyPlacementFieldDone: fieldSession.isMyPlacementFieldDone,
			canSubmitPlacementSign: placement.canSubmitPlacementSign,
			signerPlacementEmail: identity.signerPlacementEmail,
			requiredFields: placementParsed.requiredFields,
			provisioningFieldIds: fieldSession.provisioningFieldIds,
		},
		viewer,
		signing: {
			canSign: signingMeta.canSign,
			alreadySigned: signingMeta.alreadySigned,
			signFile: actions.signFile,
			handleSign: actions.handleSign,
			mySignature: signingMeta.mySignature,
			signProgressOpen: actions.signProgressOpen,
			signProgressState: actions.signProgressState,
			dismissSignProgress: actions.dismissSignProgress,
			retrySign: actions.retrySign,
		},
		meta: {
			isSender: signingMeta.isSender,
			signedTxExplorerUrl: signingMeta.signedTxExplorerUrl,
			explorerLabel: signingMeta.explorerLabel,
			formatAddress: actions.formatAddress,
		},
		compliance: {
			pdfExportBusy: compliance.pdfExportBusy,
			exportsAllowed: compliance.exportsAllowed,
			handleDownloadOriginalFiles: compliance.handleDownloadOriginalFiles,
			handleDownloadCompliancePdf: compliance.handleDownloadCompliancePdf,
			handleDownloadSignedEnvelope: compliance.handleDownloadSignedEnvelope,
			handleDownloadCompletionPacket: compliance.handleDownloadCompletionPacket,
		},
		coldShare: {
			coldShareDialogOpen: actions.coldShareDialogOpen,
			setColdShareDialogOpen: actions.setColdShareDialogOpen,
			coldShare: actions.coldShare,
			setColdShare: actions.setColdShare,
			executeRotateInvite: actions.executeRotateInvite,
			regenerateColdInvite: actions.regenerateColdInvite,
		},
		acknowledge: { handleAcknowledge: actions.handleAcknowledge },
		settlements: {
			...settlements,
			walletAddress: identity.signerAddress,
		},
	};
}

export type SignDocumentController = ReturnType<
	typeof useSignDocumentController
>;
