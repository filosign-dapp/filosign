import { useEntitlements } from "@filosign/react/billing";
import {
	buildNewSignerE2eeForAmend,
	canUseAdvancedSettlements,
	type SettlementRuleRow,
	useAttachSettlementForFile,
	useCancelSettlementRule,
	useCancelSignerReplacement,
	useClearEnvelopeSignatures,
	useExecuteSignerReplacement,
	useManualSettlementPayout,
	useProposeSignerReplacement,
	useRecallEnvelope,
	useRevokeSettlementAllowance,
	useSettlementsListByFile,
	useTrySettleSettlement,
	useUpdateSettlementRule,
} from "@filosign/react/files";
import { useActiveOrganization, useActiveOrgId } from "@filosign/react/orgs";
import type {
	SettlementRecipientSource,
	SettlementRuleUpdateInput,
} from "@filosign/shared";
import {
	normalizePlacementRecipientEmail,
	type PlacementManifest,
	sortedSignerCommitsForManifest,
	zPlacementManifest,
} from "@filosign/shared";
import { useCallback, useMemo, useState } from "react";
import { type Address, getAddress } from "viem";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import type { SettlementAllowanceChangeStep } from "@/src/lib/domains/settlements/allowance";
import {
	buildSettlementCancelProgressPlan,
	buildSettlementUpdateProgressPlan,
} from "@/src/lib/domains/settlements/change-progress";
import { useBasicPayoutGateActions } from "@/src/lib/domains/settlements/use-basic-payout-gate-actions";
import { useSettlementChangeProgress } from "@/src/routes/dashboard/document/sign/-lib/hooks/use-settlement-change-progress";
import {
	legsToDraftAmounts,
	mapSettlementUpdateLegs,
} from "@/src/routes/dashboard/document/sign/-lib/utils/settlement-legs";
import { usePromptPlanUpgrade } from "@/src/routes/dashboard/envelope/create/-lib/hooks/use-prompt-plan-upgrade";

type SignFileMeta = {
	kemCiphertext?: string | null;
	encryptedEncryptionKey?: string | null;
	placementManifest?: PlacementManifest | unknown | null;
	signers?: {
		wallet: string;
		name?: string | null;
		email?: string | null;
	}[];
	pendingSignerReplacement?: {
		oldCommitment: `0x${string}`;
		newCommitment: `0x${string}`;
	} | null;
};

