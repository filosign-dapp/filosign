import {
	useManualSettlementPayout,
	useRevokeSettlementAllowance,
	useSettlementsListByFile,
	useTrySettleSettlement,
} from "@filosign/react/files";
import { useCallback, useMemo } from "react";
import { getAddress } from "viem";
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

	const settlementsQuery = useSettlementsListByFile(pieceCid);
	const trySettleSettlement = useTrySettleSettlement(pieceCid);
	const manualSettlementPayout = useManualSettlementPayout(pieceCid);
	const revokeSettlementAllowance = useRevokeSettlementAllowance(pieceCid);

	const settlementRules = settlementsQuery.data ?? [];

	const canSettleByRuleId = useMemo(() => {
		const map = new Map<string, boolean>();
		for (const rule of settlementRules) {
			map.set(
				rule.onChainRuleId,
				rule.status === "executed" ? false : rule.canExecuteOnChain === true,
			);
		}
		return map;
	}, [settlementRules]);

	const actions = useSignActions({
		pieceCid,
		file,
		user: identity.user,
		canSubmitPlacementSign: placement.canSubmitPlacementSign,
		completedFieldIds: draft.completedFieldIds,
	});

	const onTrySettleRule = useCallback(
		async (onChainRuleId: string) => {
			try {
				await trySettleSettlement.mutateAsync(onChainRuleId);
			} catch (err) {
				console.error(err);
			}
		},
		[trySettleSettlement],
	);

	const onManualSettleRule = useCallback(
		async (onChainRuleId: string) => {
			try {
				await manualSettlementPayout.mutateAsync(onChainRuleId);
			} catch (err) {
				console.error(err);
			}
		},
		[manualSettlementPayout],
	);

	const onRevokeAllowance = useCallback(async () => {
		const rules = settlementsQuery.data ?? [];
		const token = rules[0]?.tokenAddress;
		if (!token) return;
		try {
			await revokeSettlementAllowance.mutateAsync(getAddress(token));
		} catch (err) {
			console.error(err);
		}
	}, [revokeSettlementAllowance, settlementsQuery.data]);

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
			executeRotateInvite: actions.executeRotateInvite,
			regenerateColdInvite: actions.regenerateColdInvite,
		},
		refs: {
			containerRef: viewer.containerRef,
			documentRef: viewer.documentRef,
		},
		acknowledge: { handleAcknowledge: actions.handleAcknowledge },
		settlements: {
			rules: settlementRules,
			isPending: settlementsQuery.isPending,
			walletAddress: identity.signerAddress,
			canSettleByRuleId,
			trySettlePending: trySettleSettlement.isPending,
			manualSettlePending: manualSettlementPayout.isPending,
			settlingRuleId: trySettleSettlement.isPending
				? trySettleSettlement.variables
				: manualSettlementPayout.isPending
					? manualSettlementPayout.variables
					: undefined,
			onTrySettleRule,
			onManualSettleRule,
			revokePending: revokeSettlementAllowance.isPending,
			onRevokeAllowance,
		},
	};
}

export type SignDocumentController = ReturnType<typeof useSignDocument>;
