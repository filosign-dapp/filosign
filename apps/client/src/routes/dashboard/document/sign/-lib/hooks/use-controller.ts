import { useEntitlements } from "@filosign/react/billing";
import {
	canUseAdvancedSettlements,
	canUseBasicSettlements,
	type SettlementRuleRow,
	useAmendSigner,
	useCancelSettlementRule,
	useManualSettlementPayout,
	useRevokeSettlementAllowance,
	useSettlementsListByFile,
	useTrySettleSettlement,
	useUpdateSettlementRule,
} from "@filosign/react/files";
import type {
	SettlementRecipientSource,
	SettlementRuleUpdateInput,
} from "@filosign/shared";
import { useCallback, useMemo, useState } from "react";
import { getAddress } from "viem";
import { useCompliancePdfExports } from "@/src/lib/domains/files/compliance-pdf";
import { legsToDraftAmounts } from "@/src/routes/dashboard/document/sign/-components/settlement-update-dialog";
import { useAttachSettlementRules } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-attach-settlement";
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
	const updateSettlementRule = useUpdateSettlementRule(pieceCid);
	const cancelSettlementRule = useCancelSettlementRule(pieceCid);
	const amendSigner = useAmendSigner(pieceCid);
	const attachSettlementRules = useAttachSettlementRules(pieceCid);
	const { data: entitlements } = useEntitlements();
	const canManageSettlements = canUseAdvancedSettlements(entitlements);
	const canAttachSettlement = canUseBasicSettlements(entitlements);

	const [updateRuleTarget, setUpdateRuleTarget] =
		useState<SettlementRuleRow | null>(null);
	const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
	const [amendDialogOpen, setAmendDialogOpen] = useState(false);
	const [attachDialogOpen, setAttachDialogOpen] = useState(false);

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

	const onCancelRule = useCallback(
		async (onChainRuleId: string) => {
			try {
				await cancelSettlementRule.mutateAsync(onChainRuleId);
			} catch (err) {
				console.error(err);
			}
		},
		[cancelSettlementRule],
	);

	const onUpdateRule = useCallback((rule: SettlementRuleRow) => {
		setUpdateRuleTarget(rule);
		setUpdateDialogOpen(true);
	}, []);

	const onConfirmUpdateRule = useCallback(
		async (args: {
			legs: { recipientWallet: `0x${string}`; amountUsdc: string }[];
			releaseType: SettlementRuleRow["releaseType"];
			releaseParams: SettlementRuleUpdateInput["releaseParams"];
		}) => {
			if (!updateRuleTarget) return;
			const draftLegs = legsToDraftAmounts(args.legs);
			await updateSettlementRule.mutateAsync({
				onChainRuleId: updateRuleTarget.onChainRuleId,
				releaseType: args.releaseType,
				releaseParams: args.releaseParams,
				legs: draftLegs.map((leg, index) => ({
					recipientWallet: leg.recipientWallet,
					recipientSource:
						updateRuleTarget.legs[index]?.recipientSource ??
						updateRuleTarget.recipientSource,
					amount: leg.amount,
				})),
			});
		},
		[updateRuleTarget, updateSettlementRule],
	);

	const onConfirmAmendSigner = useCallback(
		async (args: {
			oldCommitment: `0x${string}`;
			newCommitment: `0x${string}`;
		}) => {
			try {
				await amendSigner.mutateAsync(args);
			} catch (err) {
				console.error(err);
			}
		},
		[amendSigner],
	);

	const onConfirmAttachSettlement = useCallback(
		async (
			rules: Parameters<typeof attachSettlementRules.mutateAsync>[0]["rules"],
		) => {
			try {
				await attachSettlementRules.mutateAsync({ rules });
			} catch (err) {
				console.error(err);
			}
		},
		[attachSettlementRules],
	);

	const attachPayeeOptions = useMemo(() => {
		if (!file) return [];
		const options: {
			wallet: `0x${string}`;
			label: string;
			recipientSource: SettlementRecipientSource;
		}[] = [];
		for (const signer of file.signers ?? []) {
			const wallet = signer.wallet as `0x${string}`;
			options.push({
				wallet,
				label: signer.name || signer.email || wallet,
				recipientSource: "signer",
			});
		}
		return options;
	}, [file]);

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
			canManageSettlements,
			canAttachSettlement,
			onCancelRule,
			onUpdateRule,
			cancelPending: cancelSettlementRule.isPending,
			updatePending: updateSettlementRule.isPending,
			updateDialogOpen,
			setUpdateDialogOpen,
			updateRuleTarget,
			onConfirmUpdateRule,
			amendDialogOpen,
			setAmendDialogOpen,
			onConfirmAmendSigner,
			amendPending: amendSigner.isPending,
			attachDialogOpen,
			setAttachDialogOpen,
			onConfirmAttachSettlement,
			attachPending: attachSettlementRules.isPending,
			attachPayeeOptions,
		},
	};
}

export type SignDocumentController = ReturnType<typeof useSignDocument>;
