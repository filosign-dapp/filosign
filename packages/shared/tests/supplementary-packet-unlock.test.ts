import { describe, expect, test } from "bun:test";
import { supplementaryPacketUnlockSummary } from "../utils/supplementary-packet-unlock";

describe("supplementaryPacketUnlockSummary", () => {
	test("review mode", () => {
		expect(supplementaryPacketUnlockSummary({ releaseMode: "review" })).toBe(
			"Available after the envelope is sent",
		);
	});

	test("conditional specific signer with email", async () => {
		const { hashNormalizedSignerEmail } = await import("../utils/crypto");
		const { normalizePlacementRecipientEmail } = await import(
			"../utils/placement"
		);
		const email = "signer@example.com";
		const commitment = hashNormalizedSignerEmail(
			normalizePlacementRecipientEmail(email),
		);
		expect(
			supplementaryPacketUnlockSummary({
				releaseMode: "conditional",
				releaseType: "specific_signer",
				releaseParams: {
					releaseType: "specific_signer",
					signerEmailCommitment: commitment,
				},
				signerEmails: [email],
			}),
		).toBe("Unlocks when signer@example.com signs");
	});
});
