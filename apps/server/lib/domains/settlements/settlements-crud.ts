import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import {
	settlementRuleTotalAmount,
	zSettlementRuleCancelInput,
	zSettlementRuleUpdateInput,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { MAX_SETTLEMENT_LEGS_PRODUCT } from "@/constants";
import { resolveEntitlementContext } from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";
import { evmClient, fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { assertSettlementRecipientsAllowlisted } from "./settlements-register";
import {
	markSettlementRuleCancelled,
	markSettlementRuleUpdated,
} from "./utils/settlement-db-sync";
import {
	assertSettlementRuleEntitlements,
	assertSettlementUpdateEntitlements,
} from "./utils/settlement-entitlements";
import { assertSettlementRuleUpdateOnChain } from "./utils/verify-rules-on-chain";

const { fileSettlementRules, files, fileParticipants } = db.schema;

async function loadPayerRule(sender: Address, onChainRuleId: bigint) {
	const [rule] = await db
		.select()
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId))
		.limit(1);
	if (!rule) {
		throw new ORPCError("NOT_FOUND", { message: "Settlement rule not found" });
	}
	if (getAddress(rule.payerWallet) !== getAddress(sender)) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the payer can modify this settlement rule",
		});
	}
	if (rule.status === "executed" || rule.status === "cancelled") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Settlement rule is no longer active",
		});
	}
	return rule;
}

export async function settlementsUpdateRule(sender: Address, rawBody: unknown) {
	const parsed = zSettlementRuleUpdateInput.safeParse(rawBody);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	const input = parsed.data;
	const ruleId = BigInt(input.onChainRuleId);
	const rule = await loadPayerRule(sender, ruleId);

	if (input.legs.length > MAX_SETTLEMENT_LEGS_PRODUCT) {
		throw new ORPCError("FORBIDDEN", {
			message: `Settlement supports at most ${MAX_SETTLEMENT_LEGS_PRODUCT} payout legs on your plan`,
		});
	}

	const [file] = await db
		.select({ organizationId: files.organizationId })
		.from(files)
		.where(eq(files.pieceCid, rule.pieceCid))
		.limit(1);
	const entitlementCtx = await resolveEntitlementContext(
		getAddress(sender),
		file?.organizationId ?? null,
	);
	assertSettlementUpdateEntitlements(entitlementCtx);

	const registrationRule: SettlementRuleRegistrationInput = {
		onChainRuleId: input.onChainRuleId,
		legs: input.legs,
		tokenAddress: getAddress(rule.tokenAddress),
		cidIdentifier: rule.cidIdentifier as `0x${string}`,
		releaseType: input.releaseType,
		releaseParams: input.releaseParams,
		expiresAt: input.expiresAt,
		registerRuleTxHash: rule.registerRuleTxHash as `0x${string}`,
		approveTxHash: rule.approveTxHash as `0x${string}`,
	};
	assertSettlementRuleEntitlements(entitlementCtx, registrationRule);

	const participantRows = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(eq(fileParticipants.filePieceCid, rule.pieceCid));
	await assertSettlementRecipientsAllowlisted({
		participantWallets: participantRows.map((p) => getAddress(p.wallet)),
		organizationId: file?.organizationId ?? undefined,
		rules: [registrationRule],
	});

	await assertSettlementRuleUpdateOnChain(
		sender,
		rule.pieceCid,
		registrationRule,
		input.updateRuleTxHash,
		getAddress(rule.validatorAddress),
	);

	if (settlementRuleTotalAmount(input.legs) <= 0n) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid payout total" });
	}

	await markSettlementRuleUpdated({
		onChainRuleId: ruleId,
		updateRuleTxHash: input.updateRuleTxHash,
		legs: input.legs,
		releaseType: input.releaseType,
		releaseParams: input.releaseParams,
		expiresAt: input.expiresAt,
	});

	return { ok: true as const, onChainRuleId: input.onChainRuleId };
}

export async function settlementsCancelRule(sender: Address, rawBody: unknown) {
	const parsed = zSettlementRuleCancelInput.safeParse(rawBody);
	if (!parsed.success) {
		throw new ORPCError("BAD_REQUEST", { message: parsed.error.message });
	}
	const input = parsed.data;
	const ruleId = BigInt(input.onChainRuleId);
	const rule = await loadPayerRule(sender, ruleId);

	const receiptRes = await tryCatch(
		evmClient.getTransactionReceipt({ hash: input.cancelRuleTxHash }),
	);
	if (receiptRes.error || receiptRes.data?.status !== "success") {
		throw new ORPCError("BAD_REQUEST", {
			message: "cancelRule transaction not found or failed on-chain",
		});
	}

	const validator = fsPaymentValidatorAt(rule.validatorAddress);
	const rulesRes = await tryCatch(validator.read.rules([ruleId]));
	if (rulesRes.error || !rulesRes.data?.[8]) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Settlement rule is not cancelled on-chain",
		});
	}

	await markSettlementRuleCancelled(ruleId, input.cancelRuleTxHash);
	return { ok: true as const, onChainRuleId: input.onChainRuleId };
}
