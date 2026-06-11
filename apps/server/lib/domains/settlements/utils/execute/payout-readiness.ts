import type { Address } from "viem";
import type { fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { selectSettlementRule } from "../rule-lookup";
import { syncSettlementPayoutFromChain } from "../sync-from-chain";
import {
	readSettlementLegPaidFlags,
	settlementPaidLegCount,
} from "../sync-legs-from-chain";

const DEFAULT_POLL_ATTEMPTS = 3;
const DEFAULT_POLL_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SettlementPayoutRetryableError extends Error {
	constructor(
		public readonly reason: string,
		public readonly pieceCid: string,
	) {
		super(`settlement payout retryable: ${reason}`);
		this.name = "SettlementPayoutRetryableError";
	}
}

export function isRetryablePayoutSkip(
	skip: string | undefined,
	result: { partial?: boolean; executed?: boolean },
): boolean {
	if (result.partial) return true;
	if (!skip) return false;
	if (skip === "not_executable") return true;
	if (skip === "failed_relay" || skip === "failed_conditions") return true;
	return false;
}

export async function pollCanExecute(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	onChainRuleId: bigint;
	attempts?: number;
	delayMs?: number;
}): Promise<boolean> {
	const { validator, onChainRuleId } = args;
	const attempts = args.attempts ?? DEFAULT_POLL_ATTEMPTS;
	const delayMs = args.delayMs ?? DEFAULT_POLL_DELAY_MS;

	for (let i = 0; i < attempts; i++) {
		const canRes = await tryCatch(validator.read.canExecute([onChainRuleId]));
		if (!canRes.error && canRes.data) return true;
		if (i < attempts - 1) await sleep(delayMs);
	}
	return false;
}

/** After a leg receipt, sync and poll until the rule is fully executed on chain. */
export async function resolveLegPayoutExecuted(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	onChainRuleId: bigint;
	validatorAddress: Address;
	legCount: number;
}): Promise<boolean> {
	const refreshed = await selectSettlementRule(
		args.onChainRuleId,
		args.validatorAddress,
	);
	if (refreshed?.status === "executed") return true;
	return pollUntilRuleExecuted(args);
}

export async function pollUntilRuleExecuted(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	onChainRuleId: bigint;
	validatorAddress: Address;
	legCount: number;
	attempts?: number;
	delayMs?: number;
}): Promise<boolean> {
	const { validator, onChainRuleId, validatorAddress, legCount } = args;
	const attempts = args.attempts ?? DEFAULT_POLL_ATTEMPTS;
	const delayMs = args.delayMs ?? DEFAULT_POLL_DELAY_MS;

	for (let i = 0; i < attempts; i++) {
		await syncSettlementPayoutFromChain(onChainRuleId, validatorAddress);

		const refreshed = await selectSettlementRule(
			onChainRuleId,
			validatorAddress,
		);
		if (refreshed?.status === "executed") return true;

		const paidFlags = await readSettlementLegPaidFlags({
			validator,
			onChainRuleId,
			legCount,
		});
		if (
			paidFlags &&
			settlementPaidLegCount(paidFlags) === legCount &&
			legCount > 0
		) {
			await syncSettlementPayoutFromChain(onChainRuleId, validatorAddress);
			const afterSync = await selectSettlementRule(
				onChainRuleId,
				validatorAddress,
			);
			if (afterSync?.status === "executed") return true;
		}

		if (i < attempts - 1) await sleep(delayMs);
	}
	return false;
}
