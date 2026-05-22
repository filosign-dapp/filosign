import z from "zod";
import { zEvmAddress, zHexString } from "./helpers/zod";

export const settlementReleaseTypes = [
	"all_signed",
	"specific_signer",
	"at_least_n",
] as const;

export type SettlementReleaseType = (typeof settlementReleaseTypes)[number];

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
	"executed",
	"failed_insufficient",
	"failed_relay",
	"failed_conditions",
	/** @deprecated Legacy Gelato status; treated like failed_relay in UI */
	"failed_gas_tank",
] as const;

export type SettlementRuleStatus = (typeof settlementRuleStatuses)[number];

export const zSettlementReleaseParams = z.discriminatedUnion("releaseType", [
	z.object({
		releaseType: z.literal("all_signed"),
	}),
	z.object({
		releaseType: z.literal("specific_signer"),
		signerEmailCommitment: zHexString(),
	}),
	z.object({
		releaseType: z.literal("at_least_n"),
		thresholdN: z.number().int().min(1),
		signerEmailCommitments: z.array(zHexString()).min(1),
	}),
]);

export const zSettlementRuleRegistrationInput = z.object({
	onChainRuleId: z.string().regex(/^\d+$/),
	recipientWallet: zEvmAddress(),
	recipientSource: z.enum(settlementRecipientSources),
	tokenAddress: zEvmAddress(),
	/** USDC base units (6 decimals). */
	amount: z.string().regex(/^\d+$/),
	cidIdentifier: zHexString(),
	releaseType: z.enum(settlementReleaseTypes),
	releaseParams: zSettlementReleaseParams,
	registerRuleTxHash: zHexString(),
	approveTxHash: zHexString(),
});

export type SettlementRuleRegistrationInput = z.infer<
	typeof zSettlementRuleRegistrationInput
>;
