import { throwAppError } from "@filosign/errors/server";
import {
	firstSettlementLeg,
	settlementRuleTotalAmount,
} from "@filosign/shared";
import { and, eq, ne } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { getAddress, isHex } from "viem";
import db from "@/lib/platform/db";
import { fsPaymentValidatorAt } from "@/lib/platform/evm";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { tryExecuteSettlementPayout } from "./utils/execute/payout";
import { selectSettlementRule } from "./utils/rule-lookup";
import { settlementSchema } from "./utils/schema";
import { syncSettlementPayoutFromChain } from "./utils/sync-from-chain";

export {
	settlementsCancelRule,
	settlementsUpdateRule,
} from "./crud";
export {
	tryExecuteSettlementPayout,
	tryExecuteSettlementRulesForPiece,
} from "./utils/execute/payout";

async function assertCanSettleSettlementRule(
	userWallet: `0x${string}`,
	onChainRuleId: bigint,
	validatorAddress: Address,
) {
	const { files } = settlementSchema();
	const rule = await selectSettlementRule(
		onChainRuleId,
		getAddress(validatorAddress),
	);

	if (!rule) {
		throw throwAppError("SETTLEMENTS.RULE_NOT_FOUND");
	}

	const [file] = await db
		.select({ sender: files.sender })
		.from(files)
		.where(eq(files.pieceCid, rule.pieceCid))
		.limit(1);

	if (!file) {
		throw throwAppError("FILES.NOT_FOUND");
	}

	const wallet = userWallet.toLowerCase();
	const isSender = file.sender.toLowerCase() === wallet;
	const isRecipient = rule.legs.some(
		(leg) => leg.recipientWallet.toLowerCase() === wallet,
	);

	if (!isSender && !isRecipient) {
		throw throwAppError("SETTLEMENTS.FORBIDDEN");
	}

	return rule;
}

export async function settlementsListByFile(
	userWallet: `0x${string}`,
	pieceCid: string,
) {
	const { fileSettlementRules, files, fileParticipants } = settlementSchema();
	const rows = await db
		.select()
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.pieceCid, pieceCid));

	if (rows.length === 0) return [];

	const [file] = await db
		.select({ sender: files.sender })
		.from(files)
		.where(eq(files.pieceCid, pieceCid))
		.limit(1);

	if (!file) {
		throw throwAppError("FILES.NOT_FOUND");
	}

	const isSender = file.sender.toLowerCase() === userWallet.toLowerCase();
	const participants = await db
		.select({ wallet: fileParticipants.wallet })
		.from(fileParticipants)
		.where(eq(fileParticipants.filePieceCid, pieceCid));

	const canView =
		isSender ||
		participants.some(
			(p) => p.wallet.toLowerCase() === userWallet.toLowerCase(),
		);

	if (!canView) {
		throw throwAppError("SETTLEMENTS.FORBIDDEN");
	}

	return Promise.all(
		rows.map(async (r) => {
			let canExecuteOnChain: boolean | null = null;
			if (r.status !== "executed" && r.status !== "cancelled") {
				const validator = fsPaymentValidatorAt(r.validatorAddress);
				const res = await tryCatch(
					validator.read.canExecute([r.onChainRuleId]),
				);
				canExecuteOnChain = res.error ? null : res.data;
			}

			const topLeg = firstSettlementLeg(r.legs);

			return {
				id: r.id,
				onChainRuleId: r.onChainRuleId.toString(),
				legs: r.legs,
				recipientWallet: topLeg.recipientWallet,
				recipientSource: topLeg.recipientSource,
				amount: topLeg.amount,
				totalAmount: settlementRuleTotalAmount(r.legs).toString(),
				tokenAddress: r.tokenAddress,
				validatorAddress: r.validatorAddress,
				payerWallet: r.payerWallet,
				releaseType: r.releaseType,
				releaseParams: r.releaseParams,
				expiresAt: r.expiresAt ?? null,
				status: r.status,
				payoutTxHash: r.payoutTxHash ?? null,
				updateRuleTxHash: r.updateRuleTxHash ?? null,
				cancelRuleTxHash: r.cancelRuleTxHash ?? null,
				lastError: r.lastError ?? null,
				executedAt: r.executedAt?.toISOString() ?? null,
				canExecuteOnChain,
			};
		}),
	);
}

