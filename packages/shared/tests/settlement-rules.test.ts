import { describe, expect, test } from "bun:test";
import {
	isSettlementRuleAllowanceActive,
	settlementAllowanceRequired,
} from "../utils/settlement-rules";

const token = "0x0000000000000000000000000000000000000001";
const validator = "0x0000000000000000000000000000000000000002";

const activeRule = {
	onChainRuleId: "1",
	validatorAddress: validator,
	tokenAddress: token,
	status: "pending" as const,
	legs: [{ amount: "2000000" }],
};

const secondRule = {
	onChainRuleId: "2",
	validatorAddress: validator,
	tokenAddress: token,
	status: "ready" as const,
	legs: [{ amount: "3000000" }],
};

describe("isSettlementRuleAllowanceActive", () => {
	test("active for pending and ready", () => {
		expect(isSettlementRuleAllowanceActive("pending")).toBe(true);
		expect(isSettlementRuleAllowanceActive("ready")).toBe(true);
	});

	test("inactive for executed, cancelled, and partial", () => {
		expect(isSettlementRuleAllowanceActive("executed")).toBe(false);
		expect(isSettlementRuleAllowanceActive("cancelled")).toBe(false);
		expect(isSettlementRuleAllowanceActive("partial")).toBe(false);
	});
});

describe("settlementAllowanceRequired", () => {
	test("sums active rules on the same token and validator", () => {
		expect(
			settlementAllowanceRequired([activeRule, secondRule], {
				tokenAddress: token,
				validatorAddress: validator,
			}),
		).toBe(5_000_000n);
	});

	test("ignores executed, cancelled, and partial rules", () => {
		expect(
			settlementAllowanceRequired(
				[
					activeRule,
					{ ...secondRule, status: "executed" },
					{ ...secondRule, onChainRuleId: "3", status: "cancelled" },
					{ ...secondRule, onChainRuleId: "4", status: "partial" },
				],
				{ tokenAddress: token, validatorAddress: validator },
			),
		).toBe(2_000_000n);
	});

	test("replaceRuleId previews updated legs", () => {
		expect(
			settlementAllowanceRequired([activeRule, secondRule], {
				tokenAddress: token,
				validatorAddress: validator,
				replaceRuleId: "1",
				legs: [{ amount: "5000000" }],
			}),
		).toBe(8_000_000n);
	});

	test("excludeRuleId omits a cancelled rule", () => {
		expect(
			settlementAllowanceRequired([activeRule, secondRule], {
				tokenAddress: token,
				validatorAddress: validator,
				excludeRuleId: "2",
			}),
		).toBe(2_000_000n);
	});

	test("filters by token and validator", () => {
		expect(
			settlementAllowanceRequired(
				[
					activeRule,
					{
						...secondRule,
						tokenAddress: "0x0000000000000000000000000000000000000099",
					},
				],
				{ tokenAddress: token, validatorAddress: validator },
			),
		).toBe(2_000_000n);
	});
});
