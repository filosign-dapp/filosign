import { describe, expect, it } from "bun:test";
import { getAddress } from "viem";
import { resolveSignerEmailForSigning } from "../src/lib/resolve-signer-email-for-signing";

const sender = getAddress("0x1111111111111111111111111111111111111111");
const other = getAddress("0x2222222222222222222222222222222222222222");

describe("resolveSignerEmailForSigning", () => {
	it("uses roster signer email when present", () => {
		expect(
			resolveSignerEmailForSigning({
				signerWallet: other,
				senderWallet: sender,
				fileSigners: [{ wallet: other, email: "signer@example.com" }],
				profileEmail: "profile@example.com",
				manifestAssignedEmails: ["signer@example.com"],
			}),
		).toBe("signer@example.com");
	});

	it("falls back to profile email for sender with manifest fields", () => {
		expect(
			resolveSignerEmailForSigning({
				signerWallet: sender,
				senderWallet: sender,
				fileSigners: [],
				profileEmail: "Me@example.com",
				manifestAssignedEmails: ["me@example.com"],
			}),
		).toBe("me@example.com");
	});

	it("returns null for sender without manifest-assigned profile email", () => {
		expect(
			resolveSignerEmailForSigning({
				signerWallet: sender,
				senderWallet: sender,
				fileSigners: [],
				profileEmail: "me@example.com",
				manifestAssignedEmails: ["other@example.com"],
			}),
		).toBeNull();
	});
});
