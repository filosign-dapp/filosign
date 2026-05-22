import type { SettlementRuleStatus } from "@filosign/shared";
import { and, eq, inArray } from "drizzle-orm";
import { getAddress } from "viem";
import db from "@/lib/platform/db";
import { evmClient, fsContracts } from "@/lib/platform/evm";
import { logger } from "@/lib/platform/pino";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
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

function mapExecuteErrorToStatus(message: string): SettlementRuleStatus {
	const lower = message.toLowerCase();
	if (
		lower.includes("insufficient") ||
		lower.includes("allowance") ||
		lower.includes("transfer") ||
		lower.includes("balance")
	) {
		return "failed_insufficient";
	}
	if (lower.includes("not executable") || lower.includes("conditions")) {
		return "failed_conditions";
	}
	return "failed_relay";
}

export async function tryExecuteSettlementPayout(
	onChainRuleId: bigint,
): Promise<{ executed: boolean; txHash?: string; skipped?: string }> {
	const validator = fsContracts.FSPaymentValidator;
	if (!validator) {
		return { executed: false, skipped: "validator_not_deployed" };
	}

	const [row] = await db
		.select()
		.from(fileSettlementRules)
		.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId))
		.limit(1);

	if (!row) return { executed: false, skipped: "rule_not_indexed" };
	if (row.status === "executed") {
		return { executed: true, skipped: "already_executed" };
	}

	const validatorAddress = getAddress(validator.address);

	const executedOnChain = await tryCatch(validator.read.rules([onChainRuleId]));
	if (!executedOnChain.error && executedOnChain.data[8]) {
		await syncSettlementPayoutFromChain(onChainRuleId);
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

	const txRes = await tryCatch(validator.write.executePayout([onChainRuleId]));
	if (txRes.error) {
		const status = mapExecuteErrorToStatus(
			txRes.error instanceof Error ? txRes.error.message : "execute_failed",
		);
		await db
			.update(fileSettlementRules)
			.set({
				status,
				lastError:
					txRes.error instanceof Error ? txRes.error.message : "execute_failed",
				updatedAt: new Date(),
			})
			.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId));
		return { executed: false, skipped: status };
	}

	const txHash = txRes.data as `0x${string}`;
	const receiptRes = await tryCatch(
		evmClient.waitForTransactionReceipt({ hash: txHash }),
	);
	if (receiptRes.error || receiptRes.data.status !== "success") {
		await db
			.update(fileSettlementRules)
			.set({
				status: "failed_relay",
				lastError: "payout_tx_reverted",
				updatedAt: new Date(),
			})
			.where(eq(fileSettlementRules.onChainRuleId, onChainRuleId));
		return { executed: false, skipped: "tx_reverted" };
	}

	await syncSettlementPayoutFromChain(onChainRuleId, txHash);
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
