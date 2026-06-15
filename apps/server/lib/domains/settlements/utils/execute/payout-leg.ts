import type { SettlementRuleStatus } from "@filosign/shared";
import {
	evmClient,
	type fsPaymentValidatorAt,
	waitForRelayReceipt,
} from "@/lib/platform/evm";
import { relayWrite } from "@/lib/platform/evm/relay-write";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { selectSettlementRule } from "../rule-lookup";
import { syncSettlementPayoutFromChain } from "../sync-from-chain";
import { mapExecuteErrorToStatus } from "./alerts";
import { resolveLegPayoutExecuted } from "./payout-readiness";

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
		relayWrite({
			step: "executePayoutLeg",
			write: () =>
				writeValidator.executePayoutLeg([args.onChainRuleId, legIdx]),
			waitForReceipt: waitForRelayReceipt,
		}),
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

	await syncSettlementPayoutFromChain(
		args.onChainRuleId,
		args.validatorAddress,
		txHash,
		args.legIndex,
	);

	const row = await selectSettlementRule(
		args.onChainRuleId,
		args.validatorAddress,
	);
	const executed = await resolveLegPayoutExecuted({
		validator: args.validator,
		onChainRuleId: args.onChainRuleId,
		validatorAddress: args.validatorAddress,
		legCount: row?.legs.length ?? 1,
	});

	return {
		kind: "paid",
		txHash,
		executed,
	};
}
