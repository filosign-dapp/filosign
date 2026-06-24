import { afterEach, describe, expect, mock, test } from "bun:test";
import type { Address } from "viem";

const relayRegisterEnvelopeAck = mock(() => Promise.resolve("0xhash" as const));

mock.module("@/lib/platform/evm", () => ({
	evmClient: { account: "0xrelayer" },
	fsEnvelopeRegistryAt: () => ({
		read: {
			boundSignerWallet: async () =>
				"0x0000000000000000000000000000000000000000" as Address,
			isSigner: async () => true,
		},
		simulate: {
			registerEnvelopeAck: async () => ({}),
		},
	}),
	relayRegisterEnvelopeAck,
}));

const { relayBoundSignerAckIfNeeded } = await import(
	"@/lib/domains/files/utils/sign/onchain-bind"
);

const baseArgs = {
	pieceCid: "bafytest",
	sender: "0x1111111111111111111111111111111111111111" as Address,
	signerWallet: "0x2222222222222222222222222222222222222222" as Address,
	signerEmailCommitment:
		"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`,
	authSubjectCommitment:
		"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as `0x${string}`,
	ackTimestamp: 1_700_000_000,
	ackSignature: "0xcccc" as `0x${string}`,
	registryAddress:
		"0x3333333333333333333333333333333333333333" as `0x${string}`,
};

describe("relayBoundSignerAckIfNeeded", () => {
	afterEach(() => {
		relayRegisterEnvelopeAck.mockClear();
	});

	test("skips on-chain relay when envelope is already complete", async () => {
		await relayBoundSignerAckIfNeeded({
			...baseArgs,
			envelopeComplete: true,
		});

		expect(relayRegisterEnvelopeAck).not.toHaveBeenCalled();
	});

	test("relays on-chain ack when envelope is still open", async () => {
		await relayBoundSignerAckIfNeeded({
			...baseArgs,
			envelopeComplete: false,
		});

		expect(relayRegisterEnvelopeAck).toHaveBeenCalledTimes(1);
	});
});
