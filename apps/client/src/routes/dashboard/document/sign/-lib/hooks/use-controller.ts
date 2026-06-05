import { zPlacementManifest } from "@filosign/shared";
import { useMemo } from "react";
import { useCompliancePdfExports } from "@/src/lib/domains/files/compliance-pdf";
import { useSignActions } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-actions";
import { useSignDraftState } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-draft";
import {
	useSignFileMeta,
	useSignSigningMeta,
} from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-file-meta";
import { useSignIdentity } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-identity";
import { useSignNavigation } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-navigation";
import { useSignPlacement } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-placement";
import { useSignSettlementsActions } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-settlements-actions";
import { useSignViewer } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-viewer";

export function useSignDocument() {
	const { navigate, pieceCid } = useSignNavigation();
	const { file, filePending, fileError } = useSignFileMeta(pieceCid);
	const identity = useSignIdentity(file);
	const signingMeta = useSignSigningMeta(file, identity.signerAddress);
	const viewer = useSignViewer(file, pieceCid);

	const myPlacementFieldsBootstrap = useMemo(() => {
		if (!viewer.fileData?.placementManifest || !identity.signerPlacementEmail) {
			return [];
		}
		const parsed = zPlacementManifest.safeParse(
			viewer.fileData.placementManifest,
		);
		if (!parsed.success) return [];
		return parsed.data.fields.filter(
			(f) => f.assignedRecipientEmail === identity.signerPlacementEmail,
		);
	}, [viewer.fileData?.placementManifest, identity.signerPlacementEmail]);

	const draft = useSignDraftState(
		pieceCid,
		file,
		signingMeta.alreadySigned,
		myPlacementFieldsBootstrap,
	);

	const placement = useSignPlacement({
		fileData: viewer.fileData,
		signerPlacementEmail: identity.signerPlacementEmail,
		completedFieldIds: draft.completedFieldIds,
		fieldCompletions: draft.fieldCompletions,
		canSign: signingMeta.canSign,
	});

	const signPdfTotalDisplay =
		viewer.signPdfNumPages ?? placement.signPdfPageCountHint;

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
		completedFieldIds: draft.completedFieldIds,
		fieldCompletions: draft.fieldCompletions,
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
		placement: {
			completedFieldIds: draft.completedFieldIds,
			fieldCompletions: draft.fieldCompletions,
			myPlacementFields: placement.myPlacementFields,
			visiblePlacementFields: placement.visiblePlacementFields,
			applyPlacementField: draft.applyPlacementField,
			handleTextChange: draft.handleTextChange,
			handleCheckboxToggle: draft.handleCheckboxToggle,
			isMyPlacementFieldDone: draft.isMyPlacementFieldDone,
			canSubmitPlacementSign: placement.canSubmitPlacementSign,
			signerPlacementEmail: identity.signerPlacementEmail,
		},
		viewer: {
			...viewer,
			signPdfTotalDisplay,
		},
		signing: {
			canSign: signingMeta.canSign,
			alreadySigned: signingMeta.alreadySigned,
			signFile: actions.signFile,
			handleSign: actions.handleSign,
			mySignature: signingMeta.mySignature,
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
			handleDownload: compliance.handleDownload,
			handleDownloadCompliancePdf: compliance.handleDownloadCompliancePdf,
			handleDownloadDocumentWithCompliancePdf:
				compliance.handleDownloadDocumentWithCompliancePdf,
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
		refs: {
			containerRef: viewer.containerRef,
			documentRef: viewer.documentRef,
		},
		acknowledge: { handleAcknowledge: actions.handleAcknowledge },
		settlements: {
			...settlements,
			walletAddress: identity.signerAddress,
		},
	};
}

export type SignDocumentController = ReturnType<typeof useSignDocument>;
