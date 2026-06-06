import type { SettlementRuleStatus } from "@filosign/shared";
import { evmClient, type fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { mapExecuteErrorToStatus } from "./execute-payout-alerts";
import { selectSettlementRule } from "./rule-lookup";
import { syncSettlementPayoutFromChain } from "./sync-from-chain";

type ExecutePayoutLegWrite = {
	executePayoutLeg: (args: readonly [bigint, bigint]) => Promise<`0x${string}`>;
};

export type LegExecutionResult =
	| { kind: "paid"; txHash: `0x${string}`; executed: boolean }
	| { kind: "failed"; status: SettlementRuleStatus; message: string }
	| { kind: "skipped" };

export async function executeSinglePayoutLeg(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	onChainRuleId: bigint;
	validatorAddress: `0x${string}`;
	legIndex: number;
}): Promise<LegExecutionResult> {
	const legIdx = BigInt(args.legIndex);
	const simRes = await tryCatch(
		args.validator.simulate.executePayoutLeg([args.onChainRuleId, legIdx], {
			account: evmClient.account,
		}),
	);
	if (simRes.error) {
		const lastError =
			simRes.error instanceof Error
				? simRes.error.message
				: "execute_leg_simulation_failed";
		return {
			kind: "failed",
			status: mapExecuteErrorToStatus(lastError),
			message: lastError,
		};
	}

	const writeValidator = args.validator.write as ExecutePayoutLegWrite;
	const txRes = await tryCatch(
		writeValidator.executePayoutLeg([args.onChainRuleId, legIdx]),
	);
	if (txRes.error) {
		const lastError =
			txRes.error instanceof Error ? txRes.error.message : "execute_leg_failed";
		return {
			kind: "failed",
			status: mapExecuteErrorToStatus(lastError),
			message: lastError,
		};
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
		return { kind: "failed", status: "failed_relay", message: lastError };
	}

	await syncSettlementPayoutFromChain(
		args.onChainRuleId,
		args.validatorAddress,
		txHash,
		args.legIndex,
	);

	const refreshed = await selectSettlementRule(
		args.onChainRuleId,
		args.validatorAddress,
	);
	return {
		kind: "paid",
		txHash,
		executed: refreshed?.status === "executed",
	};
}
