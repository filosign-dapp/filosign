import { encryption, KEM, toBytes } from "@filosign/crypto-utils";
import {
	decodeFileData,
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
			status: "s3" | "foc";
	  }
	| {
			variant: "org";
			pieceCid: string;
			organizationId: string;
			orgKemCiphertext: string;
			orgEncryptedEncryptionKey: string;
			status: "s3" | "foc";
	  };

export type ViewFileMetadata = {
	name: string;
	mimeType?: string;
};

export type ViewFileResult = {
	fileBytes: Uint8Array;
	sender: `0x${string}`;
	timestamp: number;
	metadata: ViewFileMetadata;
	placementManifest: PlacementManifest;
};

export function useViewFile() {
	const { contracts, wallet, runtime } = useFilosignContext();
	const { rpcQuery, isAuthed } = useFilosignRpc();

	return useMutation<ViewFileResult, Error, ViewFileArgs>({
		mutationFn: async (args) => {
			const { pieceCid } = args;

			if (!contracts || !wallet || !runtime || !isAuthed) {
				throw new Error("not connected");
			}

			let data: Uint8Array;

			try {
				const { presignedUrl } = await rpcQuery.files.piece.s3Url.call({
					pieceCid,
				});

				const downloadResponse = await fetch(presignedUrl, {
					method: "GET",
				});

				if (!downloadResponse.ok) {
					throw new Error("Failed to fetch file from S3");
				}

				data = new Uint8Array(await downloadResponse.arrayBuffer());
			} catch (s3Err) {
				const filecoinUrl = `https://${runtime.serverAddressSynapse}.calibration.filbeam.io/${pieceCid}`;

				const fileResponse = await fetch(filecoinUrl);

				if (!fileResponse.ok) {
					const errorText = await fileResponse.text();
					console.error("Filecoin error response:", errorText);
					throw new Error(
						`Failed to fetch file from S3 and Filecoin: ${fileResponse.status} - ${errorText}`,
					);
				}

				const arrayBuffer = await fileResponse.arrayBuffer();
				data = new Uint8Array(arrayBuffer);
				console.warn(
					"[useViewFile] S3 download failed, fell back to Filecoin",
					{
						pieceCid,
						error: s3Err instanceof Error ? s3Err.message : String(s3Err),
					},
				);
			}

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

			return {
				fileBytes: parsedData.bytes,
				sender: parsedData.sender,
				timestamp: parsedData.timestamp,
				metadata: parsedData.metadata,
				placementManifest: parsedData.placementManifest,
			};
		},
	});
}
