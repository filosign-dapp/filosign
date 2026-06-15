import { describe, expect, test } from "bun:test";
import { getAddress } from "viem";
import { resolveRecipientWallets } from "../../src/lib/domains/templates/resolve-recipient-wallets";
import type { Recipient } from "../../src/routes/dashboard/envelope/create/-lib/types";

const SELF = getAddress("0x1111111111111111111111111111111111111111");
const OTHER = getAddress("0x2222222222222222222222222222222222222222");

function recipient(overrides: Partial<Recipient> = {}): Recipient {
	return {
		clientRowId: "row-1",
		name: "Signer",
		email: "signer@example.com",
		role: "signer",
		...overrides,
	};
}

describe("resolveRecipientWallets", () => {
	test("sets wallet from profile lookup", async () => {
		const resolved = await resolveRecipientWallets({
			recipients: [recipient({ email: "warm@example.com" })],
			lookupProfile: async (email) =>
				email === "warm@example.com" ? { walletAddress: OTHER } : null,
		});
		expect(resolved[0]?.walletAddress).toBe(OTHER);
	});

	test("leaves unknown email without wallet", async () => {
		const resolved = await resolveRecipientWallets({
			recipients: [recipient({ email: "cold@example.com" })],
			lookupProfile: async () => null,
		});
		expect(resolved[0]?.walletAddress).toBeUndefined();
	});

	test("uses self wallet when email matches self profile", async () => {
		const resolved = await resolveRecipientWallets({
			recipients: [recipient({ email: "me@example.com" })],
			lookupProfile: async () => {
				throw new Error("should not lookup");
			},
			selfEmail: "me@example.com",
			selfWallet: SELF,
		});
		expect(resolved[0]?.walletAddress).toBe(SELF);
	});

	test("does not change recipient that already has wallet", async () => {
		const resolved = await resolveRecipientWallets({
			recipients: [recipient({ walletAddress: OTHER })],
			lookupProfile: async () => ({ walletAddress: SELF }),
		});
		expect(resolved[0]?.walletAddress).toBe(OTHER);
	});
});
