import { and, eq } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress } from "viem";
import db from "@/lib/platform/db";

const { fileSettlementRules } = db.schema;

export function settlementRuleWhere(args: {
	validatorAddress: Address;
	onChainRuleId: bigint;
}) {
	return and(
		eq(fileSettlementRules.validatorAddress, getAddress(args.validatorAddress)),
		eq(fileSettlementRules.onChainRuleId, args.onChainRuleId),
	);
}

export async function selectSettlementRule(
	onChainRuleId: bigint,
	validatorAddress: Address,
) {
	const [row] = await db
		.select()
		.from(fileSettlementRules)
		.where(
			settlementRuleWhere({
				validatorAddress,
				onChainRuleId,
			}),
		)
		.limit(1);
	return row;
}
