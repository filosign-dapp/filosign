import type { SettlementRuleStatus } from "@filosign/shared";
import { and, eq, inArray } from "drizzle-orm";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { evmClient, fsPaymentValidatorAt } from "@/lib/platform/evm";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import {
	alertSettlementRelayPayoutFailed,
	mapExecuteErrorToStatus,
} from "./execute-payout-alerts";
import { payerCanFundSettlement } from "./preflight";
import { syncSettlementPayoutFromChain } from "./sync-from-chain";

const { fileSettlementRules } = db.schema;

const EXECUTABLE_DB_STATUSES: SettlementRuleStatus[] = [
	"pending",
	"ready",
	"failed_insufficient",
	"failed_relay",
	"failed_conditions",
];

export async function tryExecuteSettlementPayout(
	onChainRuleId: bigint,
): Promise<{ executed: boolean; txHash?: string; skipped?: string }> {
	const [row] = await db
		.select()
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId))
		.limit(1);

	if (!row) return { executed: false, skipped: "rule_not_indexed" };
	if (row.status === "executed") {
		return { executed: true, skipped: "already_executed" };
	}
	const validator = fsPaymentValidatorAt(row.validatorAddress);

	const validatorAddress = getAddress(validator.address);

	const executedOnChain = await tryCatch(validator.read.rules([onChainRuleId]));
	if (!executedOnChain.error && executedOnChain.data[8]) {
		await syncSettlementPayoutFromChain(
			onChainRuleId,
			undefined,
			row.validatorAddress,
		);
		return { executed: true, skipped: "already_executed_on_chain" };
	}

	const canRes = await tryCatch(validator.read.canExecute([onChainRuleId]));
	if (canRes.error || !canRes.data) {
		return { executed: false, skipped: "not_executable" };
	}

	const fundedRes = await tryCatch(
		payerCanFundSettlement({
			onChainRuleId,
			payer: getAddress(row.payerWallet),
			token: getAddress(row.tokenAddress),
			amount: BigInt(row.amount),
			validator: validatorAddress,
		}),
	);
	if (fundedRes.error || !fundedRes.data) {
		await db
			.update(fileSettlementRules)
			.set({
				status: "failed_insufficient",
				lastError: "insufficient_balance_or_allowance",
				updatedAt: new Date(),
			})
			.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId));
		return { executed: false, skipped: "insufficient_funds" };
	}

	const txRes = await tryCatch(
		(
			validator.write as {
				executePayout: (args: readonly [bigint]) => Promise<`0x${string}`>;
			}
		).executePayout([onChainRuleId]),
	);
	if (txRes.error) {
		const status = mapExecuteErrorToStatus(
			txRes.error instanceof Error ? txRes.error.message : "execute_failed",
		);
		const lastError =
			txRes.error instanceof Error ? txRes.error.message : "execute_failed";
		await db
			.update(fileSettlementRules)
			.set({
				status,
				lastError,
				updatedAt: new Date(),
			})
			.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId));
		if (status === "failed_relay") {
			alertSettlementRelayPayoutFailed({
				onChainRuleId,
				pieceCid: row.pieceCid,
				status,
				error: lastError,
			});
		}
		return { executed: false, skipped: status };
	}

	const txHash = txRes.data as `0x${string}`;
	const receiptRes = await tryCatch(
		evmClient.waitForTransactionReceipt({ hash: txHash }),
	);
	if (receiptRes.error || receiptRes.data.status !== "success") {
		const lastError = receiptRes.error
			? receiptRes.error instanceof Error
				? receiptRes.error.message
				: "receipt_wait_failed"
			: "payout_tx_reverted";
		await db
			.update(fileSettlementRules)
			.set({
				status: "failed_relay",
				lastError,
				updatedAt: new Date(),
			})
			.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId));
		alertSettlementRelayPayoutFailed({
			onChainRuleId,
			pieceCid: row.pieceCid,
			status: "failed_relay",
			error: lastError,
			txHash,
		});
		return { executed: false, skipped: "tx_reverted" };
	}

	await syncSettlementPayoutFromChain(
		onChainRuleId,
		txHash,
		row.validatorAddress,
	);
	return { executed: true, txHash };
}

export async function tryExecuteSettlementRulesForPiece(pieceCid: string) {
	const rows = await db
		.select({ onChainRuleId: fileSettlementRules.onChainRuleId })
		.from(fileSettlementRules)
		.where(
			and(
				eq(fileSettlementRules.pieceCid, pieceCid),
				inArray(fileSettlementRules.status, EXECUTABLE_DB_STATUSES),
			),
		);

	for (const row of rows) {
		const result = await tryExecuteSettlementPayout(row.onChainRuleId);
		if (result.executed && result.txHash) {
			logger.info(
				{
					pieceCid,
					onChainRuleId: row.onChainRuleId.toString(),
					txHash: result.txHash,
				},
				"settlement payout executed after sign",
			);
		}
	}
}
