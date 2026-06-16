import type { SettlementRuleStatus } from "@filosign/shared";
import type { Address } from "viem";
import {
	readPieceRelayerPin,
	writePieceRelayerPin,
} from "@/lib/domains/files/utils/relayer-pin";
import db from "@/lib/platform/db";
import type { fsPaymentValidatorAt } from "@/lib/platform/evm";
import {
	signalRelayerRelayFailover,
	withRelayerPoolFailover,
} from "@/lib/platform/evm/relay-failover";
import { withRelayerLock } from "@/lib/platform/evm/relayer-lock";
import { routeRelayerForPiece } from "@/lib/platform/evm/relayer-pool";
import { selectSettlementRule, settlementRuleWhere } from "../rule-lookup";
import { alertSettlementRelayPayoutFailed } from "./alerts";
import { executeSinglePayoutLeg, type LegExecutionResult } from "./payout-leg";
import { pollUntilRuleExecuted } from "./payout-readiness";

const { fileSettlementRules } = db.schema;

type PayoutRow = NonNullable<Awaited<ReturnType<typeof selectSettlementRule>>>;

const PAYOUT_FAILOVER_STATUSES = new Set<SettlementRuleStatus>([
	"failed_relay",
	"failed_insufficient",
]);

function isPayoutLegFailoverEligible(status: SettlementRuleStatus): boolean {
	return PAYOUT_FAILOVER_STATUSES.has(status);
}

type PayoutLegRunResult = {
	executed: boolean;
	partial?: boolean;
	txHash?: string;
	skipped?: string;
};

async function runPayoutLegsForRelayer(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	onChainRuleId: bigint;
	validatorAddress: Address;
	unpaidIndices: number[];
	row: PayoutRow;
	relayerAddress: Address;
}): Promise<PayoutLegRunResult> {
	return withRelayerLock(args.relayerAddress, async () => {
		let lastTxHash: `0x${string}` | undefined;
		let anyLegPaid = false;
		let lastFailureStatus: SettlementRuleStatus | undefined;
		let lastFailureMessage: string | undefined;

		const ruleWhere = settlementRuleWhere({
			validatorAddress: args.validatorAddress,
			onChainRuleId: args.onChainRuleId,
		});

		for (const legIndex of args.unpaidIndices) {
			const result: LegExecutionResult = await executeSinglePayoutLeg({
				onChainRuleId: args.onChainRuleId,
				validatorAddress: args.validatorAddress,
				legIndex,
				relayerAddress: args.relayerAddress,
			});

			if (result.kind === "failed") {
				lastFailureStatus = result.status;
				lastFailureMessage = result.message;
				if (!anyLegPaid && isPayoutLegFailoverEligible(result.status)) {
					signalRelayerRelayFailover(result.message);
				}
				continue;
			}
			if (result.kind === "skipped") continue;

			anyLegPaid = true;
			lastTxHash = result.txHash;
			if (result.executed) {
				return { executed: true, txHash: result.txHash };
			}
		}

		if (anyLegPaid) {
			const refreshed = await selectSettlementRule(
				args.onChainRuleId,
				args.validatorAddress,
			);
			if (refreshed?.status === "executed") {
				return { executed: true, txHash: lastTxHash };
			}

			const fullyPaid = await pollUntilRuleExecuted({
				validator: args.validator,
				onChainRuleId: args.onChainRuleId,
				validatorAddress: args.validatorAddress,
				legCount: args.row.legs.length,
			});
			if (fullyPaid) {
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
		if (!anyLegPaid && isPayoutLegFailoverEligible(status)) {
			signalRelayerRelayFailover(lastError);
		}

		await db
			.update(fileSettlementRules)
			.set({
				status,
				lastError,
				updatedAt: new Date(),
			})
			.where(ruleWhere);
		if (
			status === "failed_relay" ||
			status === "failed_insufficient" ||
			status === "failed_conditions"
		) {
			alertSettlementRelayPayoutFailed({
				onChainRuleId: args.onChainRuleId,
				pieceCid: args.row.pieceCid,
				status,
				error: lastError,
			});
		}
		return { executed: false, skipped: status };
	});
}

export async function executePayoutLegsUnderLock(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	onChainRuleId: bigint;
	validatorAddress: Address;
	unpaidIndices: number[];
	row: PayoutRow;
}): Promise<PayoutLegRunResult> {
	const pinnedRelayerAddress = await readPieceRelayerPin(args.row.pieceCid);
	const primary = routeRelayerForPiece({
		pieceCid: args.row.pieceCid,
		pinnedRelayerAddress,
	});

	const failover = await withRelayerPoolFailover({
		primary,
		step: "executePayoutLegs",
		context: { pieceCid: args.row.pieceCid },
		run: (member) =>
			runPayoutLegsForRelayer({
				...args,
				relayerAddress: member.address,
			}),
	});

	await writePieceRelayerPin(args.row.pieceCid, failover.relayer.address).catch(
		() => undefined,
	);

	return failover.result;
}
