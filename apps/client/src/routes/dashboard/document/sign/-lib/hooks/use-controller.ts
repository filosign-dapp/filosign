import { useCompliancePdfExports } from "@/src/lib/domains/files/compliance-pdf/use-compliance-pdf-exports";
import { useSignActions } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-actions";
import { useSignDraftState } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-draft";
import {
	useSignFileMeta,
	useSignSigningMeta,
} from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-file-meta";
import { useSignIdentity } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-identity";
import { useSignNavigation } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-navigation";
import { useSignPlacement } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-placement";
import { useSignViewer } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-sign-viewer";

export function useSignDocument() {
	const { navigate, pieceCid } = useSignNavigation();
	const { file, filePending, fileError } = useSignFileMeta(pieceCid);
	const identity = useSignIdentity(file);
	const signingMeta = useSignSigningMeta(file, identity.signerAddress);

	const draft = useSignDraftState(pieceCid, file, signingMeta.alreadySigned);
	const viewer = useSignViewer(file, pieceCid);

	const placement = useSignPlacement({
		fileData: viewer.fileData,
		signerPlacementEmail: identity.signerPlacementEmail,
		completedFieldIds: draft.completedFieldIds,
		canSign: signingMeta.canSign,
	});

	const signPdfTotalDisplay =
		viewer.signPdfNumPages ?? placement.signPdfPageCountHint;

	const compliance = useCompliancePdfExports({
		file: file ?? null,
		fileData: viewer.fileData,
	});

	const actions = useSignActions({
		pieceCid,
		file,
		user: identity.user,
		canSubmitPlacementSign: placement.canSubmitPlacementSign,
		completedFieldIds: draft.completedFieldIds,
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
			myPlacementFields: placement.myPlacementFields,
			togglePlacementField: draft.togglePlacementField,
			isMyPlacementFieldDone: draft.isMyPlacementFieldDone,
			canSubmitPlacementSign: placement.canSubmitPlacementSign,
			signerPlacementEmail: identity.signerPlacementEmail,
		},
		viewer: {
			fileData: viewer.fileData,
			viewError: viewer.viewError,
			viewFile: viewer.viewFile,
			handleViewFile: viewer.handleViewFile,
			zoom: viewer.zoom,
			handleZoomIn: viewer.handleZoomIn,
			handleZoomOut: viewer.handleZoomOut,
			previewPdfBytes: viewer.previewPdfBytes,
			signPdfPage: viewer.signPdfPage,
			setSignPdfPage: viewer.setSignPdfPage,
			signPdfNumPages: viewer.signPdfNumPages,
			setSignPdfNumPages: viewer.setSignPdfNumPages,
			signPdfTotalDisplay,
			isSigningPdf: viewer.isSigningPdf,
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
			handleDownload: compliance.handleDownload,
			handleDownloadCompliancePdf: compliance.handleDownloadCompliancePdf,
			handleDownloadDocumentWithCompliancePdf:
				compliance.handleDownloadDocumentWithCompliancePdf,
		},
		coldShare: {
			coldShareDialogOpen: actions.coldShareDialogOpen,
			setColdShareDialogOpen: actions.setColdShareDialogOpen,
			coldShare: actions.coldShare,
			setColdShare: actions.setColdShare,
			handleRotateInvite: actions.handleRotateInvite,
			regenerateColdInvite: actions.regenerateColdInvite,
		},
		refs: {
			containerRef: viewer.containerRef,
			documentRef: viewer.documentRef,
		},
		acknowledge: { handleAcknowledge: actions.handleAcknowledge },
	};
}

export type SignDocumentController = ReturnType<typeof useSignDocument>;
