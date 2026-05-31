import type {
	SettlementPayoutLegStored,
	SettlementRuleStatus,
} from "@filosign/shared";
import { settlementRuleTotalAmount } from "@filosign/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { Address } from "viem";
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
import { selectSettlementRule, settlementRuleWhere } from "./rule-lookup";
import { syncSettlementPayoutFromChain } from "./sync-from-chain";
import { listUnpaidSettlementLegIndices } from "./sync-legs-from-chain";

const { fileSettlementRules } = db.schema;

const EXECUTABLE_DB_STATUSES: SettlementRuleStatus[] = [
	"pending",
	"ready",
	"partial",
	"failed_insufficient",
	"failed_relay",
	"failed_conditions",
];

type ExecutePayoutLegWrite = {
	executePayoutLeg: (args: readonly [bigint, bigint]) => Promise<`0x${string}`>;
};

export async function tryExecuteSettlementPayout(args: {
	onChainRuleId: bigint;
	validatorAddress: Address;
}): Promise<{
	executed: boolean;
	partial?: boolean;
	txHash?: string;
	skipped?: string;
}> {
	const { onChainRuleId, validatorAddress } = args;
	const row = await selectSettlementRule(onChainRuleId, validatorAddress);

	if (!row) return { executed: false, skipped: "rule_not_indexed" };

	const ruleWhere = settlementRuleWhere({
		validatorAddress,
		onChainRuleId,
	});

	if (row.status === "executed") {
		return { executed: true, skipped: "already_executed" };
	}
	if (row.status === "cancelled") {
		return { executed: false, skipped: "cancelled" };
	}
	const validator = fsPaymentValidatorAt(validatorAddress);

	const executedOnChain = await tryCatch(validator.read.rules([onChainRuleId]));
	if (!executedOnChain.error && executedOnChain.data[8]) {
		await syncSettlementPayoutFromChain(onChainRuleId, validatorAddress);
		return { executed: false, skipped: "cancelled" };
	}
	if (!executedOnChain.error && executedOnChain.data[7]) {
		await syncSettlementPayoutFromChain(onChainRuleId, validatorAddress);
		return { executed: true, skipped: "already_executed_on_chain" };
	}

	const canRes = await tryCatch(validator.read.canExecute([onChainRuleId]));
	if (canRes.error || !canRes.data) {
		return { executed: false, skipped: "not_executable" };
	}

	const unpaidIndices = await listUnpaidSettlementLegIndices({
		validatorAddress,
		onChainRuleId,
		legCount: row.legs.length,
	});
	if (!unpaidIndices || unpaidIndices.length === 0) {
		await syncSettlementPayoutFromChain(onChainRuleId, validatorAddress);
		const refreshed = await selectSettlementRule(
			onChainRuleId,
			validatorAddress,
		);
		if (refreshed?.status === "executed") {
			return { executed: true, skipped: "already_executed_on_chain" };
		}
		return { executed: false, skipped: "no_unpaid_legs" };
	}

	const unpaidAmount = unpaidIndices.reduce((sum, index) => {
		const leg = row.legs[index] as SettlementPayoutLegStored | undefined;
		return leg ? sum + BigInt(leg.amount) : sum;
	}, 0n);

	const fundedRes = await tryCatch(
		payerCanFundSettlement({
			onChainRuleId,
			payer: getAddress(row.payerWallet),
			token: getAddress(row.tokenAddress),
			amount: unpaidAmount,
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
			.where(ruleWhere);
		return { executed: false, skipped: "insufficient_funds" };
	}

	const writeValidator = validator.write as ExecutePayoutLegWrite;
	let lastTxHash: `0x${string}` | undefined;
	let anyLegPaid = false;
	let lastFailureStatus: SettlementRuleStatus | undefined;
	let lastFailureMessage: string | undefined;

	for (const legIndex of unpaidIndices) {
		const legIdx = BigInt(legIndex);
		const simRes = await tryCatch(
			validator.simulate.executePayoutLeg([onChainRuleId, legIdx], {
				account: evmClient.account,
			}),
		);
		if (simRes.error) {
			const lastError =
				simRes.error instanceof Error
					? simRes.error.message
					: "execute_leg_simulation_failed";
			lastFailureStatus = mapExecuteErrorToStatus(lastError);
			lastFailureMessage = lastError;
			continue;
		}

		const txRes = await tryCatch(
			writeValidator.executePayoutLeg([onChainRuleId, legIdx]),
		);
		if (txRes.error) {
			const lastError =
				txRes.error instanceof Error
					? txRes.error.message
					: "execute_leg_failed";
			lastFailureStatus = mapExecuteErrorToStatus(lastError);
			lastFailureMessage = lastError;
			continue;
		}

		const txHash = txRes.data;
		const receiptRes = await tryCatch(
			evmClient.waitForTransactionReceipt({ hash: txHash }),
		);
		if (receiptRes.error || receiptRes.data.status !== "success") {
			const lastError = receiptRes.error
				? receiptRes.error instanceof Error
					? receiptRes.error.message
					: "receipt_wait_failed"
				: "payout_leg_tx_reverted";
			lastFailureStatus = "failed_relay";
			lastFailureMessage = lastError;
			continue;
		}

		anyLegPaid = true;
		lastTxHash = txHash;
		await syncSettlementPayoutFromChain(
			onChainRuleId,
			validatorAddress,
			txHash,
			legIndex,
		);

		const refreshed = await selectSettlementRule(
			onChainRuleId,
			validatorAddress,
		);
		if (refreshed?.status === "executed") {
			return { executed: true, txHash };
		}
	}

	if (anyLegPaid) {
		const refreshed = await selectSettlementRule(
			onChainRuleId,
			validatorAddress,
		);
		if (refreshed?.status === "executed") {
			return { executed: true, txHash: lastTxHash };
		}
		await db
			.update(fileSettlementRules)
			.set({
				status: "partial",
				lastError: lastFailureMessage ?? null,
				updatedAt: new Date(),
			})
			.where(ruleWhere);
		return { executed: false, partial: true, txHash: lastTxHash };
	}

	const status = lastFailureStatus ?? "failed_relay";
	const lastError = lastFailureMessage ?? "execute_failed";
	await db
		.update(fileSettlementRules)
		.set({
			status,
			lastError,
			updatedAt: new Date(),
		})
		.where(ruleWhere);
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

export async function tryExecuteSettlementRulesForPiece(pieceCid: string) {
	const rows = await db
		.select({
			onChainRuleId: fileSettlementRules.onChainRuleId,
			validatorAddress: fileSettlementRules.validatorAddress,
		})
		.from(fileSettlementRules)
		.where(
			and(
				eq(fileSettlementRules.pieceCid, pieceCid),
				inArray(fileSettlementRules.status, EXECUTABLE_DB_STATUSES),
			),
		);

	for (const row of rows) {
		const result = await tryExecuteSettlementPayout({
			onChainRuleId: row.onChainRuleId,
			validatorAddress: row.validatorAddress,
		});
		if ((result.executed || result.partial) && result.txHash) {
			logger.info(
				{
					pieceCid,
					onChainRuleId: row.onChainRuleId.toString(),
					txHash: result.txHash,
					partial: result.partial ?? false,
				},
				"settlement payout executed after sign",
			);
		}
	}
}
