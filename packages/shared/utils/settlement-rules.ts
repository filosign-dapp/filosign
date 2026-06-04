import z from "zod";
import { zEvmAddress, zHexString } from "../helpers/zod";

export const settlementReleaseTypes = [
	"all_signed",
	"specific_signer",
	"at_least_n",
	"all_required_signed",
	"all_signed_complete",
	"quorum_required",
	"quorum_set",
	"quorum_all",
	"all_of_set",
] as const;

export type SettlementReleaseType = (typeof settlementReleaseTypes)[number];

/** Maps shared release type to FSPaymentValidator enum uint8. */
export const SETTLEMENT_RELEASE_TYPE_UINT: Record<
	SettlementReleaseType,
	number
> = {
	all_signed: 0,
	specific_signer: 1,
	at_least_n: 2,
	all_required_signed: 3,
	all_signed_complete: 4,
	quorum_required: 5,
	quorum_set: 6,
	quorum_all: 7,
	all_of_set: 8,
};

const BASIC_RELEASE_TYPES = new Set<SettlementReleaseType>([
	"all_signed",
	"specific_signer",
]);

export function isAdvancedSettlementReleaseType(
	releaseType: SettlementReleaseType,
): boolean {
	return !BASIC_RELEASE_TYPES.has(releaseType);
}

export const settlementRecipientSources = [
	"signer",
	"viewer",
	"org_wallet",
] as const;

export type SettlementRecipientSource =
	(typeof settlementRecipientSources)[number];

export const settlementRuleStatuses = [
	"pending",
	"ready",
	"partial",
	"executed",
	"cancelled",
	"failed_insufficient",
	"failed_relay",
	"failed_conditions",
] as const;

export type SettlementRuleStatus = (typeof settlementRuleStatuses)[number];

export const zSettlementPayoutLegInput = z.object({
	recipientWallet: zEvmAddress(),
	recipientSource: z.enum(settlementRecipientSources),
	amount: z.string().regex(/^\d+$/),
});

export type SettlementPayoutLegInput = z.infer<
	typeof zSettlementPayoutLegInput
>;

/** Indexed leg row (DB / API); optional fields synced from chain after per-leg payout. */
export const zSettlementPayoutLegStored = zSettlementPayoutLegInput.extend({
	paid: z.boolean().optional(),
	payoutTxHash: zHexString().optional(),
});

export type SettlementPayoutLegStored = z.infer<
	typeof zSettlementPayoutLegStored
>;

export const zSettlementReleaseParams = z.discriminatedUnion("releaseType", [
	z.object({ releaseType: z.literal("all_signed") }),
	z.object({ releaseType: z.literal("all_required_signed") }),
	z.object({ releaseType: z.literal("all_signed_complete") }),
	z.object({
		releaseType: z.literal("specific_signer"),
		signerEmailCommitment: zHexString(),
	}),
	z.object({
		releaseType: z.literal("at_least_n"),
		thresholdN: z.number().int().min(1),
		signerEmailCommitments: z.array(zHexString()).min(1),
	}),
	z.object({
		releaseType: z.literal("quorum_required"),
		thresholdN: z.number().int().min(1),
	}),
	z.object({
		releaseType: z.literal("quorum_set"),
		thresholdN: z.number().int().min(1),
		signerEmailCommitments: z.array(zHexString()).min(1),
	}),
	z.object({
		releaseType: z.literal("quorum_all"),
		thresholdN: z.number().int().min(1),
	}),
	z.object({
		releaseType: z.literal("all_of_set"),
		signerEmailCommitments: z.array(zHexString()).min(1),
	}),
]);

export type SettlementReleaseParams = z.infer<typeof zSettlementReleaseParams>;

export const zSettlementRuleRegistrationInput = z
	.object({
		onChainRuleId: z.string().regex(/^\d+$/),
		legs: z.array(zSettlementPayoutLegInput).min(1).max(32),
		tokenAddress: zEvmAddress(),
		cidIdentifier: zHexString(),
		releaseType: z.enum(settlementReleaseTypes),
		releaseParams: zSettlementReleaseParams,
		expiresAt: z.string().regex(/^\d+$/).optional(),
		registerRuleTxHash: zHexString(),
		approveTxHash: zHexString(),
	})
	.superRefine((rule, ctx) => {
		if (rule.releaseType !== rule.releaseParams.releaseType) {
			ctx.addIssue({
				code: "custom",
				message: "releaseType must match releaseParams.releaseType",
			});
		}
	});

export type SettlementRuleRegistrationInput = z.infer<
	typeof zSettlementRuleRegistrationInput
>;

export function settlementRuleTotalAmount(
	legs: readonly Pick<SettlementPayoutLegInput, "amount">[],
): bigint {
	return legs.reduce((sum, leg) => sum + BigInt(leg.amount), 0n);
}

/** Top-level API fields derived from the first payout leg (convenience for list rows). */
export function firstSettlementLeg(
	legs: readonly SettlementPayoutLegInput[],
): Pick<
	SettlementPayoutLegInput,
	"recipientWallet" | "recipientSource" | "amount"
> {
	const first = legs[0];
	if (!first) {
		throw new Error("Settlement rule requires at least one payout leg");
	}
	return {
		recipientWallet: first.recipientWallet,
		recipientSource: first.recipientSource,
		amount: first.amount,
	};
}

/** On-chain settlement rule identity (unique per validator contract). */
export const zSettlementRuleKey = z.object({
	onChainRuleId: z.string().regex(/^\d+$/),
	validatorAddress: zEvmAddress(),
});

export type SettlementRuleKey = z.infer<typeof zSettlementRuleKey>;

export const zSettlementRuleUpdateInput = zSettlementRuleKey.extend({
	updateRuleTxHash: zHexString(),
	legs: z.array(zSettlementPayoutLegInput).min(1).max(32),
	releaseType: z.enum(settlementReleaseTypes),
	releaseParams: zSettlementReleaseParams,
	expiresAt: z.string().regex(/^\d+$/).optional(),
});

export type SettlementRuleUpdateInput = z.infer<
	typeof zSettlementRuleUpdateInput
>;

export const zSettlementRuleCancelInput = zSettlementRuleKey.extend({
	cancelRuleTxHash: zHexString(),
});

export type SettlementRuleCancelInput = z.infer<
	typeof zSettlementRuleCancelInput
>;
