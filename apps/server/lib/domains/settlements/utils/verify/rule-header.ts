import { throwAppError } from "@filosign/errors/server";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { SETTLEMENT_RELEASE_TYPE_UINT } from "@filosign/shared";
import type { Hex } from "viem";
import { getAddress } from "viem";
import type { fsPaymentValidatorAt } from "@/lib/platform/evm";
import { tryCatch } from "@/lib/platform/utils/tryCatch";
import { assertSettlementUsdcToken } from "../assert-settlement-token";

export type OnChainRuleHeader = readonly [
	unknown,
	`0x${string}`,
	Hex,
	number | bigint,
	Hex,
	number | bigint,
	number | bigint,
	boolean,
	boolean,
];

export async function readOnChainRuleHeader(args: {
	validator: ReturnType<typeof fsPaymentValidatorAt>;
	rule: SettlementRuleRegistrationInput;
	expectedCid: Hex;
}): Promise<OnChainRuleHeader> {
	const { validator, expectedCid, rule } = args;

	assertSettlementUsdcToken(rule.tokenAddress);

	if (rule.cidIdentifier.toLowerCase() !== expectedCid.toLowerCase()) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "Settlement rule cidIdentifier does not match document",
			},
		});
	}

	const ruleId = BigInt(rule.onChainRuleId);
	const readRes = await tryCatch(validator.read.rules([ruleId]));
	if (readRes.error || !readRes.data) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: `Settlement rule ${rule.onChainRuleId} not found on-chain`,
			},
		});
	}

	const header = readRes.data as OnChainRuleHeader;
	const [
		_payer,
		token,
		cidId,
		releaseType,
		_specificCommitment,
		_thresholdN,
		expiresAtOnChain,
		_executed,
		_cancelled,
	] = header;

	if (header[7] || header[8]) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: `Settlement rule ${rule.onChainRuleId} is not active on-chain`,
			},
		});
	}
	if (getAddress(token) !== getAddress(rule.tokenAddress)) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "On-chain token does not match submitted settlement rule",
			},
		});
	}
	if (cidId.toLowerCase() !== expectedCid.toLowerCase()) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "On-chain cidId does not match document",
			},
		});
	}
	if (Number(releaseType) !== SETTLEMENT_RELEASE_TYPE_UINT[rule.releaseType]) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason:
					"On-chain release type does not match submitted settlement rule",
			},
		});
	}

	const expectedExpires = rule.expiresAt ? BigInt(rule.expiresAt) : 0n;
	if (expiresAtOnChain !== expectedExpires) {
		throw throwAppError("SETTLEMENTS.VERIFICATION_FAILED", {
			params: {
				reason: "On-chain expiresAt does not match submitted settlement rule",
			},
		});
	}

	return header;
}
