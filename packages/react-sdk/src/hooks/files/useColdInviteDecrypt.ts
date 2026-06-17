import { encryption, unwrapColdInviteDek } from "@filosign/crypto-utils";
import { decodeFileData, documentsMerkleRootV1 } from "@filosign/shared";
import { useMutation } from "@tanstack/react-query";
import { type Hex, toBytes } from "viem";
import type { ViewFileResult } from "./useViewFile";

const FILE_ENCRYPTION_INFO = "ignore-encryption-info";

export type ColdInviteDecryptArgs = {
	wrappedEncryptionKey: Hex;
	/** Six-word hyphenated phrase from the sender (out-of-band). */
	phrase: string;
	downloadUrl: string;
};

export type ColdInviteDecryptResult = ViewFileResult & {
	encryptionKey: Uint8Array;
};

/**
 * Decrypts an envelope blob for a cold (email-only) recipient using the
 * Argon2id-wrapped DEK from `GET /files/invite/by-token/:token`.
 */
export function useColdInviteDecrypt() {
	return useMutation<ColdInviteDecryptResult, Error, ColdInviteDecryptArgs>({
		mutationFn: async (args) => {
			const encryptionKey = await unwrapColdInviteDek({
				wrappedEncryptionKey: toBytes(args.wrappedEncryptionKey),
				phrase: args.phrase,
			});

			const dl = await fetch(args.downloadUrl);
			if (!dl.ok) {
				throw new Error("Could not download encrypted document");
			}
			const encryptedBlob = new Uint8Array(await dl.arrayBuffer());
			const decrypted = await encryption.decrypt({
				ciphertext: encryptedBlob,
				secretKey: encryptionKey,
				info: FILE_ENCRYPTION_INFO,
			});
			const parsed = await decodeFileData(decrypted);
			const registerDocumentSha256 = await documentsMerkleRootV1({
				documents: parsed.documents.map((d) => ({
					id: d.id,
					bytes: d.bytes,
				})),
			});

			const primary = parsed.documents[0];
			if (!primary) {
				throw new Error("File data has no documents");
			}

			return {
				version: 1 as const,
				registerDocumentSha256,
				fileBytes: primary.bytes,
				documents: parsed.documents.map((d) => ({
					id: d.id,
					name: d.name,
					mimeType: d.mimeType,
					bytes: d.bytes,
				})),
				sender: parsed.sender as `0x${string}`,
				timestamp: parsed.timestamp,
				metadata: parsed.metadata,
				placementManifest: parsed.placementManifest,
				encryptionKey,
			};
		},
	});
}
