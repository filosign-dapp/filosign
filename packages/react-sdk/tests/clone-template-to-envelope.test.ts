import { describe, expect, it } from "bun:test";
import { encryption, KEM, randomBytes, toHex } from "@filosign/crypto-utils";
import { ORG_OMK_WRAP_INFO } from "@filosign/shared";
import { getAddress } from "viem";
import { setSessionSeed } from "../src/hooks/auth/session-seed";
import { cloneTemplateDocumentsToPlaintext } from "../src/lib/clone-template-to-envelope";
import {
	encryptTemplateDocument,
	generateTemplateDek,
	wrapTemplateDekForOrg,
} from "../src/lib/template-crypto";

describe("cloneTemplateDocumentsToPlaintext", () => {
	it("decrypts encrypted template documents from presigned download URLs", async () => {
		const userSeed = randomBytes(64);
		const userWallet = getAddress(`0x${"cd".repeat(20)}` as `0x${string}`);
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

		const templateId = "00000000-0000-7000-8000-000000000003";
		const docId = "doc-nda";
		const dek = generateTemplateDek();
		const wrapped = await wrapTemplateDekForOrg({
			dek,
			templateId,
			orgEncryptionPublicKey: toHex(omkPublic),
		});
		const plaintext = new TextEncoder().encode("nda bytes");
		const ciphertext = await encryptTemplateDocument({
			dek,
			templateId,
			docId,
			bytes: plaintext,
		});

		const originalFetch = globalThis.fetch;
		const mockFetch = async () =>
			new Response(new Uint8Array(ciphertext), {
				status: 200,
			});
		globalThis.fetch = mockFetch as unknown as typeof fetch;

		try {
			setSessionSeed(userWallet, userSeed);
			const files = await cloneTemplateDocumentsToPlaintext({
				templateId,
				headDekWrappedOmk: wrapped.encryptedDek,
				headOmkKemCiphertext: wrapped.kemCiphertext,
				wallet: userWallet,
				myOrgWrap: {
					wrappedOmk: toHex(wrappedOmk),
					wrapKemCiphertext: toHex(wrapKemCiphertext),
				},
				documents: [
					{
						docId,
						name: "nda.pdf",
						mimeType: "application/pdf",
						downloadUrl: "https://example.test/template-doc",
					},
				],
			});

			expect(files).toHaveLength(1);
			expect(files[0]?.name).toBe("nda.pdf");
			expect(
				new TextDecoder().decode(files[0]?.bytes ?? new Uint8Array()),
			).toBe("nda bytes");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
