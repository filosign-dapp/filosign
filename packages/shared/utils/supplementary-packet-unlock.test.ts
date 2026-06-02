import { describe, expect, test } from "bun:test";
import { supplementaryPacketUnlockSummary } from "./supplementary-packet-unlock";

describe("supplementaryPacketUnlockSummary", () => {
	test("review mode", () => {
		expect(supplementaryPacketUnlockSummary({ releaseMode: "review" })).toBe(
			"Available after the envelope is sent",
		);
	});

	test("conditional specific signer with email", async () => {
		const { hashNormalizedSignerEmail } = await import("./crypto");
		const { normalizePlacementRecipientEmail } = await import("./placement");
		const email = "signer@example.com";
		const commitment = hashNormalizedSignerEmail(
			normalizePlacementRecipientEmail(email),
		);
		expect(
			supplementaryPacketUnlockSummary({
				releaseMode: "conditional",
				releaseType: "specific_signer",
				releaseParams: { signerEmailCommitment: commitment },
				signerEmails: [email],
			}),
		).toBe("Unlocks when signer@example.com signs");
	});
});
