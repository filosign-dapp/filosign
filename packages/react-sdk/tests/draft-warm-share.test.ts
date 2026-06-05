import { describe, expect, it } from "bun:test";
import { KEM, randomBytes, toHex } from "@filosign/crypto-utils";
import { getAddress } from "viem";
import { setSessionSeed } from "../src/hooks/auth/session-seed";
import {
	buildWarmExternalShare,
	decryptDraftDekFromWarmShare,
	generateDraftDek,
} from "../src/lib/draft-crypto";

describe("warm draft external share", () => {
	it("roundtrips DEK through buildWarmExternalShare and decryptDraftDekFromWarmShare", async () => {
		const draftId = "11111111-1111-4111-8111-111111111111";
		const inviteToken = toHex(randomBytes(32));
		const dek = generateDraftDek();

		const recipientSeed = randomBytes(64);
		const recipientWallet = getAddress(`0x${"ab".repeat(20)}` as `0x${string}`);
		const { publicKey: recipientEncryptionPublicKey } = await KEM.keyGen({
			seed: recipientSeed,
		});

		const warm = await buildWarmExternalShare({
			dek,
			draftId,
			inviteToken,
			recipientEncryptionPublicKey: toHex(recipientEncryptionPublicKey),
			recipientWallet,
		});

		setSessionSeed(recipientWallet, recipientSeed);

		const recovered = await decryptDraftDekFromWarmShare({
			kemCiphertext: warm.kemCiphertext,
			encryptedDek: warm.encryptedDek,
			draftId,
			inviteToken,
			wallet: recipientWallet,
		});

		expect(recovered).toEqual(dek);
	});
});
