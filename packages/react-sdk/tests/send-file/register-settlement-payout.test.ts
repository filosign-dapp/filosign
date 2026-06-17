import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAddress } from "viem";
import { registerSettlementRulesForFile } from "../../src/lib/send-file/register-post-send";

const connected = getAddress("0x1111111111111111111111111111111111111111");
const treasury = getAddress("0x2222222222222222222222222222222222222222");
const cidIdentifier = `0x${"ab".repeat(32)}` as const;

const registerSettlementRulesOnChain = mock(async () => [
	{
		onChainRuleId: "1",
		legs: [],
		tokenAddress: connected,
		cidIdentifier,
		releaseType: "all_signed" as const,
		releaseParams: { releaseType: "all_signed" as const },
		registerRuleTxHash: `0x${"cd".repeat(32)}`,
	},
]);

mock.module("../../src/lib/settlement-rules.ts", () => ({
	registerSettlementRulesOnChain,
}));

const deps = {
	wallet: { account: { address: connected } },
	contracts: {} as never,
	chainKey: "local" as const,
	rpc: {} as never,
	rpcQuery: {
		settlements: {
			registerForFile: {
				call: mock(async () => ({})),
			},
		},
	},
	user: {} as never,
} as never;

describe("registerSettlementRulesForFile treasury payer", () => {
	test("org_wallet without settlementPayerAddress throws", async () => {
		await expect(
			registerSettlementRulesForFile({
				deps,
				pieceCid: "bafyabc",
				cidIdentifier,
				settlementRules: [
					{
						tokenAddress: connected,
						legs: [],
						releaseType: "all_signed",
						releaseParams: { releaseType: "all_signed" },
					},
				] as never,
				payoutPayerSource: "org_wallet",
				registerSettlementRules: mock(async () => []),
			}),
		).rejects.toThrow("Workspace treasury address is required");
	});

	test("org_wallet without registerSettlementRules throws", async () => {
		await expect(
			registerSettlementRulesForFile({
				deps,
				pieceCid: "bafyabc",
				cidIdentifier,
				settlementRules: [
					{
						tokenAddress: connected,
						legs: [],
						releaseType: "all_signed",
						releaseParams: { releaseType: "all_signed" },
					},
				] as never,
				payoutPayerSource: "org_wallet",
				settlementPayerAddress: treasury,
			}),
		).rejects.toThrow(
			"Treasury payout registration requires treasury wallet execution flow",
		);
	});

	test("org_wallet does not call registerSettlementRulesOnChain", async () => {
		registerSettlementRulesOnChain.mockClear();
		const treasuryRegistrar = mock(async () => [
			{
				onChainRuleId: "2",
				legs: [],
				tokenAddress: treasury,
				cidIdentifier,
				releaseType: "all_signed" as const,
				releaseParams: { releaseType: "all_signed" as const },
				registerRuleTxHash: `0x${"ef".repeat(32)}`,
				approveTxHash: `0x${"12".repeat(32)}`,
			},
		]) as never;

		await registerSettlementRulesForFile({
			deps,
			pieceCid: "bafyabc",
			cidIdentifier,
			settlementRules: [
				{
					tokenAddress: treasury,
					legs: [],
					releaseType: "all_signed",
					releaseParams: { releaseType: "all_signed" },
				},
			] as never,
			payoutPayerSource: "org_wallet",
			settlementPayerAddress: treasury,
			registerSettlementRules: treasuryRegistrar,
		});

		expect(registerSettlementRulesOnChain).not.toHaveBeenCalled();
		expect(treasuryRegistrar).toHaveBeenCalled();
	});

	test("attach hook supports org_wallet payer and treasury registrar", () => {
		const src = readFileSync(
			join(
				import.meta.dir,
				"../../src/hooks/files/useAttachSettlementForFile.ts",
			),
			"utf8",
		);
		expect(src).toContain('payoutPayerSource?: "sender" | "org_wallet"');
		expect(src).toContain(
			'registerSettlementRules?: SendFileArgs["registerSettlementRules"]',
		);
		expect(src).toContain(
			"Treasury payout registration requires treasury wallet execution flow.",
		);
		expect(src).toContain(
			"const payer = args.settlementPayerAddress ?? wallet.account.address;",
		);
	});
});
