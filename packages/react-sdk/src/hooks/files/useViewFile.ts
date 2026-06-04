import { encryption, KEM, toBytes } from "@filosign/crypto-utils";
import {
	decodeFileData,
	documentsMerkleRootV1,
	ORG_OMK_WRAP_INFO,
	type PlacementManifest,
} from "@filosign/shared";
import { useMutation } from "@tanstack/react-query";
import { useFilosignContext } from "../../context/useFilosignContext";
import { useFilosignRpc } from "../../lib/use-filosign-rpc";
import { getSessionSeed } from "../auth/session-seed";

export type ViewFileArgs =
	| {
			variant?: "participant";
			pieceCid: string;
			kemCiphertext: string;
			encryptedEncryptionKey: string;
	  }
	| {
			variant: "org";
			pieceCid: string;
			organizationId: string;
			orgKemCiphertext: string;
			orgEncryptedEncryptionKey: string;
	  };

export type ViewFileMetadata = {
	name: string;
	mimeType?: string;
};

export type ViewFileDocument = {
	id: string;
	name: string;
	mimeType: string;
	bytes: Uint8Array;
};

export type ViewFileResult = {
	version: 1;
	/** Merkle root of per-document SHA-256 leaves (matches on-chain documentSha256). */
	registerDocumentSha256: `0x${string}`;
	/** First signable document bytes (preview convenience). */
	fileBytes: Uint8Array;
	documents: ViewFileDocument[];
	sender: `0x${string}`;
	timestamp: number;
	metadata: ViewFileMetadata;
	placementManifest: PlacementManifest;
};

export function useViewFile() {
	const { contracts, wallet } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation<ViewFileResult, Error, ViewFileArgs>({
		mutationFn: async (args) => {
			const { pieceCid } = args;

			if (!contracts || !wallet || !isAuthed) {
				throw new Error("not connected");
			}

			const { presignedUrl } = await rpcQuery.files.piece.downloadUrl.call({
				pieceCid,
			});

			const downloadResponse = await fetch(presignedUrl, {
				method: "GET",
			});

			if (!downloadResponse.ok) {
				throw new Error(`Failed to fetch file (${downloadResponse.status})`);
			}

			const data = new Uint8Array(await downloadResponse.arrayBuffer());

			const keySeed = getSessionSeed(wallet.account.address);
			if (!keySeed) {
				throw new Error("No unlocked key seed found");
			}

			const { privateKey: userKemPrivate } = await KEM.keyGen({
				seed: new Uint8Array(Array.from(keySeed)),
			});

			let encryptionKey: Uint8Array;

			const isOrgVariant = args.variant === "org";
			if (isOrgVariant) {
				const myWrap = await rpcQuery.orgs.keys.wrapForMine.call({
					organizationId: args.organizationId,
				});
				const { sharedSecret: ssSelf } = await KEM.decapsulate({
					ciphertext: toBytes(myWrap.wrapKemCiphertext),
					privateKeySelf: userKemPrivate,
				});
				const omkSeed = await encryption.decrypt({
					ciphertext: toBytes(myWrap.wrappedOmk),
					secretKey: ssSelf,
					info: ORG_OMK_WRAP_INFO,
				});

				const { privateKey: omkPrivate } = await KEM.keyGen({
					seed: omkSeed,
				});

				const { sharedSecret: ssOrg } = await KEM.decapsulate({
					ciphertext: toBytes(args.orgKemCiphertext),
					privateKeySelf: omkPrivate,
				});

				encryptionKey = await encryption.decrypt({
					ciphertext: toBytes(args.orgEncryptedEncryptionKey),
					secretKey: ssOrg,
					info: `${pieceCid}:org:${args.organizationId}`,
				});
			} else {
				const { kemCiphertext, encryptedEncryptionKey } = args;
				const { sharedSecret: ssE } = await KEM.decapsulate({
					ciphertext: toBytes(kemCiphertext),
					privateKeySelf: userKemPrivate,
				});
				try {
					encryptionKey = await encryption.decrypt({
						ciphertext: toBytes(encryptedEncryptionKey),
						secretKey: ssE,
						info: `${pieceCid}:${wallet.account.address}`,
					});
				} catch (e) {
					console.error("Decryption error: ", e);
					throw e;
				}
			}

			const encryptionInfo = "ignore-encryption-info";

			const decryptedData = await encryption.decrypt({
				ciphertext: data,
				secretKey: encryptionKey,
				info: encryptionInfo,
			});

			const parsedData = await decodeFileData(decryptedData);
			const registerDocumentSha256 = await documentsMerkleRootV1({
				documents: parsedData.documents.map((d) => ({
					id: d.id,
					bytes: d.bytes,
				})),
			});

			const primary = parsedData.documents[0];
			if (!primary) {
				throw new Error("File data has no documents");
			}

			return {
				version: 1 as const,
				registerDocumentSha256,
				fileBytes: primary.bytes,
				documents: parsedData.documents.map((d) => ({
					id: d.id,
					name: d.name,
					mimeType: d.mimeType,
					bytes: d.bytes,
				})),
				sender: parsedData.sender,
				timestamp: parsedData.timestamp,
				metadata: parsedData.metadata,
				placementManifest: parsedData.placementManifest,
			};
		},
	});
}
