import type { SettlementPayoutLegStored } from "@filosign/shared";
import type { Address } from "viem";
import { fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";

type ValidatorRead = ReturnType<typeof fsPaymentValidatorAt>["read"];

export async function readSettlementLegPaidFlags(args: {
	validator: { read: ValidatorRead };
	onChainRuleId: bigint;
	legCount: number;
}): Promise<boolean[] | null> {
	const { validator, onChainRuleId, legCount } = args;
	const flags: boolean[] = [];
	for (let i = 0; i < legCount; i++) {
		const res = await tryCatch(
			validator.read.isLegPaid([onChainRuleId, BigInt(i)]),
		);
		if (res.error) return null;
		flags.push(res.data);
	}
	return flags;
}

export function mergeSettlementLegsWithPaidFlags(
	legs: readonly SettlementPayoutLegStored[],
	paidFlags: readonly boolean[],
): SettlementPayoutLegStored[] {
	return legs.map((leg, index) => {
		const paid = paidFlags[index] ?? false;
		if (!paid) {
			const { paid: _p, payoutTxHash: _h, ...rest } = leg;
			return rest;
		}
		return { ...leg, paid: true };
	});
}

export function settlementPaidLegCount(paidFlags: readonly boolean[]): number {
	return paidFlags.filter(Boolean).length;
}

export function settlementLegCountFromFlags(
	paidFlags: readonly boolean[],
): number {
	return paidFlags.length;
}

export async function listUnpaidSettlementLegIndices(args: {
	validatorAddress: Address;
	onChainRuleId: bigint;
	legCount: number;
}): Promise<number[] | null> {
	const validator = fsPaymentValidatorAt(args.validatorAddress);
	const flags = await readSettlementLegPaidFlags({
		validator,
		onChainRuleId: args.onChainRuleId,
		legCount: args.legCount,
	});
	if (!flags) return null;
	return flags.flatMap((paid, index) => (paid ? [] : [index]));
}