export function useSignSettlementsActions(
	pieceCid: string | undefined,
	file: SignFileMeta | undefined,
	userWallet: `0x${string}` | undefined,
) {
	const settlementsQuery = useSettlementsListByFile(pieceCid);
	const trySettleSettlement = useTrySettleSettlement(pieceCid);
	const manualSettlementPayout = useManualSettlementPayout(pieceCid);
	const revokeSettlementAllowance = useRevokeSettlementAllowance(pieceCid);
	const updateSettlementRule = useUpdateSettlementRule(pieceCid);
	const cancelSettlementRule = useCancelSettlementRule(pieceCid);
	const proposeSignerReplacement = useProposeSignerReplacement(pieceCid);
	const executeSignerReplacement = useExecuteSignerReplacement(pieceCid);
	const cancelSignerReplacement = useCancelSignerReplacement(pieceCid);
	const recallEnvelope = useRecallEnvelope(pieceCid);
	const clearEnvelopeSignatures = useClearEnvelopeSignatures(pieceCid);
	const attachSettlementRules = useAttachSettlementForFile(pieceCid);
	const { data: entitlements } = useEntitlements();
	const activeOrgId = useActiveOrgId();
	const activeOrg = useActiveOrganization();
	const promptPlanUpgrade = usePromptPlanUpgrade();
	const canManageSettlements = canUseAdvancedSettlements(entitlements);

	const canManage = activeOrg?.role === "owner" || activeOrg?.role === "admin";

	const {
		requestDialogOpen,
		setRequestDialogOpen,
		payoutAccess,
		guardPayoutAttach,
	} = useBasicPayoutGateActions({
		activeOrgId: activeOrgId ?? undefined,
		canManage,
	});

	const [updateRuleTarget, setUpdateRuleTarget] =
		useState<SettlementRuleRow | null>(null);
	const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
	const [amendDialogOpen, setAmendDialogOpen] = useState(false);
	const [recallDialogOpen, setRecallDialogOpen] = useState(false);
	const [clearSignaturesDialogOpen, setClearSignaturesDialogOpen] =
		useState(false);
	const [attachDialogOpen, setAttachDialogOpen] = useState(false);
	const settlementChangeProgress = useSettlementChangeProgress();

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

	const onTrySettleRule = useCallback(
		async (input: { onChainRuleId: string; validatorAddress: Address }) => {
			try {
				const result = await trySettleSettlement.mutateAsync(input);
				if (result.status === "partial") {
					const rule = settlementRules.find(
						(r) => r.onChainRuleId === input.onChainRuleId,
					);
					const legCount = rule?.legs?.length ?? 1;
					if (legCount <= 1) {
						toastUser.message(TOASTS.sign.paymentConfirming.title, {
							hint: TOASTS.sign.paymentConfirming.hint,
						});
					} else {
						toastUser.message(TOASTS.sign.paymentPartial.title, {
							hint: TOASTS.sign.paymentPartial.hint,
						});
					}
				}
			} catch {}
		},
		[trySettleSettlement, settlementRules],
	);

	const onManualSettleRule = useCallback(
		async (input: { onChainRuleId: string; validatorAddress: Address }) => {
			try {
				await manualSettlementPayout.mutateAsync(input);
			} catch {}
		},
		[manualSettlementPayout],
	);

	const onRevokeAllowance = useCallback(async () => {
		const rules = settlementsQuery.data ?? [];
		const token = rules[0]?.tokenAddress;
		if (!token) {
			throw new Error("No payout token found for this document.");
		}
		await revokeSettlementAllowance.mutateAsync(getAddress(token));
		toastUser.success(TOASTS.sign.payoutApprovalRevoked.title, {
			hint: TOASTS.sign.payoutApprovalRevoked.hint,
		});
	}, [revokeSettlementAllowance, settlementsQuery.data]);

	const onCancelRule = useCallback(
		async (input: { onChainRuleId: string; validatorAddress: Address }) => {
			await settlementChangeProgress.run({
				mode: "cancel",
				plan: buildSettlementCancelProgressPlan(),
				run: async (onProgress) => {
					await cancelSettlementRule.mutateAsync({
						...input,
						allRules: settlementRules,
						onProgress,
					});
				},
				onSuccess: () => {
					toastUser.success(TOASTS.sign.payoutRemoved.title, {
						hint: TOASTS.sign.payoutRemoved.hint,
					});
				},
			});
		},
		[cancelSettlementRule, settlementChangeProgress, settlementRules],
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
			changeStep: SettlementAllowanceChangeStep;
		}) => {
			if (!updateRuleTarget) return;
			const legs = mapSettlementUpdateLegs(
				updateRuleTarget,
				legsToDraftAmounts(args.legs),
			);

			await settlementChangeProgress.run({
				mode: "update",
				plan: buildSettlementUpdateProgressPlan(args.changeStep),
				run: async (onProgress) => {
					await updateSettlementRule.mutateAsync({
						allRules: settlementRules,
						onChainRuleId: updateRuleTarget.onChainRuleId,
						validatorAddress: getAddress(updateRuleTarget.validatorAddress),
						releaseType: args.releaseType,
						releaseParams: args.releaseParams,
						legs,
						onProgress,
					});
				},
				onSuccess: () => {
					toastUser.success(TOASTS.sign.payoutAmountsUpdated.title, {
						hint: TOASTS.sign.payoutAmountsUpdated.hint,
					});
				},
			});
		},
		[
			updateRuleTarget,
			updateSettlementRule,
			settlementRules,
			settlementChangeProgress,
		],
	);

	const onConfirmClearEnvelopeSignatures = useCallback(
		async (registryAddress?: `0x${string}` | null) => {
			try {
				await clearEnvelopeSignatures.mutateAsync({ registryAddress });
				toastUser.success(TOASTS.sign.signaturesCleared.title, {
					hint: TOASTS.sign.signaturesCleared.hint,
				});
			} catch {}
		},
		[clearEnvelopeSignatures],
	);

	const onConfirmRecallEnvelope = useCallback(
		async (organizationId?: string | null) => {
			try {
				await recallEnvelope.mutateAsync({ organizationId });
				toastUser.success(TOASTS.sign.envelopeRecalled);
			} catch {}
		},
		[recallEnvelope],
	);

	const onConfirmAmendSigner = useCallback(
		async (args: {
			oldCommitment: `0x${string}`;
			newCommitment: `0x${string}`;
			newEmail: string;
		}) => {
			if (
				!pieceCid ||
				!userWallet ||
				!file?.kemCiphertext ||
				!file?.encryptedEncryptionKey ||
				!file.placementManifest
			) {
				return;
			}
			try {
				const manifest = zPlacementManifest.parse(file.placementManifest);
				const newSignerE2ee = await buildNewSignerE2eeForAmend({
					pieceCid,
					walletAddress: userWallet,
					kemCiphertext: file.kemCiphertext as `0x${string}`,
					encryptedEncryptionKey: file.encryptedEncryptionKey as `0x${string}`,
					newEmail: args.newEmail,
				});
				const result = await proposeSignerReplacement.mutateAsync({
					oldCommitment: args.oldCommitment,
					newCommitment: args.newCommitment,
					newEmail: normalizePlacementRecipientEmail(args.newEmail),
					requiredCommitments: sortedSignerCommitsForManifest(manifest),
					newSignerE2ee,
				});
				if (result.pending) {
					toastUser.message(TOASTS.sign.signerChangeProposed.title, {
						hint: TOASTS.sign.signerChangeProposed.hint,
					});
				} else {
					toastUser.success(TOASTS.sign.signerUpdated);
				}
			} catch {}
		},
		[pieceCid, userWallet, file, proposeSignerReplacement],
	);

	const onExecuteSignerReplacement = useCallback(async () => {
		try {
			await executeSignerReplacement.mutateAsync();
			toastUser.success(TOASTS.sign.signerChangeApplied.title, {
				hint: TOASTS.sign.signerChangeApplied.hint,
			});
		} catch {}
	}, [executeSignerReplacement]);

	const onCancelSignerReplacement = useCallback(async () => {
		try {
			await cancelSignerReplacement.mutateAsync();
			toastUser.success(TOASTS.sign.signerChangeCancelled);
		} catch {}
	}, [cancelSignerReplacement]);

	const onConfirmAttachSettlement = useCallback(
		async (
			rules: Parameters<typeof attachSettlementRules.mutateAsync>[0]["rules"],
		) => {
			try {
				await attachSettlementRules.mutateAsync({ rules });
			} catch {}
		},
		[attachSettlementRules],
	);

	const attachPayeeOptions = useMemo(() => {
		if (!file) return [];
		const options: {
			wallet: `0x${string}`;
			label: string;
			email?: string | null;
			recipientSource: SettlementRecipientSource;
		}[] = [];
		for (const signer of file.signers ?? []) {
			const wallet = signer.wallet as `0x${string}`;
			options.push({
				wallet,
				label: signer.name || signer.email || wallet,
				email: signer.email,
				recipientSource: "signer",
			});
		}
		return options;
	}, [file]);

	const openAttachDialog = useCallback(() => {
		if (guardPayoutAttach()) return;
		setAttachDialogOpen(true);
	}, [guardPayoutAttach]);

	const openAmendDialog = useCallback(() => {
		if (!canManageSettlements) {
			promptPlanUpgrade("features.signer_replacement");
			return;
		}
		setAmendDialogOpen(true);
	}, [canManageSettlements, promptPlanUpgrade]);

	return {
		rules: settlementRules,
		isPending: settlementsQuery.isPending,
		canSettleByRuleId,
		trySettlePending: trySettleSettlement.isPending,
		manualSettlePending: manualSettlementPayout.isPending,
		settlingRuleId: trySettleSettlement.isPending
			? trySettleSettlement.variables?.onChainRuleId
			: manualSettlementPayout.isPending
				? manualSettlementPayout.variables?.onChainRuleId
				: undefined,
		onTrySettleRule,
		onManualSettleRule,
		revokePending: revokeSettlementAllowance.isPending,
		onRevokeAllowance,
		canManageSettlements,
		onCancelRule,
		onUpdateRule,
		cancelPending:
			cancelSettlementRule.isPending ||
			settlementChangeProgress.isModeActive("cancel"),
		updatePending:
			updateSettlementRule.isPending ||
			settlementChangeProgress.isModeActive("update"),
		changeProgressOpen: settlementChangeProgress.open,
		changeProgressState: settlementChangeProgress.state,
		changeProgressMode: settlementChangeProgress.mode,
		dismissChangeProgress: settlementChangeProgress.dismiss,
		retryChangeProgress: settlementChangeProgress.retry,
		updateDialogOpen,
		setUpdateDialogOpen,
		updateRuleTarget,
		onConfirmUpdateRule,
		allRules: settlementRules,
		amendDialogOpen,
		setAmendDialogOpen,
		onConfirmAmendSigner,
		amendPending: proposeSignerReplacement.isPending,
		pendingSignerReplacement: file?.pendingSignerReplacement ?? null,
		onExecuteSignerReplacement,
		onCancelSignerReplacement,
		executeSignerReplacementPending: executeSignerReplacement.isPending,
		cancelSignerReplacementPending: cancelSignerReplacement.isPending,
		recallDialogOpen,
		setRecallDialogOpen,
		onConfirmRecallEnvelope,
		recallPending: recallEnvelope.isPending,
		clearSignaturesDialogOpen,
		setClearSignaturesDialogOpen,
		onConfirmClearEnvelopeSignatures,
		clearSignaturesPending: clearEnvelopeSignatures.isPending,
		attachDialogOpen,
		setAttachDialogOpen,
		openAttachDialog,
		openAmendDialog,
		requestDialogOpen,
		setRequestDialogOpen,
		payoutAccess,
		onConfirmAttachSettlement,
		attachPending: attachSettlementRules.isPending,
		attachPayeeOptions,
	};
}
