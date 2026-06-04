import { useEntitlements } from "@filosign/react/billing";
import {
	buildNewSignerE2eeForAmend,
	canUseAdvancedSettlements,
	canUseBasicSettlements,
	type SettlementRuleRow,
	useAttachSettlementForFile,
	useCancelSettlementRule,
	useCancelSignerReplacement,
	useExecuteSignerReplacement,
	useManualSettlementPayout,
	useProposeSignerReplacement,
	useRecallEnvelope,
	useRevokeSettlementAllowance,
	useSettlementsListByFile,
	useTrySettleSettlement,
	useUpdateSettlementRule,
} from "@filosign/react/files";
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
import { toast } from "sonner";
import { type Address, getAddress } from "viem";
import { legsToDraftAmounts } from "@/src/routes/dashboard/document/sign/-lib/utils/settlement-legs";

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
	const attachSettlementRules = useAttachSettlementForFile(pieceCid);
	const { data: entitlements } = useEntitlements();
	const canManageSettlements = canUseAdvancedSettlements(entitlements);
	const canAttachSettlement = canUseBasicSettlements(entitlements);

	const [updateRuleTarget, setUpdateRuleTarget] =
		useState<SettlementRuleRow | null>(null);
	const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
	const [amendDialogOpen, setAmendDialogOpen] = useState(false);
	const [recallDialogOpen, setRecallDialogOpen] = useState(false);
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

	const onTrySettleRule = useCallback(
		async (input: { onChainRuleId: string; validatorAddress: Address }) => {
			try {
				const result = await trySettleSettlement.mutateAsync(input);
				if (result.status === "partial") {
					toast.message(
						"Part of this payout went through. Tap Pay now again for the rest.",
					);
				}
			} catch {}
		},
		[trySettleSettlement],
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
		if (!token) return;
		try {
			await revokeSettlementAllowance.mutateAsync(getAddress(token));
		} catch {}
	}, [revokeSettlementAllowance, settlementsQuery.data]);

	const onCancelRule = useCallback(
		async (input: { onChainRuleId: string; validatorAddress: Address }) => {
			try {
				await cancelSettlementRule.mutateAsync(input);
			} catch {}
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
			try {
				await updateSettlementRule.mutateAsync({
					onChainRuleId: updateRuleTarget.onChainRuleId,
					validatorAddress: getAddress(updateRuleTarget.validatorAddress),
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
			} catch {}
		},
		[updateRuleTarget, updateSettlementRule],
	);

	const onConfirmRecallEnvelope = useCallback(
		async (organizationId?: string | null) => {
			try {
				await recallEnvelope.mutateAsync({ organizationId });
				toast.success("Envelope recalled");
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
					toast.message(
						"Roster change proposed. Execute it when ready — signing is paused until then.",
					);
				} else {
					toast.success("Signer updated");
				}
			} catch {}
		},
		[pieceCid, userWallet, file, proposeSignerReplacement],
	);

	const onExecuteSignerReplacement = useCallback(async () => {
		try {
			await executeSignerReplacement.mutateAsync();
			toast.success(
				"Roster change applied. Prior signatures were cleared — signers must sign again.",
			);
		} catch {}
	}, [executeSignerReplacement]);

	const onCancelSignerReplacement = useCallback(async () => {
		try {
			await cancelSignerReplacement.mutateAsync();
			toast.success("Pending roster change cancelled");
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
		attachDialogOpen,
		setAttachDialogOpen,
		onConfirmAttachSettlement,
		attachPending: attachSettlementRules.isPending,
		attachPayeeOptions,
	};
}
