import { LOCAL_MOCK_USDC_ADDRESS } from "@filosign/contracts";
import { throwAppError } from "@filosign/errors/server";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { getAddress } from "viem";
import config from "@/config";

const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

function settlementUsdcTokenAddress(): `0x${string}` {
	if (config.chainKey === "local" && LOCAL_MOCK_USDC_ADDRESS) {
		return getAddress(LOCAL_MOCK_USDC_ADDRESS);
	}
	if (config.chainKey === "mainnet") {
		return getAddress(USDC_BASE_MAINNET);
	}
	return getAddress(USDC_BASE_SEPOLIA);
}

export function assertSettlementUsdcToken(tokenAddress: string) {
	const allowed = settlementUsdcTokenAddress();
	if (getAddress(tokenAddress) !== allowed) {
		throw throwAppError("SETTLEMENTS.TOKEN_NOT_SUPPORTED");
	}
}

export function assertSettlementRulesUsdcToken(
	rules: SettlementRuleRegistrationInput[],
) {
	for (const rule of rules) {
		assertSettlementUsdcToken(rule.tokenAddress);
	}
}
