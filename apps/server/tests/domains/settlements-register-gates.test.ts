import { describe, expect, test } from "bun:test";
import { LOCAL_MOCK_USDC_ADDRESS } from "@filosign/contracts";
import type { SettlementRuleRegistrationInput } from "@filosign/shared";
import { getAddress } from "viem";
import { assertSettlementRecipientsAllowlisted } from "@/lib/domains/settlements/settlements-register";
import { assertSettlementRulesUsdcToken } from "@/lib/domains/settlements/utils/assert-settlement-token";

const usdcToken = LOCAL_MOCK_USDC_ADDRESS
	? getAddress(LOCAL_MOCK_USDC_ADDRESS)
	: ("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const);

const participant = "0x1111111111111111111111111111111111111111" as const;

function rule(
	overrides: Partial<SettlementRuleRegistrationInput> = {},
): SettlementRuleRegistrationInput {
	return {
		onChainRuleId: "1",
		legs: [
			{
				recipientWallet: participant,
				recipientSource: "signer",
				amount: "1000000",
			},
		],
		tokenAddress: usdcToken,
		cidIdentifier:
			"0x0000000000000000000000000000000000000000000000000000000000000001",
		releaseType: "all_signed",
		releaseParams: { releaseType: "all_signed" },
		registerRuleTxHash:
			"0x0000000000000000000000000000000000000000000000000000000000000002",
		approveTxHash:
			"0x0000000000000000000000000000000000000000000000000000000000000003",
		...overrides,
	};
}

describe("settlements register gates", () => {
	test("rejects non-USDC token on local chain config", () => {
		expect(() =>
			assertSettlementRulesUsdcToken([
				rule({ tokenAddress: "0x0000000000000000000000000000000000000001" }),
			]),
		).toThrow();
	});

	test("rejects recipient not on envelope", async () => {
		await expect(
			assertSettlementRecipientsAllowlisted({
				participantWallets: [getAddress(participant)],
				rules: [
					rule({
						legs: [
							{
								recipientWallet: "0x2222222222222222222222222222222222222222",
								recipientSource: "signer",
								amount: "1",
							},
						],
					}),
				],
			}),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: expect.stringContaining("envelope"),
		});
	});
});