export async function settlementsTrySettle(
	userWallet: `0x${string}`,
	input: { onChainRuleId: string; validatorAddress: Address },
) {
	const ruleId = BigInt(input.onChainRuleId);
	const validatorAddress = getAddress(input.validatorAddress);
	const rule = await assertCanSettleSettlementRule(
		userWallet,
		ruleId,
		validatorAddress,
	);

	if (rule.status === "executed") {
		return {
			ok: true as const,
			onChainRuleId: input.onChainRuleId,
			payoutTxHash: rule.payoutTxHash,
			status: "executed" as const,
		};
	}
	if (rule.status === "cancelled") {
		throw throwAppError("SETTLEMENTS.RULE_MUTATION_NOT_ALLOWED");
	}

	const result = await tryExecuteSettlementPayout({
		onChainRuleId: ruleId,
		validatorAddress,
		pieceCid: rule.pieceCid,
	});

	const { fileSettlementRules } = settlementSchema();
	const [updated] = await db
		.select({
			status: fileSettlementRules.status,
			payoutTxHash: fileSettlementRules.payoutTxHash,
			lastError: fileSettlementRules.lastError,
		})
		.from(fileSettlementRules)
		.where(
			and(
				eq(fileSettlementRules.validatorAddress, validatorAddress),
				eq(fileSettlementRules.onChainRuleId, ruleId),
			),
		)
		.limit(1);

	if (result.executed) {
		return {
			ok: true as const,
			onChainRuleId: input.onChainRuleId,
			payoutTxHash: result.txHash ?? updated?.payoutTxHash ?? null,
			status: "executed" as const,
		};
	}

	if (result.partial || updated?.status === "partial") {
		return {
			ok: true as const,
			onChainRuleId: input.onChainRuleId,
			payoutTxHash: result.txHash ?? updated?.payoutTxHash ?? null,
			status: "partial" as const,
		};
	}

	throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
		params: {
			reason:
				updated?.lastError ??
				result.skipped ??
				"Settlement could not be executed",
		},
	});
}

export async function settlementsConfirmSettlement(
	userWallet: `0x${string}`,
	input: {
		onChainRuleId: string;
		validatorAddress: Address;
		payoutTxHash: Hex;
	},
) {
	const ruleId = BigInt(input.onChainRuleId);
	const validatorAddress = getAddress(input.validatorAddress);
	if (!isHex(input.payoutTxHash)) {
		throw throwAppError("SETTLEMENTS.INVALID_TX_HASH");
	}

	const rule = await assertCanSettleSettlementRule(
		userWallet,
		ruleId,
		validatorAddress,
	);

	if (rule.status === "executed") {
		return {
			ok: true as const,
			onChainRuleId: input.onChainRuleId,
			payoutTxHash: rule.payoutTxHash ?? input.payoutTxHash,
		};
	}

	const syncRes = await syncSettlementPayoutFromChain(
		ruleId,
		validatorAddress,
		input.payoutTxHash,
	);
	if (!syncRes.synced) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason:
					"No payout legs were executed on-chain yet. Confirm after a successful executePayoutLeg transaction.",
			},
		});
	}

	return {
		ok: true as const,
		onChainRuleId: input.onChainRuleId,
		payoutTxHash: input.payoutTxHash,
	};
}

export async function runSyncSettlementRulesJob(): Promise<{
	scanned: number;
	synced: number;
}> {
	const { fileSettlementRules } = settlementSchema();
	const rows = await db
		.select({
			onChainRuleId: fileSettlementRules.onChainRuleId,
			validatorAddress: fileSettlementRules.validatorAddress,
		})
		.from(fileSettlementRules)
		.where(
			and(
				ne(fileSettlementRules.status, "executed"),
				ne(fileSettlementRules.status, "cancelled"),
			),
		);

	let synced = 0;
	for (const row of rows) {
		const result = await syncSettlementPayoutFromChain(
			row.onChainRuleId,
			row.validatorAddress,
		);
		if (result.synced) {
			synced++;
			logger.info(
				{ onChainRuleId: row.onChainRuleId.toString() },
				"settlement payout synced from chain via daily cron",
			);
		}
	}

	return { scanned: rows.length, synced };
}
