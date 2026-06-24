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

/** Shown in compose / attach payout selectors (basic tier). */
export const settlementReleaseTypesForComposeBasic = [
	"all_signed",
	"specific_signer",
] as const satisfies readonly SettlementReleaseType[];

/** Shown in compose / attach payout selectors (Teams Pro+). */
export const settlementReleaseTypesForComposeAdvanced = [
	"at_least_n",
	"quorum_required",
	"quorum_set",
	"quorum_all",
	"all_of_set",
] as const satisfies readonly SettlementReleaseType[];

/** On-chain aliases for `all_signed` (`isEnvelopeComplete`). Not offered in UI. */
const LEGACY_COMPLETION_RELEASE_TYPES = new Set<SettlementReleaseType>([
	"all_required_signed",
	"all_signed_complete",
]);

export function normalizeSettlementReleaseType(
	releaseType: SettlementReleaseType,
): SettlementReleaseType {
	return LEGACY_COMPLETION_RELEASE_TYPES.has(releaseType)
		? "all_signed"
		: releaseType;
}

export function isAdvancedSettlementReleaseType(
	releaseType: SettlementReleaseType,
): boolean {
	return !BASIC_RELEASE_TYPES.has(releaseType);
}

/** Expiry compares envelope completion time, not execute wall clock. */
export function isCompletionGatedSettlementExpiry(
	releaseType: SettlementReleaseType,
): boolean {
	return (
		releaseType === "all_signed" ||
		releaseType === "all_required_signed" ||
		releaseType === "all_signed_complete"
	);
}

/** Release types that may satisfy on-chain conditions before the envelope is fully signed. */
export function canSettlementReleaseBeforeEnvelopeComplete(
	releaseType: SettlementReleaseType,
): boolean {
	switch (normalizeSettlementReleaseType(releaseType)) {
		case "specific_signer":
		case "at_least_n":
		case "quorum_all":
		case "quorum_set":
		case "all_of_set":
			return true;
		default:
			return false;
	}
}

export const settlementRecipientSources = [
	"signer",
	"viewer",
	"org_wallet",
	"external",
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

const INACTIVE_SETTLEMENT_ALLOWANCE_STATUSES = new Set<SettlementRuleStatus>([
	"executed",
	"cancelled",
	"partial",
]);

/** Rules that still count toward ERC-20 approval required for FSPaymentValidator. */
export function isSettlementRuleAllowanceActive(
	status: SettlementRuleStatus,
): boolean {
	return !INACTIVE_SETTLEMENT_ALLOWANCE_STATUSES.has(status);
}

export type SettlementAllowanceRuleInput = {
	onChainRuleId: string;
	validatorAddress: string;
	tokenAddress: string;
	status: SettlementRuleStatus;
	legs: readonly Pick<SettlementPayoutLegInput, "amount">[];
};

/**
 * Sum of active payout totals for one (token, validator) pair on a file.
 * Use `replaceRuleId` + `legs` to preview post-update totals; `excludeRuleId` after cancel.
 */
export function settlementAllowanceRequired(
	rules: readonly SettlementAllowanceRuleInput[],
	opts: {
		tokenAddress: string;
		validatorAddress: string;
		replaceRuleId?: string;
		legs?: readonly Pick<SettlementPayoutLegInput, "amount">[];
		excludeRuleId?: string;
	},
): bigint {
	const token = opts.tokenAddress.toLowerCase();
	const validator = opts.validatorAddress.toLowerCase();
	let total = 0n;

	for (const rule of rules) {
		if (rule.tokenAddress.toLowerCase() !== token) continue;
		if (rule.validatorAddress.toLowerCase() !== validator) continue;
		if (opts.excludeRuleId && rule.onChainRuleId === opts.excludeRuleId) {
			continue;
		}
		if (!isSettlementRuleAllowanceActive(rule.status)) continue;

		if (opts.replaceRuleId && rule.onChainRuleId === opts.replaceRuleId) {
			if (opts.legs) {
				total += settlementRuleTotalAmount(opts.legs);
			}
			continue;
		}

		total += settlementRuleTotalAmount(rule.legs);
	}

	return total;
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
