import { describe, expect, test } from "bun:test";
import { formatGasSetupError } from "../src/lib/gas-setup-errors";

describe("formatGasSetupError", () => {
	test("maps insufficient funds for gas", () => {
		expect(
			formatGasSetupError(
				new Error("insufficient funds for gas * price + value"),
			),
		).toContain("Not enough ETH");
	});

	test("maps intrinsic gas errors", () => {
		expect(formatGasSetupError(new Error("intrinsic gas too low"))).toContain(
			"Not enough ETH",
		);
	});

	test("does not map USDC allowance errors", () => {
		expect(
			formatGasSetupError(new Error("ERC20: insufficient allowance")),
		).toBe(null);
	});

	test("returns null for unrelated errors", () => {
		expect(formatGasSetupError(new Error("custom failure"))).toBe(null);
	});
});
