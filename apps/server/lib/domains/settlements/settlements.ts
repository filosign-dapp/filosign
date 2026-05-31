import {
	settlementRuleLegacyTopLevel,
	settlementRuleTotalAmount,
} from "@filosign/shared";
import { ORPCError } from "@orpc/server";
import { and, eq, ne } from "drizzle-orm";
import type { Hex } from "viem";
import { isHex } from "viem";
import db from "@/lib/platform/db";
import { fsPaymentValidatorAt } from "@/lib/platform/evm";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { tryExecuteSettlementPayout } from "./utils/execute-payout";
import { syncSettlementPayoutFromChain } from "./utils/sync-from-chain";

const { fileSettlementRules, files, fileParticipants } = db.schema;

export {
	settlementsCancelRule,
	settlementsUpdateRule,
} from "./settlements-crud";
export {
	tryExecuteSettlementPayout,
	tryExecuteSettlementRulesForPiece,
} from "./utils/execute-payout";

async function assertCanSettleSettlementRule(
	userWallet: `0x${string}`,
	onChainRuleId: bigint,
) {
	const [rule] = await db
		.select()
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId))
		.limit(1);

	if (!rule) {
		throw new ORPCError("NOT_FOUND", { message: "Settlement rule not found" });
	}

	const [file] = await db
		.select({ sender: files.sender })
		.from(files)
		.where(eq(files.pieceCid, rule.pieceCid))
		.limit(1);

	if (!file) {
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
	}

	const wallet = userWallet.toLowerCase();
	const isSender = file.sender.toLowerCase() === wallet;
	const isRecipient = rule.legs.some(
		(leg) => leg.recipientWallet.toLowerCase() === wallet,
	);

	if (!isSender && !isRecipient) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only the sender or payout recipient can settle this rule",
		});
	}

	return rule;
}

export async function settlementsListByFile(
	userWallet: `0x${string}`,
	pieceCid: string,
) {
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
		throw new ORPCError("NOT_FOUND", { message: "File not found" });
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
		throw new ORPCError("FORBIDDEN", {
			message: "Not allowed to view payouts",
		});
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

			const legacyTopLevel = settlementRuleLegacyTopLevel(r.legs);

			return {
				id: r.id,
				onChainRuleId: r.onChainRuleId.toString(),
				legs: r.legs,
				recipientWallet: legacyTopLevel.recipientWallet,
				recipientSource: legacyTopLevel.recipientSource,
				amount: legacyTopLevel.amount,
				totalAmount: settlementRuleTotalAmount(r.legs).toString(),
				tokenAddress: r.tokenAddress,
				validatorAddress: r.validatorAddress,
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
	input: { onChainRuleId: string },
) {
	const ruleId = BigInt(input.onChainRuleId);
	const rule = await assertCanSettleSettlementRule(userWallet, ruleId);

	if (rule.status === "executed") {
		return {
			ok: true as const,
			onChainRuleId: input.onChainRuleId,
			payoutTxHash: rule.payoutTxHash,
			status: "executed" as const,
		};
	}
	if (rule.status === "cancelled") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Settlement rule was cancelled",
		});
	}

	const result = await tryExecuteSettlementPayout(ruleId);

	const [updated] = await db
		.select({
			status: fileSettlementRules.status,
			payoutTxHash: fileSettlementRules.payoutTxHash,
			lastError: fileSettlementRules.lastError,
		})
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.onChainRuleId, ruleId))
		.limit(1);

	if (result.executed) {
		return {
			ok: true as const,
			onChainRuleId: input.onChainRuleId,
			payoutTxHash: result.txHash ?? updated?.payoutTxHash ?? null,
			status: "executed" as const,
		};
	}

	throw new ORPCError("BAD_REQUEST", {
		message:
			updated?.lastError ??
			result.skipped ??
			"Settlement could not be executed",
	});
}

export async function settlementsConfirmSettlement(
	userWallet: `0x${string}`,
	input: { onChainRuleId: string; payoutTxHash: Hex },
) {
	const ruleId = BigInt(input.onChainRuleId);
	if (!isHex(input.payoutTxHash)) {
		throw new ORPCError("BAD_REQUEST", { message: "Invalid transaction hash" });
	}

	const rule = await assertCanSettleSettlementRule(userWallet, ruleId);

	if (rule.status === "executed") {
		return {
			ok: true as const,
			onChainRuleId: input.onChainRuleId,
			payoutTxHash: rule.payoutTxHash ?? input.payoutTxHash,
		};
	}

	const syncRes = await syncSettlementPayoutFromChain(
		ruleId,
		input.payoutTxHash,
		rule.validatorAddress,
	);
	if (!syncRes.synced) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Payout was not executed on-chain",
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
			undefined,
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
