import z from "zod";
import { zEvmAddress, zHexString } from "./helpers/zod";

export const paymentReleaseTypes = [
	"all_signed",
	"specific_signer",
	"at_least_n",
] as const;

export type PaymentReleaseType = (typeof paymentReleaseTypes)[number];

export const paymentRecipientSources = [
	"signer",
	"viewer",
	"org_wallet",
] as const;

export type PaymentRecipientSource = (typeof paymentRecipientSources)[number];

export const paymentRuleStatuses = [
	"pending",
	"ready",
	"executed",
	"failed_insufficient",
	"failed_gas_tank",
	"failed_conditions",
] as const;

export type PaymentRuleStatus = (typeof paymentRuleStatuses)[number];

export const zPaymentReleaseParams = z.discriminatedUnion("releaseType", [
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

export const zPaymentRuleRegistrationInput = z.object({
	onChainRuleId: z.string().regex(/^\d+$/),
	recipientWallet: zEvmAddress(),
	recipientSource: z.enum(paymentRecipientSources),
	tokenAddress: zEvmAddress(),
	/** USDC base units (6 decimals). */
	amount: z.string().regex(/^\d+$/),
	cidIdentifier: zHexString(),
	releaseType: z.enum(paymentReleaseTypes),
	releaseParams: zPaymentReleaseParams,
	registerRuleTxHash: zHexString(),
	approveTxHash: zHexString(),
});

export type PaymentRuleRegistrationInput = z.infer<
	typeof zPaymentRuleRegistrationInput
>;
