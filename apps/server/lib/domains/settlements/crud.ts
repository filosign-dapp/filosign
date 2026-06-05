import { throwAppError } from "@filosign/errors/server";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import {
	settlementRuleTotalAmount,
	zSettlementRuleCancelInput,
	zSettlementRuleUpdateInput,
} from "@filosign/shared";
import { eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import { MAX_SETTLEMENT_LEGS_PRODUCT } from "@/constants";
import { resolveEntitlementContext } from "@/lib/domains/entitlements";
import db from "@/lib/platform/db";
import { evmClient, fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { throwZodBadRequest } from "@/lib/platform/utils/zodHttp";
import { assertSettlementRecipientsAllowlisted } from "./register";
import {
	markSettlementRuleCancelled,
	markSettlementRuleUpdated,
} from "./utils/db-sync";
import {
	assertSettlementRuleEntitlements,
	assertSettlementUpdateEntitlements,
} from "./utils/entitlements";
import { selectSettlementRule } from "./utils/rule-lookup";
import { assertSettlementRuleUpdateOnChain } from "./utils/verify-rules-on-chain";

const { files, fileParticipants } = db.schema;

async function loadPayerRule(
	sender: Address,
	onChainRuleId: bigint,
	validatorAddress: Address,
) {
	const rule = await selectSettlementRule(
		onChainRuleId,
		getAddress(validatorAddress),
	);
	if (!rule) {
		throw throwAppError("SETTLEMENTS.RULE_NOT_FOUND");
	}
	if (getAddress(rule.payerWallet) !== getAddress(sender)) {
		throw throwAppError("SETTLEMENTS.FORBIDDEN");
	}
	if (rule.status === "executed" || rule.status === "cancelled") {
		throw throwAppError("SETTLEMENTS.RULE_MUTATION_NOT_ALLOWED");
	}
	return rule;
}

export async function settlementsUpdateRule(sender: Address, rawBody: unknown) {
	const parsed = zSettlementRuleUpdateInput.safeParse(rawBody);
	if (!parsed.success) {
		throw throwZodBadRequest(parsed.error);
	}
	const input = parsed.data;
	const ruleId = BigInt(input.onChainRuleId);
	const rule = await loadPayerRule(sender, ruleId, input.validatorAddress);

	if (input.legs.length > MAX_SETTLEMENT_LEGS_PRODUCT) {
		throw throwAppError("ENTITLEMENT.LIMIT_EXCEEDED");
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
	await assertSettlementUpdateEntitlements(
		entitlementCtx,
		file?.organizationId ?? null,
		getAddress(sender),
	);

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
	await assertSettlementRuleEntitlements(
		entitlementCtx,
		registrationRule,
		file?.organizationId ?? null,
		getAddress(sender),
	);

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
		throw throwAppError("SETTLEMENTS.INVALID_PAYOUT_TOTAL");
	}

	await markSettlementRuleUpdated({
		onChainRuleId: ruleId,
		validatorAddress: getAddress(rule.validatorAddress),
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
		throw throwZodBadRequest(parsed.error);
	}
	const input = parsed.data;
	const ruleId = BigInt(input.onChainRuleId);
	const rule = await loadPayerRule(sender, ruleId, input.validatorAddress);

	const receiptRes = await tryCatch(
		evmClient.waitForTransactionReceipt({ hash: input.cancelRuleTxHash }),
	);
	if (receiptRes.error || receiptRes.data?.status !== "success") {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "cancelRule transaction not found or failed on-chain",
			},
		});
	}

	const validator = fsPaymentValidatorAt(rule.validatorAddress);
	const rulesRes = await tryCatch(validator.read.rules([ruleId]));
	if (rulesRes.error || !rulesRes.data?.[8]) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "Settlement rule is not cancelled on-chain",
			},
		});
	}

	await markSettlementRuleCancelled({
		onChainRuleId: ruleId,
		validatorAddress: getAddress(rule.validatorAddress),
		cancelRuleTxHash: input.cancelRuleTxHash,
	});
	return { ok: true as const, onChainRuleId: input.onChainRuleId };
}
