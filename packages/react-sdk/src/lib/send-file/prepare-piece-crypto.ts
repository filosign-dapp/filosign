import {
	encryption,
	KEM,
	randomBytes,
	toBytes,
	toHex,
} from "@filosign/crypto-utils";
import {
	documentsMerkleRootV1,
	encodeFileData,
	type PlacementManifest,
} from "@filosign/shared";
import type { Address, Hex } from "viem";
import { calculatePieceCid } from "../../utils/piece.ts";
import type {
	SendFileDeps,
	SendFileDocument,
	SendFileSigner,
	SendFileViewer,
} from "./types";

export type PreparedPieceCrypto = {
	timestamp: number;
	documentSha256: `0x${string}`;
	encryptedData: Uint8Array;
	pieceCid: ReturnType<typeof calculatePieceCid>;
	encryptionKey: Uint8Array;
	participants: {
		address: Address;
		kemCiphertext: Hex;
		encryptedEncryptionKey: Hex;
		isSigner: boolean;
	}[];
	selfKemCiphertext: Uint8Array;
	selfEncryptedEncryptionKey: Uint8Array;
	orgKemCiphertext?: Hex;
	orgEncryptedEncryptionKey?: Hex;
};

async function wrapEncryptionKeyForWallet(args: {
	encryptionKey: Uint8Array;
	pieceCid: ReturnType<typeof calculatePieceCid>;
	walletAddress: Address;
	encryptionPublicKey: Hex | string;
}): Promise<{ kemCiphertext: Hex; encryptedEncryptionKey: Hex }> {
	const { ciphertext: recipientKemCiphertext, sharedSecret: ssKEM } =
		await KEM.encapsulate({
			publicKeyOther: toBytes(args.encryptionPublicKey),
		});
	const recipientEncryptedEncryptionKey = await encryption.encrypt({
		message: args.encryptionKey,
		secretKey: ssKEM,
		info: `${args.pieceCid.toString()}:${args.walletAddress}`,
	});
	return {
		kemCiphertext: toHex(recipientKemCiphertext),
		encryptedEncryptionKey: toHex(recipientEncryptedEncryptionKey),
	};
}

async function wrapEncryptionKeyForOrg(args: {
	encryptionKey: Uint8Array;
	pieceCid: ReturnType<typeof calculatePieceCid>;
	organizationId: string;
	orgEncryptionPublicKey: Hex;
}): Promise<{ kemCiphertext: Hex; encryptedEncryptionKey: Hex }> {
	const { ciphertext, sharedSecret } = await KEM.encapsulate({
		publicKeyOther: toBytes(args.orgEncryptionPublicKey),
	});
	return {
		kemCiphertext: toHex(ciphertext),
		encryptedEncryptionKey: toHex(
			await encryption.encrypt({
				message: args.encryptionKey,
				secretKey: sharedSecret,
				info: `${args.pieceCid.toString()}:org:${args.organizationId}`,
			}),
		),
	};
}

export async function preparePieceCrypto(args: {
	deps: SendFileDeps;
	timestamp: number;
	documents: SendFileDocument[];
	metadata: { name: string };
	placementManifest: PlacementManifest;
	signers: SendFileSigner[];
	viewers: SendFileViewer[];
	organizationId?: string;
	orgEncryptionPublicKey?: Hex;
}): Promise<PreparedPieceCrypto> {
	const {
		deps,
		timestamp,
		documents,
		metadata,
		placementManifest,
		signers,
		viewers,
		organizationId,
		orgEncryptionPublicKey,
	} = args;

	const documentSha256 = await documentsMerkleRootV1({
		documents: documents.map((d) => ({
			id: d.id,
			bytes: d.bytes,
		})),
	});

	const data = await encodeFileData({
		documents,
		sender: deps.wallet.account.address,
		timestamp,
		metadata,
		placementManifest,
	});

	const encryptionKey = randomBytes(32);
	const encryptionInfo = "ignore-encryption-info";
	const encryptedData = await encryption.encrypt({
		message: data,
		secretKey: encryptionKey,
		info: encryptionInfo,
	});

	const pieceCid = calculatePieceCid(encryptedData);

	const viewedParticipants: Record<Address, boolean> = {};
	const participants: PreparedPieceCrypto["participants"] = [];

	const { ciphertext: selfKemCiphertext, sharedSecret: sKEM } =
		await KEM.encapsulate({
			publicKeyOther: toBytes(deps.user.encryptionPublicKey),
		});
	const selfEncryptedEncryptionKey = await encryption.encrypt({
		message: encryptionKey,
		secretKey: sKEM,
		info: `${pieceCid.toString()}:${deps.wallet.account.address}`,
	});
	viewedParticipants[deps.wallet.account.address] = true;

	let orgKemCiphertext: Hex | undefined;
	let orgEncryptedEncryptionKey: Hex | undefined;
	if (organizationId && orgEncryptionPublicKey) {
		const orgWrap = await wrapEncryptionKeyForOrg({
			encryptionKey,
			pieceCid,
			organizationId,
			orgEncryptionPublicKey,
		});
		orgKemCiphertext = orgWrap.kemCiphertext;
		orgEncryptedEncryptionKey = orgWrap.encryptedEncryptionKey;
	}

	for (const signer of signers) {
		if (viewedParticipants[signer.address]) continue;
		viewedParticipants[signer.address] = true;

		const wrapped = await wrapEncryptionKeyForWallet({
			encryptionKey,
			pieceCid,
			walletAddress: signer.address,
			encryptionPublicKey: signer.encryptionPublicKey,
		});
		participants.push({
			address: signer.address,
			kemCiphertext: wrapped.kemCiphertext,
			encryptedEncryptionKey: wrapped.encryptedEncryptionKey,
			isSigner: true,
		});
	}

	for (const viewer of viewers) {
		if (viewedParticipants[viewer.address]) {
			throw new Error(`Duplicate viewer address ${viewer.address}`);
		}
		viewedParticipants[viewer.address] = true;

		const wrapped = await wrapEncryptionKeyForWallet({
			encryptionKey,
			pieceCid,
			walletAddress: viewer.address,
			encryptionPublicKey: viewer.encryptionPublicKey,
		});
		participants.push({
			address: viewer.address,
			kemCiphertext: wrapped.kemCiphertext,
			encryptedEncryptionKey: wrapped.encryptedEncryptionKey,
			isSigner: false,
		});
	}

	return {
		timestamp,
		documentSha256,
		encryptedData,
		pieceCid,
		encryptionKey,
		participants,
		selfKemCiphertext,
		selfEncryptedEncryptionKey,
		orgKemCiphertext,
		orgEncryptedEncryptionKey,
	};
}
