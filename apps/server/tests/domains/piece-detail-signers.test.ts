import { describe, expect, test } from "bun:test";
import { restoreTestEnvMock } from "../support/env-stub";

restoreTestEnvMock();

import { buildPieceDetailSigners } from "@/lib/domains/files/utils/piece-detail/signers";

describe("buildPieceDetailSigners", () => {
	test("includes pending cold signer invites in the ordered roster", async () => {
		const signers = await buildPieceDetailSigners({
			participants: [
				{
					wallet: "0x0000000000000000000000000000000000000001",
					role: "signer",
					kemCiphertext: "0x01",
					encryptedEncryptionKey: "0x02",
					firstName: "Alice",
					lastName: null,
					email: "alice@example.com",
					username: null,
				},
			],
			sender: "0x00000000000000000000000000000000000000aa",
			manifestParsed: { success: false },
			senderEmail: null,
			coldSignerInvites: [
				{
					email: "cold@example.com",
					emailCommitment:
						"0x1234567890123456789012345678901234567890123456789012345678901234",
					claimedByWallet: null,
				},
			],
		});

		expect(signers).toHaveLength(2);
		expect(signers.some((signer) => signer.email === "cold@example.com")).toBe(
			true,
		);
		expect(
			signers.find((signer) => signer.email === "cold@example.com")
				?.invitePending,
		).toBe(true);
	});
});
