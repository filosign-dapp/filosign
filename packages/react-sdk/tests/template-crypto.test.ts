import { describe, expect, it } from "bun:test";
import { encryption, KEM, randomBytes, toHex } from "@filosign/crypto-utils";
import { ORG_OMK_WRAP_INFO } from "@filosign/shared";
import { getAddress } from "viem";
import { setSessionSeed } from "../src/hooks/auth/session-seed";
import {
	decryptTemplateDekFromOrgHead,
	decryptTemplateDocument,
	encryptTemplateDocument,
	generateTemplateDek,
	wrapTemplateDekForOrg,
} from "../src/lib/template-crypto";

describe("template crypto", () => {
	it("roundtrips template document encryption", async () => {
		const templateId = "00000000-0000-7000-8000-000000000001";
		const docId = "doc-1";
		const dek = generateTemplateDek();
		const plaintext = new TextEncoder().encode("template pdf bytes");

		const ciphertext = await encryptTemplateDocument({
			dek,
			templateId,
			docId,
			bytes: plaintext,
		});
		const recovered = await decryptTemplateDocument({
			dek,
			templateId,
			docId,
			ciphertext,
		});

		expect(new TextDecoder().decode(recovered)).toBe("template pdf bytes");
	});

	it("roundtrips org-wrapped template DEK through member wrap", async () => {
		const userSeed = randomBytes(64);
		const userWallet = getAddress(`0x${"ab".repeat(20)}` as `0x${string}`);
		const { publicKey: userPublic } = await KEM.keyGen({ seed: userSeed });

		const omkSeed = randomBytes(64);
		const { publicKey: omkPublic } = await KEM.keyGen({ seed: omkSeed });
		const { ciphertext: wrapKemCiphertext, sharedSecret: ssUser } =
			await KEM.encapsulate({
				publicKeyOther: userPublic,
			});
		const wrappedOmk = await encryption.encrypt({
			message: omkSeed,
			secretKey: ssUser,
			info: ORG_OMK_WRAP_INFO,
		});

		const templateId = "00000000-0000-7000-8000-000000000002";
		const dek = generateTemplateDek();
		const wrapped = await wrapTemplateDekForOrg({
			dek,
			templateId,
			orgEncryptionPublicKey: toHex(omkPublic),
		});

		setSessionSeed(userWallet, userSeed);
		const recovered = await decryptTemplateDekFromOrgHead({
			templateId,
			headDekWrappedOmk: wrapped.encryptedDek,
			headOmkKemCiphertext: wrapped.kemCiphertext,
			wallet: userWallet,
			myWrap: {
				wrappedOmk: toHex(wrappedOmk),
				wrapKemCiphertext: toHex(wrapKemCiphertext),
			},
		});

		expect(recovered).toEqual(dek);
	});
});
