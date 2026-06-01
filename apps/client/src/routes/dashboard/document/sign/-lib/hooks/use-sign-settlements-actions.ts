import { useEntitlements } from "@filosign/react/billing";
import {
	canUseAdvancedSettlements,
	canUseBasicSettlements,
	formatSettlementSimError,
	type SettlementRuleRow,
	useAmendSigner,
	useAttachSettlementForFile,
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
import { toast } from "sonner";
import { type Address, getAddress } from "viem";
import { legsToDraftAmounts } from "@/src/routes/dashboard/document/sign/-lib/utils/settlement-legs";

type SignFileMeta = {
	signers?: {
		wallet: string;
		name?: string | null;
		email?: string | null;
	}[];
};

export function useSignSettlementsActions(
	pieceCid: string | undefined,
	file: SignFileMeta | undefined,
) {
	const settlementsQuery = useSettlementsListByFile(pieceCid);
	const trySettleSettlement = useTrySettleSettlement(pieceCid);
	const manualSettlementPayout = useManualSettlementPayout(pieceCid);
	const revokeSettlementAllowance = useRevokeSettlementAllowance(pieceCid);
	const updateSettlementRule = useUpdateSettlementRule(pieceCid);
	const cancelSettlementRule = useCancelSettlementRule(pieceCid);
	const amendSigner = useAmendSigner(pieceCid);
	const attachSettlementRules = useAttachSettlementForFile(pieceCid);
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

	const onTrySettleRule = useCallback(
		async (input: { onChainRuleId: string; validatorAddress: Address }) => {
			try {
				const result = await trySettleSettlement.mutateAsync(input);
				if (result.status === "partial") {
					toast.message(
						"Part of this payout went through. Tap Pay now again for the rest.",
					);
				}
			} catch (err) {
				toast.error(formatSettlementSimError(err));
			}
		},
		[trySettleSettlement],
	);

	const onManualSettleRule = useCallback(
		async (input: { onChainRuleId: string; validatorAddress: Address }) => {
			try {
				await manualSettlementPayout.mutateAsync(input);
			} catch (err) {
				toast.error(formatSettlementSimError(err));
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
			toast.error(formatSettlementSimError(err));
		}
	}, [revokeSettlementAllowance, settlementsQuery.data]);

	const onCancelRule = useCallback(
		async (input: { onChainRuleId: string; validatorAddress: Address }) => {
			try {
				await cancelSettlementRule.mutateAsync(input);
			} catch (err) {
				toast.error(formatSettlementSimError(err));
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
			} catch (err) {
				toast.error(formatSettlementSimError(err));
			}
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
				toast.error(
					err instanceof Error ? err.message : "Could not change signer",
				);
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
				toast.error(formatSettlementSimError(err));
			}
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
		amendPending: amendSigner.isPending,
		attachDialogOpen,
		setAttachDialogOpen,
		onConfirmAttachSettlement,
		attachPending: attachSettlementRules.isPending,
		attachPayeeOptions,
	};
}
