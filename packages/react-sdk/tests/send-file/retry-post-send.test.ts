import { describe, expect, mock, test } from "bun:test";
import { getAddress } from "viem";
import { retryPostSendSatellites } from "../../src/lib/send-file/retry-post-send";

const connected = getAddress("0x1111111111111111111111111111111111111111");
const cidIdentifier = `0x${"ab".repeat(32)}` as const;

const registerAttachmentRulesOnChain = mock(async () => [
	{
		packetId: "pkt-1",
		onChainRuleId: "1",
		releaseContractAddress: connected,
		registerRuleTxHash: `0x${"aa".repeat(32)}`,
	},
]);

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

mock.module("../../src/lib/register-attachment-rules.ts", () => ({
	registerAttachmentRulesOnChain,
}));

mock.module("../../src/lib/settlement-rules.ts", () => ({
	registerSettlementRulesOnChain,
}));

const linkOnChainRule = mock(async () => ({}));
const registerForFile = mock(async () => ({}));

const deps = {
	wallet: { account: { address: connected } },
	contracts: {} as never,
	chainKey: "local" as const,
	rpc: {
		attachments: { linkOnChainRule },
	},
	rpcQuery: {
		settlements: {
			registerForFile: { call: registerForFile },
		},
	},
	user: {} as never,
} as never;

const payload = {
	cidIdentifier,
	attachmentPacketDrafts: [
		{
			packetId: "pkt-1",
			releaseMode: "conditional" as const,
			releaseType: "all_signed" as const,
			recipientEmails: ["a@example.com"],
			files: [],
		},
	],
	attachmentPackets: [
		{
			packetId: "pkt-1",
			packetContentHash: `0x${"bb".repeat(32)}`,
		},
	],
	settlementRules: [
		{
			tokenAddress: connected,
			legs: [],
			releaseType: "all_signed" as const,
			releaseParams: { releaseType: "all_signed" as const },
		},
	],
	payoutPayerSource: "sender" as const,
} as never;

describe("retryPostSendSatellites", () => {
	test("retries only steps listed in incompleteSteps", async () => {
		registerAttachmentRulesOnChain.mockClear();
		registerSettlementRulesOnChain.mockClear();
		registerForFile.mockClear();

		const result = await retryPostSendSatellites({
			deps,
			pieceCid: "bafyabc",
			incompleteSteps: ["payout_registration"],
			payload,
		});

		expect(registerAttachmentRulesOnChain).toHaveBeenCalledTimes(0);
		expect(registerSettlementRulesOnChain).toHaveBeenCalledTimes(1);
		expect(registerForFile).toHaveBeenCalledTimes(1);
		expect(result.incompleteSteps).toEqual([]);
	});

	test("returns remaining incomplete steps when retry fails", async () => {
		registerSettlementRulesOnChain.mockImplementationOnce(async () => {
			throw new Error("delegation 401");
		});

		const result = await retryPostSendSatellites({
			deps,
			pieceCid: "bafyabc",
			incompleteSteps: ["payout_registration"],
			payload,
		});

		expect(result.incompleteSteps).toEqual(["payout_registration"]);
	});
});
