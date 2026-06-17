import { describe, expect, test } from "bun:test";
import { getAddress } from "viem";
import { resolvePayoutPayerAddress } from "@/src/lib/domains/settlements/utils/resolve-payer-address";

const connected = getAddress("0x1111111111111111111111111111111111111111");
const treasury = getAddress("0x2222222222222222222222222222222222222222");

describe("resolvePayoutPayerAddress", () => {
	test("sender uses connected wallet", () => {
		expect(
			resolvePayoutPayerAddress({
				payoutPayerSource: "sender",
				connectedWalletAddress: connected,
				orgWalletAddress: treasury,
			}),
		).toBe(connected);
	});

	test("org_wallet uses treasury address", () => {
		expect(
			resolvePayoutPayerAddress({
				payoutPayerSource: "org_wallet",
				connectedWalletAddress: connected,
				orgWalletAddress: treasury,
			}),
		).toBe(treasury);
	});

	test("org_wallet with missing org address returns undefined", () => {
		expect(
			resolvePayoutPayerAddress({
				payoutPayerSource: "org_wallet",
				connectedWalletAddress: connected,
				orgWalletAddress: null,
			}),
		).toBeUndefined();
	});

	test("org_wallet with invalid org address returns undefined", () => {
		expect(
			resolvePayoutPayerAddress({
				payoutPayerSource: "org_wallet",
				connectedWalletAddress: connected,
				orgWalletAddress: "not-an-address",
			}),
		).toBeUndefined();
	});
});
