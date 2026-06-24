import { describe, expect, mock, test } from "bun:test";

const preparePieceCryptoMock = mock(async () => ({
	timestamp: 1,
	documentSha256: `0x${"aa".repeat(32)}`,
	encryptedData: new Uint8Array([1, 2, 3]),
	pieceCid: { toString: () => "bafyresume" },
	encryptionKey: new Uint8Array(32),
	participants: [],
	selfKemCiphertext: new Uint8Array(8),
	selfEncryptedEncryptionKey: new Uint8Array(8),
}));

mock.module("../../src/lib/send-file/prepare-piece-crypto.ts", () => ({
	preparePieceCrypto: preparePieceCryptoMock,
}));

describe("sendFile resume", () => {
	test("skips preparePieceCrypto when resume.preparedPiece is provided", async () => {
		preparePieceCryptoMock.mockClear();

		const cachedPiece = {
			timestamp: 42,
			documentSha256: `0x${"bb".repeat(32)}`,
			encryptedData: new Uint8Array([9, 9, 9]),
			pieceCid: { toString: () => "bafycached" },
			encryptionKey: new Uint8Array(32),
			participants: [],
			selfKemCiphertext: new Uint8Array(8),
			selfEncryptedEncryptionKey: new Uint8Array(8),
			orgKemCiphertext: `0x${"cc".repeat(32)}`,
			orgEncryptedEncryptionKey: `0x${"dd".repeat(32)}`,
		} as never;

		const { sendFile } = await import("../../src/lib/send-file/send-file");

		await expect(
			sendFile(
				{} as never,
				{
					resume: { preparedPiece: cachedPiece, uploadCompleted: true },
					signers: [],
					viewers: [],
					documents: [],
					metadata: { name: "x" },
					placementManifest: { version: 1, documents: [] },
					viewerEmails: [],
					organizationId: "org-1",
				} as never,
			),
		).rejects.toThrow();

		expect(preparePieceCryptoMock).toHaveBeenCalledTimes(0);
	});
});
