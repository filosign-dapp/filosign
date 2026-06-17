import { describe, expect, test } from "bun:test";
import { getAddress } from "viem";
import { settlementRulePayerAddress } from "../src/lib/settlement-rules";

const connected = getAddress("0x1111111111111111111111111111111111111111");
const treasury = getAddress("0x2222222222222222222222222222222222222222");

describe("settlementRulePayerAddress", () => {
	test("uses rule payerWallet when present", () => {
		expect(
			settlementRulePayerAddress(
				{
					payerWallet: treasury,
				} as Parameters<typeof settlementRulePayerAddress>[0],
				connected,
			),
		).toBe(treasury);
	});

	test("falls back to connected wallet when payerWallet missing", () => {
		expect(
			settlementRulePayerAddress(
				{} as Parameters<typeof settlementRulePayerAddress>[0],
				connected,
			),
		).toBe(connected);
	});
});
