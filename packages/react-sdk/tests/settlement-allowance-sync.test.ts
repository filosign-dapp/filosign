import { describe, expect, test } from "bun:test";
import { settlementAllowanceRequired } from "@filosign/shared";

const token = "0x0000000000000000000000000000000000000001";
const validator = "0x0000000000000000000000000000000000000002";

describe("settlement allowance sync scenarios", () => {
	test("increase on one rule raises combined required total", () => {
		const rules = [
			{
				onChainRuleId: "1",
				validatorAddress: validator,
				tokenAddress: token,
				status: "pending" as const,
				legs: [{ amount: "2000000" }],
			},
			{
				onChainRuleId: "2",
				validatorAddress: validator,
				tokenAddress: token,
				status: "ready" as const,
				legs: [{ amount: "3000000" }],
			},
		];

		const before = settlementAllowanceRequired(rules, {
			tokenAddress: token,
			validatorAddress: validator,
		});
		const after = settlementAllowanceRequired(rules, {
			tokenAddress: token,
			validatorAddress: validator,
			replaceRuleId: "1",
			legs: [{ amount: "6000000" }],
		});

		expect(before).toBe(5_000_000n);
		expect(after).toBe(9_000_000n);
	});

	test("cancel last active rule requires zero approval", () => {
		const rules = [
			{
				onChainRuleId: "1",
				validatorAddress: validator,
				tokenAddress: token,
				status: "pending" as const,
				legs: [{ amount: "2000000" }],
			},
		];

		expect(
			settlementAllowanceRequired(rules, {
				tokenAddress: token,
				validatorAddress: validator,
				excludeRuleId: "1",
			}),
		).toBe(0n);
	});
});
