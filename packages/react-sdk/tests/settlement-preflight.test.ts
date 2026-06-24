import { describe, expect, test } from "bun:test";
import { ContractFunctionRevertedError } from "viem";
import { formatSettlementSimError } from "../src/lib/settlement-preflight";

describe("formatSettlementSimError", () => {
	test("maps known FSPaymentValidator revert names", () => {
		const revert = new ContractFunctionRevertedError({
			abi: [],
			functionName: "executePayout",
			message: "RuleNotExecutable()",
		});
		expect(formatSettlementSimError(revert)).toContain("isn't ready yet");
	});

	test("maps insufficient balance keywords", () => {
		expect(
			formatSettlementSimError(new Error("ERC20: insufficient allowance")),
		).toContain("Insufficient USDC");
	});

	test("falls back to message text", () => {
		expect(formatSettlementSimError(new Error("custom failure"))).toBe(
			"custom failure",
		);
	});

	test("maps thirdweb delegation 401 to wallet infra guidance", () => {
		expect(
			formatSettlementSimError(
				new Error("Failed to fetch delegation contract: 401"),
			),
		).toContain("thirdweb");
	});
});
